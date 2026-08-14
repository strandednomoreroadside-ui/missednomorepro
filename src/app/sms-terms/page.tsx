import type { Metadata } from "next";

import { LegalShell } from "@/components/legal-shell";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "SMS Terms & Conditions",
  description:
    "SMS messaging terms for Missed No More Pro — program description, opt-in, opt-out (STOP), help (HELP), frequency, and carrier disclosures.",
  alternates: { canonical: "/sms-terms" },
};

export default function SmsTermsPage() {
  return (
    <LegalShell title="SMS Terms & Conditions" effectiveDate="June 21, 2026">
      <section>
        <h2>1. Program description</h2>
        <p className="mt-3">
          Missed No More Pro provides AI receptionist and front-office software to
          local service businesses. When you call or text a business that uses our
          platform, that business may send you text messages through our service,
          including:
        </p>
        <ul className="mt-3 space-y-1.5">
          <li>Appointment confirmations, reminders, and scheduling updates</li>
          <li>Follow-ups after a missed or disconnected call you placed</li>
          <li>Requested quotes, service updates, and arrival notifications</li>
          <li>Responses to questions you asked by phone or text</li>
        </ul>
        <p className="mt-3">
          Messages are sent on behalf of the business you contacted. Message
          frequency varies based on your interaction with that business.
        </p>
      </section>

      <section>
        <h2>2. Opt-in</h2>
        <p className="mt-3">
          You consent to receive messages by providing your phone number to a
          participating business and requesting service, scheduling an
          appointment, calling a number operated through our platform, or texting
          that business first. Consent to receive text messages is not a condition
          of purchasing any goods or services.
        </p>
      </section>

      <section>
        <h2>3. Opt-out (STOP)</h2>
        <p className="mt-3">
          Reply <strong>STOP</strong> at any time to cancel and stop receiving
          messages. After you send STOP, you will receive one final message
          confirming that you have been unsubscribed, and no further messages will
          be sent to your number. Reply <strong>START</strong> to resume messages.
        </p>
      </section>

      <section>
        <h2>4. Help (HELP)</h2>
        <p className="mt-3">
          Reply <strong>HELP</strong> at any time for assistance, or email our
          support team at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan underline-offset-4 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section>
        <h2>5. Fees and carriers</h2>
        <p className="mt-3">
          <strong>Message and data rates may apply</strong> according to your
          mobile plan. Carriers (e.g. AT&amp;T, T-Mobile, Verizon) are not liable
          for delayed or undelivered messages. Messaging is available on major US
          carriers; coverage on smaller or prepaid carriers may vary.
        </p>
      </section>

      <section>
        <h2>6. Privacy</h2>
        <p className="mt-3">
          <strong>
            No mobile information will be shared with third parties or affiliates
            for marketing or promotional purposes.
          </strong>{" "}
          Opt-in data and consent are never sold or shared with third parties for
          their own marketing. See our{" "}
          <a className="text-cyan underline-offset-4 hover:underline" href="/privacy">
            Privacy Policy
          </a>{" "}
          for details on how information is collected and used.
        </p>
      </section>

      <section>
        <h2>7. Changes</h2>
        <p className="mt-3">
          We may update these SMS terms from time to time. The current version
          will always be available on this page, with the effective date shown
          above.
        </p>
      </section>
    </LegalShell>
  );
}
