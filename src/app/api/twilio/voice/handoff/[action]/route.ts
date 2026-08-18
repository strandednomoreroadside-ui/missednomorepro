import { createAdminClient } from "@/lib/supabase/admin";
import {
  acceptVoiceHandoff,
  failVoiceHandoff,
  getVoiceHandoff,
  holdHandoffTwiml,
  recipientBridgeTwiml,
  recipientHandoffTwiml,
  updateHandoffRecipientStatus,
} from "@/lib/voice/handoff";
import { sayHangupTwiml, twimlResponse } from "@/lib/twilio/twiml";

import { forbidden, parseValidTwilioRequest } from "../../shared";

/** The decline/no-answer path releases the caller and then writes a task and
 * staff texts; the platform default is too tight for that tail. Matches the
 * voice tool router. */
export const maxDuration = 30;

/** Twilio-signed callbacks for the server-owned warm handoff. The only
 * publicly reachable values are an opaque UUID and an action; every action
 * verifies Twilio's signature and cross-checks the recipient CallSid. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const form = await parseValidTwilioRequest(request);
  if (!form) return forbidden();

  const { action } = await params;
  const handoffId = new URL(request.url).searchParams.get("id") ?? "";
  if (!handoffId) return twimlResponse(sayHangupTwiml("We couldn't complete that handoff."));

  const admin = createAdminClient();
  const handoff = await getVoiceHandoff(admin, handoffId);
  if (!handoff) return twimlResponse(sayHangupTwiml("We couldn't complete that handoff."));

  if (action === "hold") return twimlResponse(holdHandoffTwiml(handoffId));

  const callSid = form.CallSid ?? "";
  if (action === "recipient") {
    // The Twilio REST create response is persisted immediately after dialing;
    // permit this first fetch during that tiny write race, but enforce the
    // exact call SID for every decision and status mutation below.
    if (handoff.recipient_call_sid && handoff.recipient_call_sid !== callSid) {
      return twimlResponse(sayHangupTwiml("This handoff is no longer available."));
    }
    return twimlResponse(recipientHandoffTwiml(handoff));
  }

  if (action === "decision") {
    const accepted = form.Digits === "1" && new URL(request.url).searchParams.get("timeout") !== "1";
    if (accepted && (await acceptVoiceHandoff(admin, handoff, callSid))) {
      return twimlResponse(recipientBridgeTwiml(handoff));
    }
    await failVoiceHandoff(
      admin,
      handoffId,
      "declined",
      form.Digits === "2" ? "recipient_declined" : "recipient_no_acceptance"
    );
    return twimlResponse(sayHangupTwiml("Thanks. We'll have the team follow up."));
  }

  if (action === "status") {
    await updateHandoffRecipientStatus(admin, handoffId, callSid, form.CallStatus ?? "");
    return new Response("ok");
  }

  return twimlResponse(sayHangupTwiml("We couldn't complete that handoff."));
}
