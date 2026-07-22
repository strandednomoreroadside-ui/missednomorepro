# Roadside Contact Form Integration Implementation Plan

Approved design: `docs/superpowers/specs/2026-07-21-roadside-contact-form-integration-design.md`

## Goal

Connect the Stranded No More WordPress service-request form to Missed No More Pro so each direct form submission:

- keeps the existing dispatch email behavior in WordPress;
- creates or updates the customer contact in the correct tenant;
- creates a `web` lead in `new_lead` with high urgency;
- lands in the unified inbox as an SMS-channel customer thread;
- texts configured staff from the tenant business number;
- texts the customer an immediate confirmation from that same business number;
- stays idempotent and tenant-safe if WordPress retries.

## Current Constraints

- Do not change existing backend functions unless needed for the new form path.
- Do not change working public assets, PWA work, billing work, or current WordPress markup/CSS.
- Resolve tenant/business from a private server-side credential only. WordPress must not send tenant IDs as authority.
- Keep all live WordPress changes gated until the app endpoint and database are ready.

## Implementation Steps

1. Database migration

- Create `form_integrations` with `tenant_id`, `business_id`, `name`, `source`, `key_hash`, `active`, and audit timestamps.
- Create `form_ingestion_events` keyed by `(tenant_id, submission_id)` with processing status, related contact/lead/conversation/message IDs, SMS result flags, and sanitized error metadata.
- Enable RLS and grant service-role access; authenticated members may only read non-secret integration metadata if needed later.
- Add helpful tenant/status/time indexes.

2. App service

- Add `src/lib/forms/service-request.ts`.
- Validate payload with Zod and normalize phone/email fields.
- Hash the provided token with SHA-256 and resolve the active form integration.
- Claim an ingestion event before side effects, returning duplicate success for completed submissions.
- Upsert the contact by tenant + normalized phone, recording website SMS consent when the checkbox is true.
- Create a `web` lead in `new_lead` with `urgency = high`.
- Insert a structured customer note with service, location, vehicle, email, and details.
- Create or reuse the open SMS conversation for the customer phone, persist the form as a customer message with the submission ID as external id, and bump unread count.
- Notify `staff_contacts.notify_on_lead` scoped to the resolved business using `sendStaffSms`.
- Send the customer confirmation using `sendCustomerSms` with `kind = confirmation` and consent required.
- Mark each side effect on the event row so retries do not duplicate lead/SMS work.

3. Route

- Add `src/app/api/forms/service-request/route.ts`.
- Accept JSON only, require `x-mnm-form-token`, and keep error responses generic for auth failures.
- Apply conservative body validation and no browser CORS surface because WordPress calls server-to-server.
- Return `{ ok: true, duplicate?: true }` on successful first or duplicate processing.

4. Tests

- Add focused `node:test` coverage for validation, token hashing/resolution, duplicate submission handling, contact/lead/conversation writes, and staff/customer SMS routing.
- Mock Supabase and SMS functions locally so tests do not hit live Twilio or production data.
- Run `npm test` and `npm run typecheck`; run `npm run build` if typecheck passes and the local dirty worktree does not block it.

5. WordPress plugin preparation

- Build the updated `snm-service-request-form.php` locally, preserving existing shortcode, fields, nonce/honeypot, email, and redirect behavior.
- Add server-side webhook settings/constants for endpoint URL and private token.
- Generate a submission UUID per accepted form post and POST structured JSON with a short timeout.
- If the webhook fails, do not fail the already-successful email path; queue a bounded WP-Cron retry.
- Do not edit the live WordPress plugin until the app endpoint is deployed and the credential is provisioned.

6. Deployment and live smoke test

- Apply the migration and deploy the app endpoint.
- Provision one private form token for Stranded No More and store only its SHA-256 digest in the app database.
- Back up the live WordPress plugin before replacing it.
- Configure the plugin token server-side.
- Ask for explicit approval before submitting the live public form, because that sends a real dispatch email and real SMS messages.

## Verification Checklist

- Invalid or missing token returns 403 and writes no tenant data.
- Token for tenant A cannot write into tenant B.
- Duplicate `submission_id` returns success without duplicate lead or SMS.
- Staff alert texts come from the tenant business number via existing `sendStaffSms`.
- Customer confirmation respects consent and STOP suppression via existing `sendCustomerSms`.
- The form request appears in the customer contact timeline and unified inbox.
- No secrets or raw PII are logged.
