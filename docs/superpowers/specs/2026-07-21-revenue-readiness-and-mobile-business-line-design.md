# MissedNoMorePro Revenue Readiness and Mobile Business Line Design

**Status:** Proposed for owner approval  
**Date:** 2026-07-21  
**Primary profile:** Lean customer-facing SaaS startup / managed modular monolith

## 1. Context

MissedNoMorePro is a customer-facing, multi-tenant communications and operations product for small local-service businesses. The existing Next.js, Supabase, Twilio, Retell/OpenAI, Stripe, and Vercel system builds successfully and passes the current cross-tenant leak test. The immediate business goal is to begin acquiring paying customers without increasing fixed infrastructure cost or destabilizing working voice, SMS, billing, or AI behavior.

The current phone tools work, but they are buried in the administrative **Numbers** page. The authenticated dashboard also has no usable primary navigation on small screens and the site is not installable. The first mobile release will therefore be an installable progressive web app (PWA) with a dedicated, task-focused **Business Line** experience. A native Twilio Voice application remains a later phase after five paying customers or validated demand for direct background VoIP.

## 2. Approved constraints and success criteria

### Operating constraints

- One engineer today and one engineer at month 12.
- Daily production releases with per-pull-request previews.
- Customer-facing product.
- One-year capacity target: 2 RPS p50 and 20 RPS p99.
- Train the existing owner/developer on the existing stack; do not migrate stacks.
- Fixed cloud/SaaS ceiling: $50/month until five paying customers, then $100/month.
- Metered Twilio and AI usage must be covered by customer plan revenue.

### Definition of done

1. One hundred percent of required CI and tenant/RBAC tests pass, with zero successful unauthorized-access cases.
2. Mobile Lighthouse performance is at least 90 on the landing page, dashboard, and Business Line screen.
3. p95 server response is at most two seconds for initiating a call or sending a text, excluding carrier ringing and delivery.

## 3. Goals

- Make the product easy to navigate and operate from a phone immediately after sign-in.
- Put calling and texting within one tap of the primary mobile navigation.
- Let an owner/admin contact a customer without understanding number provisioning, Twilio, bridging, or telecom terminology.
- Preserve the existing business-number caller ID, SMS suppression, subscription, rate-limit, and audit safeguards.
- Keep existing desktop workflows available and recognizable.
- Correct validated tenant-role authorization gaps without rewriting working provider workflows.
- Clear behavior-preserving release blockers: missing favicon/PWA metadata, deprecated Next.js proxy convention, compatible dependency advisories, and missing automated release gates.
- Stop advertising multi-location operation as currently available until the product supports it safely.
- Produce a no-paid-media launch plan and OpenArt creative prompt package after the product release is verified.

## 4. Non-goals

- No microservices, Kubernetes, new paid observability platform, or new backend service.
- No rewrite of the voice handler, Retell flows, Twilio webhooks, booking, billing, or AI tool behavior.
- No replacement or redesign of working brand assets, typography, or the existing visual identity.
- No browser-based production VoIP. Mobile browsers do not provide dependable background call behavior.
- No native iOS/Android application before the five-customer milestone unless paying-customer evidence makes direct VoIP a launch blocker.
- No full multi-location implementation in this release.
- No unsupported promise that the PWA can receive calls in the background like a native phone app.

## 5. User and role model

### Launch users

- **Owner/admin:** Can use Business Line calling and texting, manage numbers, and change organization-wide settings.
- **Member:** Can use permitted operational pages but cannot provision numbers, change business-wide communication settings, change callback-IVR credentials, or use billable outbound tools at launch.
- **Platform admin:** Retains current platform access outside the tenant-facing mobile navigation.

Member access to outbound business calling/texting is a future explicit permission, not an accidental consequence of organization membership. This avoids exposing billable communications before the product has a dedicated permission and usage-control model.

## 6. Information architecture

### Desktop

- Keep the existing sidebar and routes.
- Add **Business Line** as a high-priority item near Calls and Messages.
- Keep **Numbers** as an administrative destination for provisioning, activation, forwarding, and release.

### Mobile

Use a persistent bottom navigation with five labeled Lucide icons and safe-area padding:

1. **Home** — `/dashboard`
2. **Inbox** — `/dashboard/inbox`
3. **Phone** — `/dashboard/phone`
4. **Contacts** — `/dashboard/contacts`
5. **More** — accessible sheet containing all other dashboard destinations, organization switching, settings, billing, and sign out

The current destination is visibly selected. Every target is at least 44 by 44 CSS pixels, has a text label, supports keyboard focus, and does not rely on color alone. Page content receives bottom padding so the navigation never covers controls or the legal footer.

### Mobile page structure

```text
┌─────────────────────────────────┐
│ Business Line       Status: On  │
│ (440) 555-0123                  │
├─────────────────────────────────┤
│       [ Call ]   [ Text ]       │
│                                 │
│ Customer name or phone number   │
│ [ Search contacts / enter #   ] │
│                                 │
│ [ Primary task controls       ] │
│ [ Call customer / Send text   ] │
│                                 │
│ Recent conversations            │
│ Customer · last action · time   │
├─────────────────────────────────┤
│ Home  Inbox  Phone Contacts More│
└─────────────────────────────────┘
```

## 7. Business Line experience

### Shared behavior

- Route: `/dashboard/phone`.
- Page heading: **Business Line**, not **Numbers** or **Twilio**.
- Show the formatted outbound business number and plain-language readiness: **Ready**, **Calls unavailable**, or **Texts pending registration**.
- For launch, the active outbound line is the same first enabled tenant line used by the existing backend. Do not display a non-functional selector. Explicit multiple-line selection is deferred until outbound service APIs can accept and audit a selected tenant-owned line without changing existing behavior.
- If no usable number exists, show one clear owner/admin action: **Set up a business number** linking to `/dashboard/numbers`.
- Use a two-option segmented control for **Call** and **Text**. Preserve the selected mode during the session.
- Recipient entry accepts a US phone number and can select an existing contact. Use `type="tel"`, `inputMode="tel"`, visible labels, autofill-friendly fields, and validation after blur or submit.
- The most recent communications appear beneath the composer with one-tap **Call** and **Text** actions.
- Do not show provisioning, A2P, webhook, callback-IVR, or carrier terminology on this page.

### Call mode

- Primary input: **Who do you want to call?**
- Prefill the owner/admin's ring phone using the same staff-contact source used today.
- Put the ring phone under a collapsed **Your callback phone** disclosure. Most customers should never need to edit it after initial setup.
- Primary button: **Call customer**.
- Helper copy before action: **Your phone will ring first. Answer it and we’ll connect the customer using your business number.**
- During the request, disable duplicate submission and show **Starting call…**.
- Success state: **Your phone is ringing. Answer to connect with [customer/number]. They’ll see [business number].**
- Failure states state the cause and a recovery action. Examples: add a callback phone, finish number setup, fix billing, wait for cooldown, or retry.

### Text mode

- Primary inputs: recipient and message.
- Primary button: **Send text**.
- Display the active business number near the action: **Sending from (440) 555-0123**.
- Keep the existing 1,000-character limit and SMS suppression/STOP behavior.
- Announce success and errors through a polite live region without moving keyboard focus unexpectedly.
- After success, clear the message but retain the recipient so the user can send a follow-up.

### Install experience

- Provide an unobtrusive **Install app** action in the More sheet and on the Business Line empty/onboarding state.
- On supported Chromium browsers, use the captured install prompt only after a user gesture.
- On iOS, show a short platform-specific guide: **Share → Add to Home Screen**.
- Never block core functionality behind installation.

## 8. PWA behavior

- Add `src/app/manifest.ts` with the existing product name, brand colors, standalone display, and `/dashboard/phone` start URL.
- Add new favicon and maskable 192/512 application icons derived from the current logo mark without replacing an existing asset.
- Register a minimal service worker over HTTPS.
- Cache only versioned static application assets and a small offline shell. Never cache authenticated HTML, tenant API responses, calls, messages, recordings, tokens, or billing data.
- When offline, show a clear read-only offline state. Disable call/text submission and provide **Try again**.
- Detect updates and apply them on the next navigation or explicit refresh; do not interrupt an active form.

## 9. Application architecture and data flow

The existing Next.js modular monolith remains the deployment unit.

### Proposed components

- `src/app/dashboard/phone/page.tsx` — server page; loads active tenant, role, entitlements, enabled line summary, callback-phone default, and recent communication summary.
- `src/app/dashboard/phone/business-line.tsx` — client interaction shell for call/text mode, recipient selection, action feedback, and optimistic UI boundaries.
- `src/components/dashboard/mobile-navigation.tsx` — persistent mobile navigation and More sheet.
- `src/components/pwa/install-app.tsx` — install prompt and iOS guidance.
- `src/app/manifest.ts` and `public/sw.js` — install metadata and conservative static-only service worker.
- Existing `src/app/dashboard/numbers/actions.ts` call and text actions remain the launch execution path.

### Call flow

```text
Owner/admin taps Call customer
  → client validates recipient and callback number
  → existing startOutboundCall action revalidates auth, subscription, numbers, cap, and cooldown
  → Twilio rings the owner/admin
  → existing bridge connects the customer with business caller ID
  → UI reports initiation success/failure
  → existing audit record remains authoritative
```

### Text flow

```text
Owner/admin taps Send text
  → client validates recipient and message
  → existing sendManualText action revalidates auth, subscription, cap, and content
  → existing sendCustomerSms compliance chokepoint enforces suppression/STOP
  → Twilio sends from the tenant's current enabled line
  → existing encrypted/redacted message log remains authoritative
  → UI reports success/failure
```

No client component receives Twilio credentials, service-role credentials, callback-IVR PINs, or provider secrets.

## 10. Multi-tenant and role hardening

Add a forward-only Supabase migration and same-tenant role tests. Do not edit historical migrations.

- Preserve tenant-scoped reads needed by operational pages.
- Preserve intended member access to staff contacts and day-to-day SMS controls.
- Restrict callback-IVR enablement, PIN changes, and server-managed routing-token changes to owner/admin/service paths.
- Restrict membership-plan and customer-membership mutations to the roles already enforced by the server actions.
- Keep staff-contact management available to members because the existing setup and staff workflows intentionally support it.
- Reuse the existing `app.has_role(...)` policy pattern used by invitations.
- Continue denying all cross-tenant reads and writes.
- Add an integration matrix covering owner, admin, member, outsider, and anonymous access for sensitive tables.

Recordings and transcripts remain under their current member-readable behavior in this release because changing that product permission requires a separate assignment/role design. The gap must remain documented and may not be described as role-restricted in marketing material.

## 11. Narrow security and reliability corrections

These corrections preserve successful behavior but introduce validation or redaction on unsafe inputs:

- Parse recording URLs and allow Twilio Basic Authentication only for an exact approved HTTPS Twilio hostname. Never use substring hostname matching.
- Remove or redact sensitive query parameters, including internal callback keys, from Sentry event URLs.
- Stop logging unknown inbound-email routing tokens verbatim.
- Keep provider request signing and idempotency behavior unchanged.
- Rename `src/middleware.ts` to the supported Next.js `src/proxy.ts` convention and rename only the exported function; preserve matcher and logic.
- Add the missing favicon and application metadata.
- Apply compatible patch-level dependency updates/overrides only; no major framework/library upgrade. Re-run typecheck, build, audit, and smoke tests after each dependency group.
- Do not refactor the large working voice-tool handler as part of this release.

The recording-host validation and telemetry redaction are the only planned edits inside existing server request paths. They are security guards, not provider-workflow changes. They require explicit approval with this specification because the original request otherwise prohibits backend-function changes.

## 12. Product truth and monetization readiness

- Remove **Multiple locations & numbers** and similar at-scale language from currently available plan promises, or label it **Coming later**. Multi-number entitlement can remain where it works; multi-location operation cannot be sold as complete.
- Keep the positioning focused on an operator-built front office for local-service businesses: calls answered, deterministic approved quotes, booking, follow-up, dispatch, payments, and revenue visibility.
- Do not manufacture testimonials, call volume, savings, customer counts, or performance claims.
- Use the first real paying customers to create an approved case study with measurable missed-call recovery and booked-job outcomes.

## 13. Error handling and recovery

- Every async primary action has idle, pending, success, and failure states.
- Pending actions disable duplicate submission and retain user input.
- Errors appear next to the affected control and state how to recover.
- Network timeouts offer **Try again** and do not falsely claim that a call/text failed if provider acceptance is unknown.
- Offline mode disables billable actions before submission.
- A payment failure links directly to Billing.
- A missing callback phone links to the relevant staff/settings destination.
- A missing or disabled business number links to Numbers.
- User-visible errors contain no provider secrets, raw exception strings, or tenant identifiers.

## 14. Accessibility and usability requirements

- Mobile-first layouts tested at 375px, 390px, tablet portrait, and landscape.
- No horizontal scrolling at supported widths.
- All touch targets are at least 44 by 44 CSS pixels with at least 8px separation.
- Base input text is at least 16px to prevent iOS form zoom.
- Body text meets 4.5:1 contrast; large text and meaningful UI graphics meet 3:1.
- Visible focus rings and logical keyboard order are preserved.
- Icon-only controls have accessible names; navigation always uses icon plus label.
- Status is communicated with text/icon in addition to color.
- Loading and result messages use appropriate live regions.
- Animations are limited to 150–300ms state transitions and respect `prefers-reduced-motion`.
- Fixed navigation respects device safe areas and never covers content.
- Common calling/texting tasks require no more than: open Phone, select/enter recipient, tap the primary action.

## 15. Verification strategy

### Automated gates

- `npm run typecheck`
- production `npm run build`
- focused unit tests for phone normalization, recording-host validation, URL/query redaction, and PWA cache allowlisting
- live cross-tenant leak test
- new same-tenant owner/admin/member access matrix
- dependency audit with no unresolved high/critical production advisory unless documented as unreachable and owner-approved

### Browser and device verification

- Anonymous landing-page smoke test.
- Owner/admin sign-in, mobile navigation, organization switching, and sign-out.
- Install metadata and service-worker registration over HTTPS.
- Call and text forms at 375×667 and 390×844.
- Valid, invalid, pending, cooldown, billing failure, suppression/STOP, provider failure, and offline states.
- Keyboard-only navigation and screen-reader labels.
- Reduced-motion behavior.
- Lighthouse mobile performance target of at least 90 on the three approved surfaces.
- Twenty-run call/text initiation timing sample with p95 at or below two seconds, excluding provider completion.

### Provider safety

- Production provider calls are not used for automated destructive verification without an explicit test tenant/number.
- Existing live phone numbers, recordings, subscriptions, and working assets are never deleted or replaced during testing.

## 16. Delivery sequence

1. Add release tests and tenant-role policy migration.
2. Apply narrow security guards and behavior-preserving maintenance.
3. Add mobile navigation and Business Line page using existing actions.
4. Add manifest, icons, service worker, offline/install states, and favicon.
5. Correct product promises that exceed current multi-location capability.
6. Run full verification and production-sized mobile smoke tests.
7. Draft product-marketing context for owner correction.
8. Produce the approved 13-section free AARRR launch plan and OpenArt ad-creative prompts.
9. Revisit native React Native/Twilio Voice after five paying customers or earlier validated rejection of the ring-and-bridge flow.

## 17. Rollback and operational safety

- Keep each delivery group in a separate reviewable commit.
- Database policy changes are forward-only and accompanied by a reversal migration draft before deployment.
- Mobile navigation and Business Line are additive; the existing Numbers page remains available as fallback.
- Service-worker cache names are versioned so a rollback cannot keep serving removed assets indefinitely.
- Dependency updates are grouped and reverted independently if verification regresses.
- Do not deploy a policy migration until both current cross-tenant and new same-tenant tests pass against a non-production environment.

## 18. Native phase trigger

Start a separate native design only when at least one condition is met:

- Five paying customers have been reached and fixed costs can rise to the approved $100/month ceiling.
- At least three qualified prospects or two paying customers explicitly reject ring-and-bridge calling after using the PWA.
- Background incoming/outgoing VoIP becomes necessary for a signed customer requirement.

The native phase will use the Twilio React Native Voice SDK, short-lived server-issued access tokens, platform push credentials, and native call UI. It will not reuse browser VoIP as a shortcut.
