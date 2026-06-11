# Missed No More Pro OS — V3 Master Build Plan

**Product:** Missed No More Pro OS  
**Version:** V3 Master Build Plan  
**Purpose:** Codex / Claude Code execution file  
**Positioning:** AI Receptionist + Field Service Business Operating System for local service businesses.

---

## 0. Executive Build Directive

Build **Missed No More Pro OS** as a multi-tenant SaaS platform that starts as an AI receptionist and expands into a field-service operating system.

This is not just an answering bot.

The platform should manage the operational flow from:

```text
Phone rings
  → AI answers
  → Lead/customer is identified
  → Service need is captured
  → Quote/estimate is generated
  → Appointment is booked
  → Deposit is collected
  → Job is created
  → Technician/staff is notified
  → Job is dispatched
  → Job is completed
  → Invoice is generated
  → Payment is collected
  → Review request is sent
  → Month-end reporting/payroll summaries are produced
```

The platform must be built in phases so the MVP can launch quickly, generate revenue, and then expand into the full OS.

---

## 1. Product Vision

### 1.1 Core Idea

**Missed No More Pro OS** is an AI-powered operating system for local service businesses.

It begins as a front-desk automation platform:

- Answers calls 24/7
- Captures leads
- Qualifies callers
- Books appointments
- Sends SMS follow-ups
- Collects deposits
- Produces call summaries
- Proves recovered revenue

It then expands into an optional field-service system:

- CRM
- Scheduling
- Estimates
- Dispatch
- Payments
- Invoicing
- Review automation
- Marketing follow-up
- Month-end reporting
- Payroll/commission summaries

### 1.2 Strategic Positioning

Do **not** position this as a cheap AI answering service.

Position it as:

> **The AI front office and business operating system for local service companies.**

The core promise:

> **Never miss another call, customer, job, payment, invoice, or follow-up.**

### 1.3 Target Customer

Primary market:

- 1–15 employee local service businesses
- Owner-operated businesses
- Small teams that cannot afford or do not need ServiceTitan-level complexity
- Businesses losing money from missed calls, slow follow-up, no CRM, poor scheduling, or weak payment processes

Primary niches:

- Roadside assistance
- Towing
- HVAC
- Plumbing
- Electricians
- Roofing
- Garage door repair
- Pest control
- Landscaping
- Cleaning
- Locksmiths
- Mobile mechanics
- Appliance repair
- Handyman services

---

## 2. High-Level Product Architecture

```text
Customer Phone Call / Web Chat / SMS
        │
        ▼
AI Receptionist Layer
        │
        ├── Caller Identification
        ├── Spam Detection
        ├── Lead Qualification
        ├── Knowledge Base Lookup
        ├── Service Area Check
        ├── Pricing Engine
        ├── Calendar Booking
        ├── Deposit Link Creation
        ├── Staff Notification
        └── Escalation / Transfer
        │
        ▼
Business OS Layer
        │
        ├── CRM
        ├── Jobs
        ├── Estimates
        ├── Scheduling
        ├── Dispatch
        ├── Payments
        ├── Invoices
        ├── Reviews
        ├── Campaigns
        └── Reporting
        │
        ▼
Month-End Closeout
        │
        ├── Revenue Summary
        ├── Paid / Unpaid Invoices
        ├── Deposits Collected
        ├── Technician Totals
        ├── Commission Summary
        ├── Payroll Export
        └── Accounting Export Placeholder
```

---

## 3. Technology Stack

### 3.1 Required Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Hosting | Vercel |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| Tenant Isolation | Supabase RLS + tenant_id everywhere |
| Storage | Supabase Storage |
| Vector Search | pgvector in Supabase |
| Voice | Twilio Voice |
| SMS | Twilio Messaging |
| AI Voice | OpenAI Realtime |
| AI Fallback Abstraction | Retell / Vapi / Bland adapter-ready |
| Payments | Stripe Checkout + Billing + Customer Portal |
| Background Jobs | Trigger.dev |
| Email | Resend or Postmark |
| Monitoring | Sentry |
| Analytics | PostHog optional |
| Maps/Distance | Google Maps Geocoding + Routes API |

### 3.2 Hosting Decision

Use:

- **Vercel Pro** for the main app and API routes
- **Supabase Pro** for database/auth/storage/RLS

Do not build the full SaaS on Cloudflare Free. Cloudflare Pages may be used later for static marketing assets, but the production app should use Vercel + Supabase.

---

## 4. Brand Direction

### 4.1 Brand Personality

- Premium
- Modern
- Trustworthy
- Revenue-focused
- Sharp SaaS dashboard feel
- Built for business owners, not developers

### 4.2 UI Direction

- Dark-first dashboard
- Deep navy / midnight backgrounds
- Electric cyan and blue accents
- White primary text
- Muted steel secondary text
- Glow effects only for CTAs and active states
- Revenue-oriented dashboard language

### 4.3 Recommended Color Tokens

```ts
colors: {
  deepNight: "#000014",
  midnight: "#020821",
  signalBlue: "#0088F8",
  royalBlue: "#0048F8",
  electricCyan: "#00E8F8",
  softCyan: "#00B8F8",
  textPrimary: "#F8F8F8",
  textMuted: "#A7B0C0",
  alert: "#FFB020",
  danger: "#FF4D5E",
  success: "#21D07A"
}
```

---

## 5. Core Product Modules

## 5.1 AI Receptionist Module

Purpose:

The AI receptionist is the front door of the business.

Capabilities:

- Answer inbound calls
- Identify business name
- Identify itself as virtual receptionist where appropriate
- Detect spam/vendor calls
- Identify new vs existing customers
- Pull customer history
- Ask one question at a time
- Capture required intake fields
- Classify service need
- Determine urgency
- Check service area
- Use pricing engine for quotes
- Book appointments
- Send SMS confirmations
- Send staff notifications
- Escalate when confidence is low
- Transfer calls based on rules
- Generate call summary
- Store transcript
- Log usage

Hard rules:

- AI must never claim to be human
- AI must never invent prices
- AI must never collect card details by phone
- AI must never book outside approved availability
- AI must never continue texting opted-out contacts
- AI must escalate when required facts are missing

---

## 5.2 CRM Module

Purpose:

Give businesses a simple customer system without forcing them into expensive software.

Capabilities:

- Contacts
- Leads
- Customer notes
- Tags
- Call history
- SMS history
- Email history later
- Job history
- Estimate history
- Invoice/payment history
- Properties, vehicles, or equipment records depending on niche
- Search/filter
- Timeline view

Required objects:

- Contact
- Lead
- Customer note
- Timeline event
- Property/vehicle/equipment optional child records

---

## 5.3 Scheduling Module

Purpose:

Let the AI or staff book jobs correctly.

Capabilities:

- Google Calendar integration
- Calendly integration later
- Staff availability
- Appointment types
- Job duration rules
- Same-day rules
- Buffer times
- Drive-time buffer later
- Reschedule/cancel requests
- Manual approval mode
- Auto-book mode

Rules:

- AI can only book inside approved windows
- Emergency jobs may follow separate rules
- Double booking blocked unless explicitly allowed

---

## 5.4 Estimates / Pricing Module

Purpose:

Generate accurate quotes from approved business rules.

Capabilities:

- Service list
- Base fees
- Service call fees
- Zone pricing
- Mileage pricing
- Time surcharges
- Emergency surcharges
- Material/pass-through costs
- Minimum job price
- Deposit rules
- Human approval thresholds
- Estimate templates
- Customer approval links later

Critical rule:

> The AI cannot quote unless the pricing tool returns a valid pricing result.

---

## 5.5 Payments / Deposits Module

Purpose:

Turn calls into paid intent.

Capabilities:

- Stripe Checkout deposit links
- Stripe payment links
- Deposit required toggle
- Payment timeline
- Receipt SMS
- Failed payment follow-up
- Job status updates after payment

Rules:

- AI never collects card data verbally
- Stripe webhook is source of truth
- Payment must be tied to contact/job/invoice

---

## 5.6 Dispatch Module

Purpose:

Move jobs from booked to completed.

Capabilities:

- Dispatch board
- Job status pipeline
- Technician assignment
- Internal notes
- Customer status updates
- ETA fields
- Job checklist later
- Photo uploads later

Recommended status pipeline:

```text
New Lead
Estimate Needed
Estimate Sent
Scheduled
Assigned
En Route
Arrived
In Progress
Completed
Needs Invoice
Invoice Sent
Paid
Review Requested
Closed
Canceled
```

---

## 5.7 Invoicing Module

Purpose:

Generate and collect final balances.

Capabilities:

- Invoice creation
- Line items
- Deposit credit
- Balance due
- PDF invoice
- SMS/email payment link
- Paid/unpaid tracking
- Reminder automation
- Refund/adjustment records later

---

## 5.8 Reviews / Marketing Module

Purpose:

Create compounding growth from completed jobs and lost leads.

Capabilities:

- Review request automation
- Lost lead follow-up
- Estimate follow-up
- Seasonal reminders
- Reactivation campaigns
- Repeat-service reminders
- Customer win-back campaigns

Rules:

- Only message customers with proper consent
- STOP/HELP must be honored
- Campaign messaging must follow SMS compliance rules

---

## 5.9 Reporting / Month-End Module

Purpose:

Give owners a business closeout view.

Capabilities:

- Monthly revenue summary
- Paid invoices
- Unpaid invoices
- Deposits collected
- Refunds/adjustments later
- Job count
- Average ticket
- Lead-to-job conversion
- Missed calls recovered
- AI-booked jobs
- Technician job totals
- Commission summary
- Payroll summary report
- CSV export
- QuickBooks/Xero export placeholder

Important:

Payroll should start as **report-only**, not actual payroll processing.

---

## 5.10 AI Command Center

Long-term killer feature.

The owner should eventually be able to type or say:

```text
Book Sarah for Tuesday afternoon, send her a $75 deposit link, assign Mike, and remind her tomorrow.
```

The system should:

- Find/create the contact
- Create/update job
- Check calendar
- Book appointment
- Assign technician
- Create payment link
- Send SMS
- Log the action
- Update dashboard

All AI actions must go through permissioned tool calls.

---

## 6. Pricing Structure

## 6.1 AI Receptionist Base Plans

| Plan | Monthly | Annual Effective Monthly | Included Minutes | Simultaneous Calls | SMS | Users | Best For |
|---|---:|---:|---:|---:|---:|---:|---|
| Answer | $99 | $79.20 | 500 | 1 | 1,000 | 1 | Solo operators replacing voicemail |
| Book | $199 | $159.20 | 1,500 | 2 | 3,000 | 3 | Businesses that want appointment booking |
| Revenue | $349 | $279.20 | 3,000 | 4 | 7,500 | 10 | Businesses quoting, collecting deposits, and creating jobs |
| Scale | $599 | $479.20 | 6,000 | 8 | 15,000 | 25 | Higher-volume teams and multi-location operators |
| Agency | $899 + $89/location | $719.20 base | 10,000 pooled | 20 pooled | 30,000 | 100 | Agencies managing multiple clients |

Annual discount:

- 20% off base subscription
- Overage, phone numbers, SMS packs, extra locations, and one-time services are not discounted by default

---

## 6.2 OS Bundles

These bundles expand beyond the AI receptionist.

| Bundle | Monthly Price | Includes |
|---|---:|---|
| Front Desk | $99 | AI receptionist, missed-call recovery, call logs, basic CRM |
| Front Desk + CRM | $149 | Adds CRM timeline, notes, tags, customer history |
| Operations | $249 | Adds scheduling, estimates, job records |
| Revenue OS | $399 | Adds dispatch, deposits, invoicing, reviews |
| Business OS | $699 | Adds advanced reporting, payroll summaries, multi-tech workflows |
| Multi-Location OS | $999+ | Adds pooled usage, multiple locations, advanced permissions |

Recommendation:

Use the AI Receptionist plans at launch. Introduce OS bundles once CRM, dispatch, invoicing, and reporting are production-ready.

---

## 6.3 Add-Ons

| Add-On | Price |
|---|---:|
| Extra AI phone number | $10/mo + usage |
| Extra location | $59–$79/mo depending on plan |
| Extra 1,000 AI voice minutes | $120/mo |
| Extra 1,000 SMS | $15/mo |
| Extra web/text conversation pack | $25 per 250 |
| Concierge setup | $399 one-time |
| Advanced workflow setup | $499 one-time |
| Voice/personality tuning | $199 one-time |
| Custom integration | Custom |

---

## 7. Plan Limits and Feature Gates

Plan limits must be enforced in both database and application logic.

Required gates:

- Monthly AI voice minutes
- Simultaneous calls
- SMS allowance
- Web chat conversations
- Locations
- Team seats
- AI agents
- Active workflows
- Knowledge sources
- Transcript retention
- Recording access
- Calendar connections
- Pricing engine access
- Deposit/payment access
- Dispatch access
- Invoice access
- Review automation
- Reactivation campaigns
- Payroll summaries
- API/webhook access
- Provider failover
- Admin controls

No unlimited usage.

---

## 8. Database Model

Every tenant-owned table must include:

```sql
tenant_id uuid not null,
created_at timestamptz default now(),
updated_at timestamptz
```

## 8.1 Core SaaS Tables

```sql
organizations
- id
- name
- billing_customer_id
- plan
- status
- created_at
- updated_at

organization_members
- id
- organization_id
- user_id
- role
- created_at

businesses
- id
- organization_id
- tenant_id
- name
- industry
- phone
- website_url
- gbp_url
- address
- timezone
- status
- created_at
- updated_at

subscriptions
- id
- tenant_id
- stripe_customer_id
- stripe_subscription_id
- plan
- status
- current_period_start
- current_period_end
- overage_enabled
- created_at
- updated_at

plan_limits
- id
- plan
- monthly_minutes
- simultaneous_calls
- monthly_sms
- monthly_web_conversations
- max_users
- max_locations
- max_workflows
- max_knowledge_sources
- transcript_retention_days
- feature_flags_json

usage_events
- id
- tenant_id
- event_type
- quantity
- unit
- provider
- source_id
- billable
- created_at

audit_logs
- id
- tenant_id
- actor_user_id
- action
- entity_type
- entity_id
- metadata
- created_at
```

---

## 8.2 Voice / Messaging Tables

```sql
phone_numbers
- id
- tenant_id
- twilio_sid
- phone_number
- type
- forwarding_status
- a2p_status
- voice_enabled
- sms_enabled
- created_at
- updated_at

agents
- id
- tenant_id
- name
- voice_provider
- voice_id
- personality
- language_settings
- system_prompt_version
- status
- created_at
- updated_at

calls
- id
- tenant_id
- contact_id
- provider
- provider_call_id
- direction
- from_number
- to_number
- started_at
- ended_at
- duration_seconds
- status
- disposition
- recording_url
- transcript_status
- cost_estimate
- plan_minutes_used
- created_at

call_transcripts
- id
- tenant_id
- call_id
- redacted_text
- raw_text_encrypted
- summary
- sentiment
- action_items
- pii_redacted
- created_at

messages
- id
- tenant_id
- contact_id
- provider_message_id
- direction
- body_redacted
- body_encrypted
- status
- consent_checked
- created_at
```

---

## 8.3 CRM Tables

```sql
contacts
- id
- tenant_id
- name
- phone
- email
- address
- notes
- consent_sms
- consent_source
- consent_timestamp
- created_at
- updated_at

leads
- id
- tenant_id
- contact_id
- source
- status
- service_needed
- urgency
- estimated_value
- assigned_to
- created_at
- updated_at

customer_notes
- id
- tenant_id
- contact_id
- author_user_id
- note
- created_at

customer_timeline_events
- id
- tenant_id
- contact_id
- event_type
- source_id
- summary
- metadata
- created_at

customer_assets
- id
- tenant_id
- contact_id
- type
- label
- details_json
- created_at
- updated_at
```

---

## 8.4 Knowledge Base Tables

```sql
knowledge_sources
- id
- tenant_id
- source_type
- url
- file_path
- title
- status
- approved_by_user
- created_at
- updated_at

knowledge_chunks
- id
- tenant_id
- source_id
- content
- embedding
- metadata
- approved
- created_at
```

---

## 8.5 Services / Pricing Tables

```sql
services
- id
- tenant_id
- name
- description
- active
- created_at
- updated_at

pricing_rules
- id
- tenant_id
- service_id
- rule_type
- config_json
- requires_human_approval
- active
- created_at
- updated_at

service_areas
- id
- tenant_id
- type
- city
- state
- radius_miles
- polygon_geojson
- active
- created_at
- updated_at

quotes
- id
- tenant_id
- contact_id
- job_id
- service_id
- status
- subtotal
- fees
- deposit_required
- deposit_amount
- total
- explanation
- created_at
- updated_at

quote_line_items
- id
- tenant_id
- quote_id
- label
- amount
- quantity
- metadata
- created_at
```

---

## 8.6 Scheduling / Job Tables

```sql
appointments
- id
- tenant_id
- contact_id
- calendar_provider
- external_event_id
- start_time
- end_time
- status
- source_call_id
- created_at
- updated_at

jobs
- id
- tenant_id
- contact_id
- service_id
- appointment_id
- status
- address
- quote_amount
- deposit_required
- deposit_paid
- assigned_to
- created_at
- updated_at

job_status_events
- id
- tenant_id
- job_id
- from_status
- to_status
- actor_user_id
- note
- created_at

job_assignments
- id
- tenant_id
- job_id
- user_id
- role
- created_at
```

---

## 8.7 Payments / Invoicing Tables

```sql
payments
- id
- tenant_id
- contact_id
- job_id
- invoice_id
- stripe_payment_intent_id
- stripe_checkout_session_id
- amount
- status
- type
- created_at
- updated_at

invoices
- id
- tenant_id
- contact_id
- job_id
- status
- subtotal
- deposit_credit
- tax_amount
- total
- balance_due
- due_date
- pdf_url
- created_at
- updated_at

invoice_line_items
- id
- tenant_id
- invoice_id
- label
- description
- quantity
- unit_price
- total
- created_at
```

---

## 8.8 Reviews / Campaign Tables

```sql
review_requests
- id
- tenant_id
- contact_id
- job_id
- status
- platform
- message_id
- sent_at
- completed_at
- created_at

campaigns
- id
- tenant_id
- name
- type
- status
- config_json
- created_at
- updated_at

campaign_events
- id
- tenant_id
- campaign_id
- contact_id
- event_type
- status
- scheduled_at
- completed_at
- created_at
```

---

## 9. Security Requirements

Required:

- Supabase RLS enabled on every tenant-owned table
- tenant_id on every tenant-owned table
- No service-role key in client code
- Server-side membership validation before mutations
- Audit logs for sensitive actions
- Encrypted raw transcripts and message bodies
- Redacted dashboard display fields
- Role-based access for recordings/transcripts
- Stripe webhook signature validation
- Twilio webhook signature validation
- Idempotency for every webhook
- Usage events for every billable activity
- Environment validation at startup
- Sentry logging without secrets or raw PII

---

## 10. AI Tool Contracts

Every risky AI action must call a backend tool.

Required tools:

```text
lookup_contact
create_contact
update_contact
search_knowledge_base
check_service_area
calculate_quote
check_calendar_availability
book_appointment
create_job
create_payment_link
send_sms
notify_staff
transfer_call
escalate_to_human
mark_spam
create_invoice
request_review
create_follow_up_task
```

Rules:

- AI cannot quote without calculate_quote
- AI cannot book without check_calendar_availability
- AI cannot collect payment except through create_payment_link
- AI cannot send SMS unless consent rules pass
- AI cannot dispatch outside configured business rules

---

## 11. Phased Build Plan

# Phase 0 — Product Foundation

Deliverables:

- Final positioning
- Pricing structure
- Terms draft
- Privacy draft
- SMS Terms draft
- Acceptable Use draft
- Beta agreement
- Support policy
- Refund policy

Do not block engineering on final legal review, but create placeholders.

---

# Phase 1 — SaaS Foundation

Deliverables:

- Next.js App Router project
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Brand theme
- Supabase setup
- Auth pages
- Protected routes
- Organizations
- Memberships
- Tenant switcher
- Dashboard shell
- Admin shell
- Audit logs
- Sentry

Acceptance Criteria:

- User can sign up/sign in
- User can create organization
- User can switch tenant context
- Dashboard is protected
- RLS blocks cross-tenant reads

---

# Phase 2 — Billing and Plan Enforcement

Deliverables:

- Stripe products/prices
- Checkout
- Customer Portal
- Stripe webhook handler
- Subscription sync
- Plan limits table
- Feature gate helper
- Usage limit helper
- Billing settings page

Acceptance Criteria:

- User can subscribe
- Subscription status syncs correctly
- Feature gates block unavailable modules
- Webhooks are idempotent
- Plan limits are enforced server-side

---

# Phase 3 — Setup Wizard MVP

Wizard steps:

1. Business profile
2. Industry/niche
3. Services
4. Pricing rules
5. Service area
6. Business hours
7. Staff notifications
8. SMS consent/settings
9. Phone setup
10. Test call checklist

Acceptance Criteria:

- Business cannot launch until required fields are complete
- Pricing/hours/service area require explicit approval
- Wizard stores progress
- Admin can see incomplete setups

---

# Phase 4 — CRM MVP

Deliverables:

- Contacts
- Leads
- Notes
- Tags
- Customer timeline
- Call/SMS/job relationships
- Search/filter

Acceptance Criteria:

- New caller creates contact/lead
- Existing caller pulls history
- Timeline shows calls, messages, jobs, notes

---

# Phase 5 — Knowledge Base

Deliverables:

- Website import
- File upload
- Text extraction
- Chunking
- Embeddings
- User approval
- Retrieval API
- Fact confidence labels

Acceptance Criteria:

- Imported content cannot be used until approved
- Retrieval is tenant-scoped
- Knowledge search returns approved chunks only

---

# Phase 6 — Voice MVP

Deliverables:

- Twilio inbound webhook
- Voice provider abstraction
- OpenAI Realtime provider
- Agent prompt builder
- Tool router
- Call summary
- Transcript capture
- Call disposition
- Staff notification
- Usage metering

Acceptance Criteria:

- AI answers inbound call
- AI captures caller details
- AI classifies lead/spam/customer
- AI creates call log
- Summary appears in dashboard
- Minutes are logged as usage events

---

# Phase 7 — SMS System

Deliverables:

- Twilio Messaging
- SMS templates
- STOP/HELP handling
- Consent tracking
- Suppression list
- Staff alerts
- Customer confirmations
- Message logs

Acceptance Criteria:

- STOP prevents future outbound SMS
- HELP responds correctly
- AI cannot send SMS without consent check
- Every SMS is logged

---

# Phase 8 — Scheduling

Deliverables:

- Google Calendar OAuth
- Availability rules
- Appointment creation
- Reschedule/cancel request logic
- Booking confirmation SMS
- Staff notification

Acceptance Criteria:

- AI can book only inside approved availability
- Appointment links to contact and job
- Calendar event is created

---

# Phase 9 — Pricing Engine

Deliverables:

- Service pricing rules
- Zone/mileage pricing
- Surcharges
- Minimum pricing
- Deposit rules
- Quote explanation
- Quote SMS

Acceptance Criteria:

- AI cannot quote without tool result
- Quote shows line items
- Human approval threshold works

---

# Phase 10 — Payments and Deposits

Deliverables:

- Stripe Checkout deposit links
- Payment status webhooks
- Receipt SMS
- Failed payment follow-up
- Job payment timeline

Acceptance Criteria:

- Payment link ties to job/contact
- Stripe webhook updates payment status
- Deposit paid updates job

---

# Phase 11 — Dispatch Board

Deliverables:

- Job board
- Job status pipeline
- Technician assignment
- Internal notes
- Customer status updates
- ETA field

Acceptance Criteria:

- Job moves through pipeline
- Status history is preserved
- Customer updates can be sent by SMS

---

# Phase 12 — Invoicing

Deliverables:

- Invoice generator
- Invoice line items
- Deposit credit
- Balance due
- Payment link
- PDF invoice
- Paid/unpaid tracking
- Reminder automation

Acceptance Criteria:

- Completed job can generate invoice
- Invoice can be sent by SMS/email
- Payment updates invoice status

---

# Phase 13 — Reviews and Marketing

Deliverables:

- Review request automation
- Lost lead follow-up
- Estimate follow-up
- Repeat customer reminders
- Reactivation campaigns

Acceptance Criteria:

- Completed paid job triggers review request
- Lost leads can be followed up with consent
- Campaign events are logged

---

# Phase 14 — Month-End Reporting

Deliverables:

- Revenue summary
- Paid invoices
- Unpaid invoices
- Deposits collected
- Job totals
- Average ticket
- Lead conversion
- Technician totals
- Commission summary
- Payroll summary export
- CSV export
- QuickBooks/Xero placeholder

Acceptance Criteria:

- Owner can generate monthly closeout report
- Payroll is report-only
- Export works

---

# Phase 15 — AI Command Center

Deliverables:

- AI command input
- Permissioned tool execution
- Draft action preview
- Confirm-before-action flows
- Command history

Example command:

```text
Book Sarah for Tuesday afternoon, send her a $75 deposit link, assign Mike, and remind her tomorrow.
```

Acceptance Criteria:

- AI previews actions before execution when risky
- All actions use backend tools
- Audit logs capture command and results

---

## 12. First 40 Codex Tickets

Use one ticket at a time.

```text
Ticket 1: Scaffold Next.js App Router project with TypeScript, Tailwind, shadcn/ui, and brand tokens.
Ticket 2: Add environment variable validation and app configuration.
Ticket 3: Add Supabase client/server utilities.
Ticket 4: Build auth pages and protected routes.
Ticket 5: Create organizations, memberships, businesses, and audit_logs tables with RLS.
Ticket 6: Build organization creation and tenant switcher.
Ticket 7: Build dashboard shell and admin shell.
Ticket 8: Add Stripe products/prices configuration.
Ticket 9: Build Stripe Checkout and Customer Portal.
Ticket 10: Build Stripe webhook handler with idempotency.
Ticket 11: Create subscriptions, plan_limits, and usage_events tables.
Ticket 12: Build feature gate and plan limit helpers.
Ticket 13: Build billing settings page.
Ticket 14: Build setup wizard shell with progress tracking.
Ticket 15: Build business profile wizard step.
Ticket 16: Build services wizard step.
Ticket 17: Build pricing rules wizard step.
Ticket 18: Build service area wizard step.
Ticket 19: Build business hours wizard step.
Ticket 20: Build SMS consent/settings wizard step.
Ticket 21: Build contacts and leads tables with RLS.
Ticket 22: Build CRM contacts UI.
Ticket 23: Build customer timeline.
Ticket 24: Build notes/tags system.
Ticket 25: Build knowledge source upload/import schema.
Ticket 26: Build website import job.
Ticket 27: Build chunking/embedding/retrieval API.
Ticket 28: Build Twilio phone number settings.
Ticket 29: Build Twilio inbound call webhook.
Ticket 30: Build voice provider abstraction.
Ticket 31: Build OpenAI Realtime provider.
Ticket 32: Build agent prompt builder.
Ticket 33: Build AI tool router contracts.
Ticket 34: Build call logs and transcript storage.
Ticket 35: Build call summary UI.
Ticket 36: Build Twilio SMS sending and message logs.
Ticket 37: Build STOP/HELP and suppression list.
Ticket 38: Build Google Calendar OAuth.
Ticket 39: Build appointment booking tool.
Ticket 40: Build job records and basic job board.
```

---

## 13. MVP Cut Line

The first paid version should include:

- Auth
- Tenant system
- Stripe billing
- Plan enforcement
- Setup wizard
- Basic CRM
- AI receptionist
- Twilio inbound calls
- Call logs
- Transcripts/summaries
- SMS follow-up
- Google Calendar booking
- Basic jobs
- Usage metering
- Admin dashboard

Do not delay MVP for:

- Payroll processing
- Inventory
- Full accounting ledger
- Fleet GPS
- Mobile technician app
- Enterprise pricebook
- Financing
- HIPAA/legal-sensitive workflows
- White-label agency portal
- Advanced route optimization

---

## 14. Production Readiness Checklist

Before beta:

- [ ] Auth works
- [ ] RLS tested
- [ ] Stripe test mode passes
- [ ] Stripe live mode passes
- [ ] Twilio inbound call test passes
- [ ] Twilio SMS STOP/HELP test passes
- [ ] OpenAI Realtime test calls pass
- [ ] 25 red-team calls completed
- [ ] Pricing hallucination rate is 0%
- [ ] Tenant data leak test passes
- [ ] Usage limits enforced
- [ ] Admin kill switch exists
- [ ] Sentry installed
- [ ] Backups configured
- [ ] Privacy/Terms/SMS pages live
- [ ] Support email live

Before public launch:

- [ ] 10 paying beta customers
- [ ] 500+ real calls handled
- [ ] AI resolution rate above 75%
- [ ] False booking rate below 1%
- [ ] Billing reconciliation passes
- [ ] Support SOP written
- [ ] Refund/cancellation flow tested
- [ ] Onboarding video recorded

---

## 15. Cost Controls

Required controls:

- No unlimited plans
- Per-plan simultaneous call limits
- Per-plan monthly minute limits
- Per-plan SMS limits
- Per-tenant daily spend cap
- Call duration caps
- Spam call auto-ending
- Usage alerts at 50%, 80%, 100%, 120%
- Overage cap
- Admin kill switch
- Provider failover only on higher tiers
- Prompt caching where possible
- Retrieval-limited knowledge injection

---

## 16. Final Product Statement

Use this positioning internally and externally:

> **Missed No More Pro OS answers your calls, books your jobs, manages your customers, collects deposits, dispatches work, sends invoices, requests reviews, and shows exactly how much revenue it saved.**

This is the product direction.

Build the AI receptionist first.
Then build the CRM.
Then booking, payments, dispatch, invoicing, reporting, and AI command center.

Do not try to copy enterprise platforms feature-for-feature.
Win by being simpler, faster, more affordable, and AI-first for small local service businesses.

