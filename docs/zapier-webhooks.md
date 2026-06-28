# Connect anything with Zapier (webhooks)

On the **Professional** plan and up, Missed No More Pro can send your business
events to Zapier, Make, n8n, or any tool that accepts a webhook — so a new lead
can land in your spreadsheet, your email marketing, or your existing CRM
automatically. No coding.

Find it in the app under **Integrations**.

---

## Set it up with Zapier (5 minutes)

1. In Zapier, **Create Zap**.
2. Trigger: search **Webhooks by Zapier** → **Catch Hook** → Continue.
3. Zapier shows you a **custom webhook URL**. Copy it.
4. In Missed No More Pro → **Integrations → Add an endpoint**:
   - Paste the URL.
   - (Optional) give it a label like "Zapier → Google Sheets".
   - Check the events you want (or leave all unchecked to get everything).
   - **Add endpoint**.
5. Back in the app, click **Send test** on the new endpoint. In Zapier, click
   **Test trigger** — it should find the test event.
6. Add whatever **Action** you want in Zapier (add a row, send an email, create a
   contact in your CRM, etc.) and turn the Zap on.

That's it. From now on, the moment one of your chosen events happens, Zapier
runs your automation.

---

## The events you can send

| Event | Fires when |
|---|---|
| `lead.created` | A new lead enters your pipeline (the AI captures one while quoting or booking, or you add one manually). |
| `appointment.booked` | The AI or staff books an appointment. |
| `job.completed` | A job is marked completed. |
| `payment.received` | A customer payment (deposit / invoice / link) is paid. |

## What a payload looks like

We POST JSON. Example for a new lead:

```json
{
  "id": "f1e2d3c4-...",
  "event": "lead.created",
  "created_at": "2026-06-26T18:40:00.000Z",
  "business_id": "...",
  "data": {
    "lead_id": "...",
    "contact_id": "...",
    "service_needed": "Flat tire",
    "source": "call",
    "contact": { "id": "...", "name": "Jane D", "phone": "+1440...", "email": null }
  }
}
```

In Zapier you can map any of these fields into your action.

---

## Is it really from you? (verifying the signature)

Every request includes headers:

- `X-MNM-Event` — the event name
- `X-MNM-Delivery` — a unique delivery id
- `X-MNM-Signature` — `sha256=<hex>`, an HMAC-SHA256 of the exact JSON body using
  your endpoint's **secret** (shown on the Integrations page)

For Zapier this usually doesn't matter (the URL is already private). If you build
a custom receiver and want to be sure a request is genuinely from us, recompute
the HMAC over the raw body with your secret and compare it to the signature.

---

## Good to know

- **HTTPS only.** We won't POST to plain `http://` or to internal/private
  addresses (a basic safety measure).
- **Retries.** If your endpoint is down, we retry with backoff and you'll see the
  attempts in the **Recent deliveries** log. An endpoint that keeps failing is
  paused automatically — fix the URL and click **Enable** to resume.
- **Privacy.** A webhook sends your customers' data to wherever you point it, so
  only add endpoints you trust.
