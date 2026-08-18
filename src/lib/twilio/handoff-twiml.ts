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

export function handoffCallerTwiml(opts: { conferenceName: string; holdUrl: string }): string {
  return (
    `<Dial><Conference startConferenceOnEnter="false" endConferenceOnExit="true" ` +
    `beep="false" waitUrl="${escapeXml(opts.holdUrl)}" waitMethod="POST">` +
    `${escapeXml(opts.conferenceName)}</Conference></Dial>`
  );
}

export function handoffHoldTwiml(holdUrl: string): string {
  return (
    `<Say ${VOICE}>Thanks for holding. I&apos;m connecting you with the team now.</Say>` +
    `<Pause length="10"/><Redirect method="POST">${escapeXml(holdUrl)}</Redirect>`
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
