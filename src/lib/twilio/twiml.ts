import "server-only";

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
 *  is Retell's "dial to SIP URI" custom-telephony method. */
export function dialSipTwiml(sipUri: string): string {
  return `<Dial><Sip>${xmlEscape(sipUri)}</Sip></Dial>`;
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
