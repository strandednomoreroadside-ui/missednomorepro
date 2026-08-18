/** Pure TwiML builders for the server-owned handoff flow. Kept independent of
 * `server-only` so their caller/recipient contract is unit-testable. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const VOICE = `voice="Polly.Matthew-Neural"`;

/** Music, not speech, while the caller waits. A spoken hold loop had to use a
 * generic Twilio voice, which meant a stranger's voice cut in right after the
 * business's own agent — jarring, and it read as a different company. Music is
 * neutral and never competes with the agent.
 *
 * This is the same Twilio-hosted service Twilio itself uses as the default
 * conference hold music. Change the vibe by swapping the bucket:
 * ambient | classical | electronica | guitars | rock | soft-rock */
const HOLD_MUSIC_URL = "http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient";

export function handoffCallerTwiml(opts: { conferenceName: string }): string {
  return (
    `<Dial><Conference startConferenceOnEnter="false" endConferenceOnExit="true" ` +
    `beep="false" waitUrl="${escapeXml(HOLD_MUSIC_URL)}" waitMethod="GET">` +
    `${escapeXml(opts.conferenceName)}</Conference></Dial>`
  );
}

export function handoffRecipientTwiml(opts: {
  mode: "normal" | "emergency";
  summary: string;
  decisionUrl: string;
}): string {
  const prompt =
    opts.mode === "emergency"
      ? "Urgent customer request. Press 1 to join the caller now."
      : `A customer is waiting. Briefly: ${opts.summary}. Press 1 to accept and join the caller, or 2 to decline.`;
  return (
    `<Gather numDigits="1" timeout="12" action="${escapeXml(opts.decisionUrl)}" method="POST">` +
    `<Say ${VOICE}>${escapeXml(prompt)}</Say></Gather>` +
    `<Redirect method="POST">${escapeXml(`${opts.decisionUrl}&timeout=1`)}</Redirect>`
  );
}

export function handoffRecipientBridgeTwiml(conferenceName: string): string {
  return (
    `<Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true" ` +
    `beep="false">${escapeXml(conferenceName)}</Conference></Dial>`
  );
}

export function handoffFallbackTwiml(opts: {
  recordDoneUrl: string;
  recordingStatusUrl: string;
}): string {
  return (
    `<Say ${VOICE}>I couldn't reach someone live right this second. Please leave a brief message after the beep, and the team will call you back.</Say>` +
    `<Record maxLength="120" playBeep="true" action="${escapeXml(opts.recordDoneUrl)}" ` +
    `recordingStatusCallback="${escapeXml(opts.recordingStatusUrl)}" ` +
    `recordingStatusCallbackEvent="completed"/>` +
    `<Say ${VOICE}>We didn't catch a message. Goodbye.</Say><Hangup/>`
  );
}

/** Wrap TwiML verbs into a complete document. Webhook responses and the REST
 * call-modification API both require the `<Response>` root — a bare fragment
 * is invalid TwiML, and Twilio's reaction to invalid TwiML is to hang up. */
export function twimlDocument(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`;
}
