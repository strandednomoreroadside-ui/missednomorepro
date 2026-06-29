/**
 * Missed No More Pro — inbound email Worker (Cloudflare Email Routing).
 *
 * A "dumb forwarder": it does NO parsing. It receives each email Cloudflare
 * routes to inbound.missednomorepro.com and POSTs the raw message to our app,
 * which parses it (postal-mime), resolves the tenant from the recipient token,
 * runs the AI, and replies. Keeping the Worker this thin means there's nothing
 * to maintain here — all the logic lives in /api/email/inbound.
 *
 * Required Worker variables (wrangler.toml [vars] + a secret):
 *   MNM_INBOUND_URL    = https://missednomorepro.com/api/email/inbound
 *   MNM_INBOUND_SECRET = (secret) must equal the app's EMAIL_INBOUND_SECRET
 *
 * Why x-mnm-to: the envelope recipient (message.to) is the token address
 * {token}@inbound.missednomorepro.com — that's how we resolve the business.
 * The email's own "To:" header is the business's real address and is useless
 * for routing, so we pass the envelope recipient explicitly.
 */
export default {
  async email(message, env) {
    const raw = await new Response(message.raw).arrayBuffer();
    try {
      const res = await fetch(env.MNM_INBOUND_URL, {
        method: "POST",
        headers: {
          "content-type": "message/rfc822",
          "x-email-secret": env.MNM_INBOUND_SECRET,
          "x-mnm-to": message.to || "",
          "x-mnm-from": message.from || "",
        },
        body: raw,
      });
      if (!res.ok) {
        console.log("MNM inbound returned", res.status);
      }
    } catch (err) {
      // Never reject the message on our side — log and move on so the sender
      // doesn't get a bounce. (Our app is idempotent, so a Cloudflare retry of
      // a transient failure is safe.)
      console.log("MNM inbound POST failed:", err && err.message);
    }
  },
};
