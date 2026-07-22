# Roadside Contact Form Integration Design

**Date:** 2026-07-21  
**Status:** Approved for specification; implementation pending final spec review  
**Sites:** `strandednomoreroadside.com` and `missednomorepro.com`

## Objective

Extend the existing Stranded No More roadside-assistance contact form so that every valid submission continues to send the current dispatch email and also:

1. creates or updates the customer in the correct Missed No More tenant;
2. creates a new pipeline lead;
3. records the request in the Missed No More inbox and customer history;
4. sends an internal lead alert from the tenant's business number to configured staff recipients; and
5. sends the customer an immediate transactional confirmation text.

The integration must preserve the live form's markup, styling, validation, nonce, honeypot, consent language, email behavior, and success/error experience.

## Existing Behavior

The live WordPress site uses the custom plugin `snm-service-request-form`. It handles the form as a same-page POST, validates a WordPress nonce and honeypot, requires name, phone, service, location, and SMS consent, then emails `Dispatch@strandednomoreroadside.com` through `wp_mail`.

The form currently captures:

- name;
- phone number;
- optional email;
- service needed;
- vehicle location;
- optional vehicle description;
- optional additional details; and
- explicit SMS consent.

Missed No More already provides tenant-scoped contacts, leads, SMS conversations, staff-notification recipients, outbound SMS compliance checks, Twilio sender resolution, encrypted message storage, and customer SMS suppression handling. Those existing paths will be reused rather than replaced.

## Chosen Architecture

The WordPress plugin will make a server-to-server HTTPS request to a new Missed No More form-ingestion endpoint after a valid submission. The request will use a private, tenant-specific integration credential stored only on the WordPress server.

The endpoint will resolve the tenant and business from that credential. It will not accept an organization or tenant identifier from WordPress. This keeps tenant ownership authoritative inside Missed No More and prevents a caller from selecting another tenant.

The endpoint will orchestrate existing application capabilities through a new, narrow ingestion service. Existing SMS transports, compliance gates, inbox persistence helpers, and staff-alert functions will remain unchanged.

### Why this approach

- Structured form fields arrive without parsing email text.
- Delivery is immediate and can be retried.
- Tenant routing is secure and reusable for future customers.
- The existing email remains an independent fallback.
- There is no Zapier, Make, or other recurring integration cost.

Email parsing was rejected because it is brittle, slower, and difficult to deduplicate. Third-party automation was rejected because it adds cost, another operational dependency, and additional customer-data exposure.

## Request Contract

WordPress will generate a unique submission ID with `wp_generate_uuid4()` for every accepted POST and send a JSON body similar to:

```json
{
  "submission_id": "uuid",
  "submitted_at": "ISO-8601 timestamp",
  "source": "strandednomoreroadside.com/contact",
  "name": "Customer name",
  "phone": "+14445551212",
  "email": "optional@example.com",
  "service": "Jump Start",
  "location": "Customer-provided location",
  "vehicle": "Customer-provided vehicle description",
  "details": "Optional additional details",
  "sms_consent": true
}
```

The credential will be sent in an authorization header, never rendered into the public form or browser JavaScript. The payload will be size-limited and all fields will be validated and normalized again by Missed No More.

## Authentication and Tenant Isolation

Each integration credential will be random, high entropy, unique, and associated with exactly one business. Missed No More will store only its SHA-256 digest. On receipt, the endpoint hashes the supplied credential and resolves the matching active integration record.

The resolved record supplies `tenant_id` and `business_id`. Payload fields cannot override either value. Every database read and write will include the resolved tenant, and business-specific staff and sender queries will include the resolved business when available.

Credentials can later be rotated without changing the endpoint contract. Invalid or inactive credentials receive a generic unauthorized response without disclosing tenant information.

## Idempotency and Retry Safety

A service-role-only ingestion-event table will claim `(tenant_id, submission_id)` before side effects begin. A unique constraint makes concurrent or repeated WordPress deliveries safe.

If the event was already completed, the endpoint returns success without creating another contact, lead, conversation message, staff alert, or customer confirmation. If an earlier attempt failed, retry behavior will use stored processing state so completed side effects are not repeated.

WordPress will attempt the webhook after the dispatch email. A short timeout prevents an app outage from holding the emergency form open. Network errors and non-success responses will be logged and scheduled for bounded WordPress Cron retries. The customer-facing form result continues to be based on the existing `wp_mail` result, ensuring that an app outage never hides an otherwise successful email submission.

## Data Processing

### Contact

Missed No More will normalize the submitted US phone number. Invalid phone numbers will be rejected before any messages are sent.

Within the resolved tenant, the service will find the contact by normalized phone number or create one. For an existing contact, it may fill missing name, email, or address values but will not replace non-empty customer data with blank or lower-quality values.

Because the live form requires explicit consent, the contact will be updated with:

- `consent_sms = true`;
- `consent_source = website_form`; and
- `consent_timestamp = submitted_at` or the server receipt time if the timestamp is invalid.

### Lead and customer history

Every unique service request creates a new lead with:

- `source = web`;
- `status = new_lead`;
- the resolved contact;
- `service_needed` from the selected service; and
- `urgency = high` for the live roadside request.

Location, vehicle description, email, and additional details will be stored in a request-specific customer note and included in the inbox message. Existing contact notes will not be overwritten.

### Inbox conversation

The form request will enter the existing SMS conversation for the normalized customer phone number. This keeps the original request, confirmation, later customer replies, AI handling, and staff replies in a single actionable thread.

The inbound form message will be persisted as a customer message with the submission ID as its external identifier. The fixed confirmation will be persisted as an outbound/system response only after the SMS send succeeds or with clear delivery status if it fails.

No AI-generated reply will run during form ingestion. Normal inbound replies sent later by the customer continue through the existing SMS webhook behavior.

## SMS Behavior

### Internal alert

The service will load staff contacts for the resolved tenant and business where `notify_on_lead = true`. It will call the existing `sendStaffSms` path for each configured recipient.

That existing path resolves the tenant's own SMS-enabled business number as the sender and logs the message. The alert will contain a concise summary: customer name, callback number, service, location, vehicle when present, and truncated details.

### Customer confirmation

After recording the form's explicit consent, the service will use the existing `sendCustomerSms` compliance path with `kind = confirmation` and consent required. The existing suppression list and carrier opt-out handling remain authoritative.

Initial copy:

> We received your roadside service request. Dispatch will contact you shortly. Reply here with updates or STOP to opt out.

The message will be sent from the business's own Missed No More number. It will not promise a specific arrival time.

## WordPress Changes

The custom form plugin will be updated without changing the current public form design or email construction. New code will:

- generate a submission ID;
- build the validated structured payload;
- make the authenticated server-side request;
- schedule bounded retries for temporary failures; and
- log integration failures without printing the credential or customer message contents.

The integration credential will remain server-side. The updated plugin will be built and reviewed locally before any live WordPress file is changed. A copy of the current live plugin will be retained as a rollback artifact.

## Missed No More Changes

Implementation is expected to add:

- a tenant-scoped form-integration credential record;
- a service-role-only ingestion-event/idempotency record;
- a new `POST /api/forms/service-request` route;
- a dedicated form-ingestion service that composes current contact, conversation, lead, staff SMS, and customer SMS capabilities; and
- focused automated tests.

Existing Twilio transport functions, SMS compliance functions, inbound SMS handling, WordPress email delivery, form assets, and working chat widget behavior will not be changed.

## Error Handling

- Validation or authentication errors return a non-retryable 4xx response.
- Temporary database or provider failures return a retryable 5xx response.
- The ingestion event records progress and a sanitized error category.
- Staff-alert failure does not roll back the saved contact, lead, or inbox request.
- Customer-confirmation failure does not remove the lead and remains visible through existing message delivery status.
- WordPress email success is never converted into a customer-facing failure solely because Missed No More is unavailable.
- Logs must not contain credentials, raw message bodies, precise locations, or full phone/email values.

## Verification

Automated coverage will verify:

- invalid and missing credentials are rejected;
- a credential cannot select or write another tenant;
- required fields and phone normalization;
- one contact and one lead per unique submission;
- retries do not duplicate leads or texts;
- consent is recorded before customer SMS;
- suppressed customers do not receive confirmation texts;
- staff recipients are scoped to the correct business;
- the business's number is used as sender; and
- the current WordPress email path remains unchanged.

After deployment of the Missed No More endpoint, a controlled live smoke test will submit the actual WordPress form. Before that final submission, explicit confirmation will be obtained because it will send real email and SMS messages. The test will verify the WordPress success state, dispatch email, pipeline card, contact record, inbox thread, staff alert, and customer confirmation.

## Rollout and Rollback

1. Apply database changes.
2. Deploy and verify the Missed No More endpoint with test requests.
3. Back up the live WordPress plugin.
4. Install the tenant-specific credential on WordPress.
5. Update the WordPress plugin.
6. Run the approved live smoke test.

Rollback is limited to restoring the prior WordPress plugin. The unused Missed No More endpoint and schema remain inert when WordPress stops sending events. The existing dispatch email continues throughout rollout and rollback.

## Success Criteria

A single valid contact-form submission must result in exactly one dispatch email, one customer/contact association, one new pipeline lead, one inbox request, one alert to each configured lead-notification recipient, and one compliant customer confirmation. Replaying the same submission must not create or send duplicates, and no request may cross tenant boundaries.
