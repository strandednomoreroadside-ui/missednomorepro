// Twilio webhook parsing/validation now lives in a shared lib (used by
// the voice + SMS webhooks). Re-exported here so existing voice-route
// imports keep working.
export { forbidden, parseValidTwilioRequest } from "@/lib/twilio/webhook";
