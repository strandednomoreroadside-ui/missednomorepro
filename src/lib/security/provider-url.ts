/**
 * Twilio recording media is served from the API host, including regional
 * variants such as api.sydney.au1.twilio.com. Credentials must never be sent
 * to a URL merely because the string happens to contain "twilio.com".
 */
export function isTrustedTwilioRecordingUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === "api.twilio.com" || (hostname.startsWith("api.") && hostname.endsWith(".twilio.com"));
  } catch {
    return false;
  }
}

