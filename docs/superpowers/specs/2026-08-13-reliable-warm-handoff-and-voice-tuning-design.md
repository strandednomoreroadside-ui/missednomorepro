# Reliable warm handoff and conversational voice tuning

**Date:** 2026-08-13
**Status:** Approved design; implementation has not begun

## 1. Context and decision

The product currently receives inbound calls in Twilio, bridges them over SIP
to Retell, and uses an ElevenLabs-backed Retell voice. The existing human
handoff implementation adds a Retell-native `transfer_to_human` tool and asks
the model to select it. The fallback `escalate_to_human` tool instead creates
an urgent task and sends a staff text.

Live production evidence establishes that a caller who explicitly requests a
person causes the model to invoke `escalate_to_human`; no Retell transfer leg
is created. The caller therefore hears a transfer-style message but the staff
member only receives an alert text. The issue is model action selection, not a
carrier transfer that timed out. A separate stale-sync issue also left the
demo Retell agent with a transfer tool after transfers had been disabled in
the product database.

The system will replace provider-managed transfer with an application-owned,
Twilio conference handoff. It preserves the `escalate_to_human` tool name the
model already selects, but changes its behavior when a live-transfer target is
configured. Normal handoffs are warm and verified. Safety-critical emergencies
bypass the detailed private briefing for the fastest safe connection.

No additional fixed SaaS provider is introduced. The implementation stays in
the existing Next.js, Supabase, Twilio, Retell, and ElevenLabs-via-Retell
stack.

## 2. Goals and non-goals

### Goals

- An explicit request for a person creates an actual, observable handoff
  attempt instead of immediately sending a text-only escalation.
- A normal handoff privately briefs the staff recipient before the caller is
  joined, so the caller does not repeat their situation.
- An emergency bypasses the detailed brief and reaches the recipient as fast
  as possible, while still avoiding an unverified connection to voicemail.
- Failed, declined, busy, and unanswered handoffs leave the caller with a
  clear fallback and notify staff only after that failure is known.
- Transfer settings are synchronized to Retell immediately after a relevant
  dashboard change; they must not remain stale until a future call happens to
  rebuild the agent.
- Speech sounds natural, answers promptly, and has a maintainable path for
  correcting proper nouns and other pronunciation defects.
- Every handoff outcome and tuning change is auditable and testable.

### Non-goals

- No claim that the assistant is human or change to the existing truthfulness
  rule when a caller asks whether it is AI.
- No migration to a new real-time speech pipeline, no direct ElevenLabs BYOK
  dependency, and no change to billing or standard call recording policy.
- No attempt to predict every word in English. The product will cover known
  error classes and provide a verified per-business correction loop.
- No unrelated rewrite of booking, quoting, CRM, SMS consent, or the existing
  general voice-tool handler.

## 3. Alternatives considered

### A. Retain Retell-native warm transfer

This is the smallest edit: tune the existing `transfer_to_human` tool and
continue to tell the model to call it first. It is rejected because the
production model is already bypassing that tool in favor of
`escalate_to_human`, and the provider-native transfer lacks the application
level state and failure visibility needed for a core routing feature.

### B. Application-owned Twilio conference handoff (chosen)

The model invokes the existing escalation-shaped action. The server resolves
the target phone number, moves the caller into a moderated Twilio conference,
calls the recipient, gives a private summary, and bridges only after the
recipient accepts. The application observes every state and owns fallback.

This adds bounded Twilio routing code and webhook endpoints, but it makes the
critical action deterministic after the model selects its already-established
escalation behavior.

### C. Retell Conversation Flow migration

Transfer can be represented as a Retell flow node. This is not chosen because
it requires migrating the mature prompt/tool configuration to a separate
provider-managed graph while still leaving the call transfer and its failure
state outside the product's control.

## 4. Handoff architecture

### 4.1 Tool contract

- Remove the Retell-native `transfer_to_human` function from the agent.
- Keep `escalate_to_human` as the visible model action. For a business with
  `transfer_enabled` and a resolved target, it becomes a live handoff command;
  without a target or when transfers are disabled, it retains the current
  task-and-text fallback behavior.
- Extend its arguments with an explicit `urgency` value of `normal` or
  `emergency`. The server derives the target exclusively from the business
  configuration and never from model-supplied input.
- The custom tool's execution behavior is handoff-specific: it must not wait
  for a second Retell after-tool speech turn after the caller has been moved
  out of the SIP leg.

### 4.2 State and audit record

Add a tenant-scoped `voice_handoffs` table with one handoff per source call.
It stores the source call, tenant, business, mode, bounded private summary,
Twilio recipient call SID, conference name, outcome, error code, and state
timestamps. It does not duplicate the destination phone number; the number is
already controlled in the business/staff configuration and is resolved
server-side.

Valid outcomes are `starting`, `holding`, `ringing`, `awaiting_acceptance`,
`accepted`, `bridged`, `declined`, `busy`, `no_answer`, `failed`, `cancelled`,
and `caller_left`. A uniqueness constraint on the source call and idempotent
state transitions prevent a repeated model tool call or webhook retry from
placing a second staff call.

The call timeline records the final transfer outcome. Managers can view
handoff attempts and outcomes without seeing extra raw transcript content.

### 4.3 Normal warm handoff sequence

1. The caller asks for a person. The agent calls `escalate_to_human` with a
   short factual summary.
2. The authenticated server creates the handoff row, redirects the active
   inbound Twilio call from its Retell SIP `<Dial>` to a moderated conference,
   and plays a short looping hold message.
3. The server starts an outbound Twilio call to the configured staff target.
4. The recipient hears a private, concise summary and is asked to press 1 to
   accept or 2 to decline. The caller cannot hear this exchange.
5. On 1, the recipient joins the conference with permission to start it;
   the caller and recipient are bridged. The handoff becomes `bridged`.
6. On decline, timeout, busy, failed call, no answer, or recipient hangup
   before acceptance, the server redirects the caller to the fallback TwiML,
   records the outcome, creates the urgent follow-up task, and sends the
   existing staff alert text.

The caller is never told that a person is connected until the recipient has
actually accepted. The normal recipient ring timeout is 30 seconds and the
accept/decline gather timeout is 12 seconds.

### 4.4 Emergency handoff sequence

An emergency uses the same server-owned conference and state recording, but
skips the long private summary. The recipient hears a brief urgent notice and
presses 1 to join. This one-key human-accept gate prevents a caller from being
bridged to voicemail, while materially reducing handoff time. A failure uses
the same caller fallback and staff alert as the normal flow.

The agent's safety and dispatch instructions remain in force; this handoff is
not a substitute for emergency services or a guarantee that a field team is
available.

### 4.5 Webhook endpoints and security

Dedicated Twilio routes provide caller hold music, recipient briefing, gather
decision, recipient call status, and caller fallback/recording. Every route
validates the Twilio request signature and resolves all state by an opaque,
server-generated handoff ID. The model cannot choose a phone number,
conference, callback URL, or tenant.

The handoff starter validates that the parent Twilio call SID belongs to the
current tenant's Retell call before redirecting it. Twilio status callbacks and
gather retries use idempotent transition checks. The server only starts the
recipient leg after the caller has been placed on hold; if holding the caller
fails, no staff call is placed.

An additional guard treats a caller number equal to the configured transfer
target as an unsupported self-transfer test. It routes to the clear fallback
instead of creating a misleading failed transfer.

### 4.6 Settings and synchronization

The existing transfer switch and destination retain their meaning. Saving
them must immediately force a Retell agent synchronization rather than rely
on lazy synchronization during the next inbound call. Deployment additionally
runs a controlled one-time resync for every active agent, removing stale
provider transfer tools and applying the new voice profile.

## 5. Voice profile and pronunciation

### 5.1 Conversational profile

The first profile remains on the existing `11labs-Grace` voice, but pins
provider settings instead of inheriting defaults:

- `eleven_turbo_v2_5` voice model for conversational quality with low latency.
- Base voice speed 1.04 and dynamic voice speed enabled; this remains inside
  the tested natural-conversation range rather than sounding rushed.
- Voice temperature 0.85: enough variation for natural delivery without the
  unstable artifacts associated with highly variable speech.
- Dynamic responsiveness enabled with high responsiveness. The existing
  conservative interruption sensitivity and strong denoising remain unchanged
  so roadside/background noise does not constantly cut the agent off.
- Speech normalization enabled for ordinary dates, currency, and numbers.
- Low-frequency ElevenLabs-compatible backchannels are enabled only after
  the voice corpus confirms that they sound natural; they remain an immediate
  per-profile rollback setting.

`fast` STT is introduced behind the profile flag. It will replace `accurate`
only after the corpus and live test calls show that business names, places, and
service terms remain accurately transcribed. Existing boosted keywords remain
active in both profiles.

### 5.2 Spoken-language rules

The prompt retains the legal/safety boundaries and one-question-at-a-time
behavior, but its speech guidance is consolidated around conversational
output: contractions are normal, responses are usually one or two sentences,
and tool fillers are short static text rather than model-generated narration.

Canonical values passed to tools remain unmodified. Speech-only formatting is
applied only to caller-facing content, avoiding the previous defect where a
digit-spaced ZIP leaked into a tool request.

### 5.3 Layered pronunciation dictionary

Replace the global hard-coded list with a validated composition of:

1. **Global entries:** established acronym and time rules, plus vetted common
   service/telephony terms.
2. **Business entries:** business name, staff names, city/town names, roads,
   landmarks, product names, vehicle terms, and local jargon.
3. **Speech normalization:** routine number, currency, date, ordinal, and
   measurement handling before a dictionary override is considered.

Business overrides contain a written term, an approved spoken alias or IPA
pronunciation, locale, status, and audit timestamps. Alias entries are the
default because they remain dependable across voice models. IPA is used only
after an audio check demonstrates that it improves the chosen voice.

A manager-only settings card lets an owner add, edit, disable, and review
these entries. Saving immediately triggers the same provider resync mechanism
as transfer settings.

### 5.4 ElevenLabs subscription use

The user's separate ElevenLabs subscription is not connected to the current
production path. It is useful for auditioning legally authorized candidate
voices against the same corpus. The production agent remains Retell-managed
unless an authorized voice can be imported through Retell's supported custom
voice workflow. The application does not add a second streaming TTS hop or
depend on a private-account API key for live calls.

## 6. Verification and acceptance criteria

### Automated coverage

- Unit tests for handoff state transitions, idempotency, caller/target
  self-transfer guard, summary bounds, and outcome-to-alert mapping.
- TwiML tests covering hold, recipient briefing, acceptance, decline,
  emergency, voicemail/fallback, and XML escaping.
- Route tests with signed Twilio webhook fixtures for normal and duplicate
  callback delivery.
- Agent-configuration tests proving the native transfer tool is absent, the
  server handoff action is present, and a transfer-disabled business retains
  the text-only fallback.
- Pronunciation/profile tests covering the global and business dictionary
  merge, de-duplication, invalid overrides, and a 30-plus phrase speech
  corpus spanning acronyms, time, currency, phone/ZIP values, addresses,
  ordinals, units, and proper nouns.

### Real-call acceptance test

Use two different physical caller phones plus the configured staff target:

1. Normal explicit human request: recipient receives a private summary,
   presses 1, and speaks to the caller.
2. Recipient declines: caller hears the fallback and the alert is sent once.
3. Recipient does not answer: caller is not left on hold, receives fallback,
   and the alert is sent once.
4. Emergency request: recipient gets the fast urgent prompt without detailed
   briefing and can join immediately.
5. Transfer disabled: no recipient call is made; the current text-only
   escalation remains intact.
6. Voice corpus: compare the previous profile, pinned quality profile, and
   fast-STT profile; retain only the fastest profile with no critical
   transcription or pronunciation regression.

### Measurable targets

| Area | Target |
| --- | --- |
| Explicit human request → recorded handoff attempt | 100% |
| Urgent staff text before a live attempt has failed | 0% |
| Normal handoff start API latency | p50 <= 1 s, p95 <= 2 s |
| Emergency handoff start | p95 <= 2 s |
| Caller turn-to-agent voice response | p50 <= 1.5 s, p95 <= 2.5 s |
| Critical pronunciation errors in approved corpus | 0 |
| Voice routing availability | 99.9% monthly |
| Settings page mobile performance | LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 |

## 7. Rollout and rollback

The server-owned handoff and the fast-STT voice profile are independently
feature-flagged per business. Initial activation occurs on the owner's line
only after the real-call acceptance suite passes. Handoff telemetry is
reviewed after every early transfer attempt.

If the conference flow fails, disable the handoff flag to restore the existing
text-only escalation path. If voice quality or transcription regresses,
disable the new voice profile and restore the previous accurate-STT, default
voice configuration. Neither rollback requires schema deletion or affects
unrelated booking, CRM, or SMS behavior.

## 8. Implementation boundaries

Implementation changes are expected in the voice tool registry/handler,
Retell agent sync/configuration, Twilio call helper and TwiML helpers,
dedicated Twilio handoff routes, dashboard settings, a Supabase migration,
and focused test files. Existing unrelated marketing worktree changes are
outside this feature and must not be included.
