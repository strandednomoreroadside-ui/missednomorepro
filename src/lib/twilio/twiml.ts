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

/** Bridge the caller's media to the voice provider (M7). Twilio streams
 *  audio straight to the provider's websocket — our server isn't in the
 *  audio path. <Connect> keeps the call alive for the whole conversation. */
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
