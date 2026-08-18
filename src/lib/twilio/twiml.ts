import "server-only";

export {
  handoffCallerTwiml,
  handoffFallbackTwiml,
  handoffHoldTwiml,
  handoffRecipientBridgeTwiml,
  handoffRecipientTwiml,
} from "./handoff-twiml";

/** Escapes text for safe embedding in TwiML XML. */
export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function twimlResponse(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

const VOICE = `voice="Polly.Matthew-Neural"`;

/** Placeholder greeting + voicemail (BUILD_GUIDE M6). */
export function greetingTwiml(opts: {
  businessName: string;
  /** TwiML <Record action>: where Twilio sends the caller next. */
  recordDonePath: string;
  /** Async callback that delivers the final RecordingUrl. */
  recordingStatusPath: string;
}): string {
  const name = xmlEscape(opts.businessName);
  return (
    `<Say ${VOICE}>Thanks for calling ${name}. ` +
    `Our A I assistant is still being set up, so please leave your name, ` +
    `phone number, and what you need after the beep, and the team will ` +
    `call you right back.</Say>` +
    `<Record maxLength="120" playBeep="true" ` +
    `action="${xmlEscape(opts.recordDonePath)}" ` +
    `recordingStatusCallback="${xmlEscape(opts.recordingStatusPath)}" ` +
    `recordingStatusCallbackEvent="completed"/>` +
    `<Say ${VOICE}>We didn't catch a message. Goodbye.</Say>`
  );
}

/** Played after the caller finishes (or abandons) the voicemail. */
export function voicemailThanksTwiml(): string {
  return `<Say ${VOICE}>Got it — thank you. The team will call you back shortly. Goodbye.</Say><Hangup/>`;
}

/** A TwiML SMS reply (M8 inbound STOP/HELP/START). Wrap in twimlResponse. */
export function messageTwiml(text: string): string {
  return `<Message>${xmlEscape(text)}</Message>`;
}

/** Bridge the caller to the voice provider over SIP (M7). After the
 *  provider registers the call, Twilio dials its SIP URI; the provider
 *  matches the call by the id embedded in the URI and runs the AI. This
 *  is Retell's "dial to SIP URI" custom-telephony method.
 *
 *  `timeLimitSeconds` hard-caps the bridged leg — used by the demo call so
 *  a test can never run up more than a couple of minutes of voice cost. */
export function dialSipTwiml(sipUri: string, opts?: { timeLimitSeconds?: number }): string {
  const limit = opts?.timeLimitSeconds ? ` timeLimit="${opts.timeLimitSeconds}"` : "";
  return `<Dial${limit}><Sip>${xmlEscape(sipUri)}</Sip></Dial>`;
}

/** Speak a one-off line and hang up (graceful failure for the demo call
 *  when the AI bridge can't be set up). */
export function sayHangupTwiml(message: string): string {
  return `<Say ${VOICE}>${xmlEscape(message)}</Say><Hangup/>`;
}

/** Forward the caller to a real phone (the §14 kill switch / cost-cap
 *  path). When the AI is turned off or a usage/spend cap trips, we ring
 *  the owner's phone instead of dropping the call or burning minutes. */
export function dialNumberTwiml(number: string): string {
  // No callerId override — <Dial> presents the original caller's number to
  // the owner by default, so they see who's actually calling.
  return `<Dial timeout="25">${xmlEscape(number)}</Dial>`;
}

/** Prompt for touch-tone digits, terminated by #. Used by the callback IVR
 *  (call your own business number → enter a PIN → enter a number to dial).
 *  If the caller enters nothing before the timeout, Twilio still POSTs to
 *  `actionPath` with empty Digits — the receiving route treats that as a
 *  failed attempt rather than hanging here. */
export function gatherDigitsTwiml(opts: {
  prompt: string;
  actionPath: string;
  timeoutSeconds?: number;
}): string {
  return (
    `<Gather finishOnKey="#" timeout="${opts.timeoutSeconds ?? 12}" ` +
    `action="${xmlEscape(opts.actionPath)}" method="POST">` +
    `<Say ${VOICE}>${xmlEscape(opts.prompt)}</Say>` +
    `</Gather>` +
    `<Say ${VOICE}>We didn't get any input. Goodbye.</Say><Hangup/>`
  );
}

/** Click-to-call bridge: ring the target number, presenting the tenant's own
 *  business number as caller ID (so customers see/recognize the business,
 *  not a random staff cell). Used after a staff member's own phone answers
 *  the first leg of an outbound "call this number" request. Hard-capped by
 *  `timeLimitSeconds` so a forgotten open line can't run up cost forever. */
export function bridgeCallTwiml(
  number: string,
  opts?: { callerId?: string; timeLimitSeconds?: number }
): string {
  const callerId = opts?.callerId ? ` callerId="${xmlEscape(opts.callerId)}"` : "";
  const limit = opts?.timeLimitSeconds ? ` timeLimit="${opts.timeLimitSeconds}"` : "";
  return (
    `<Say ${VOICE}>Connecting you now.</Say>` +
    `<Dial${callerId}${limit} timeout="25">${xmlEscape(number)}</Dial>`
  );
}

/** Media-stream bridge (kept for stream-based providers / Path B). Twilio
 *  streams audio straight to the provider's websocket. */
export function connectStreamTwiml(streamUrl: string): string {
  return `<Connect><Stream url="${xmlEscape(streamUrl)}"/></Connect>`;
}

/** Response for an unrecognized number — never reveal tenant details. */
export function unconfiguredTwiml(): string {
  return (
    `<Say ${VOICE}>This number is not configured yet. ` +
    `Please try again later.</Say><Hangup/>`
  );
}
