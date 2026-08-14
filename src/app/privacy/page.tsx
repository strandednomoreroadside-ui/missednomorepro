import type { Metadata } from "next";

import { LegalShell } from "@/components/legal-shell";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Missed No More Pro collects, uses, and protects information across calls, texts, and the dashboard.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effectiveDate="June 25, 2026">
      <section>
        <h2>1. Who we are</h2>
        <p className="mt-3">
          Missed No More Pro (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an AI
          receptionist and front-office platform for local service businesses.
          This policy explains what information we collect, how we use it, and
          the choices you have. It covers both our business customers (the
          companies that subscribe to our platform) and the people who call or
          text those businesses.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <ul className="mt-3 space-y-1.5">
          <li>
            <strong>Account information</strong> — name, email, phone number, and
            business details provided when a business signs up.
          </li>
          <li>
            <strong>Business configuration</strong> — services, pricing rules,
            hours, service areas, and FAQs a business enters to configure its AI
            receptionist.
          </li>
          <li>
            <strong>Call data</strong> — caller phone number, call time and
            duration, and, where enabled by the business, recordings and
            transcripts of calls handled by the AI receptionist.
          </li>
          <li>
            <strong>Messages</strong> — the content and delivery status of text
            messages sent and received through the platform, including consent
            and opt-out records.
          </li>
          <li>
            <strong>Payment information</strong> — handled by Stripe, our payment
            processor. We never see or store full card numbers.
          </li>
          <li>
            <strong>Usage and device data</strong> — log and device information,
            and cookies (including the session cookies that keep you signed in),
            used to operate, secure, and improve the service.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <ul className="mt-3 space-y-1.5">
          <li>To answer, route, transcribe, and summarize calls for the business you contacted</li>
          <li>To send appointment confirmations and follow-up messages you have consented to receive</li>
          <li>To operate dashboards, reporting, and billing for our business customers</li>
          <li>To prevent spam, fraud, and abuse, and to comply with legal obligations</li>
          <li>To improve reliability and quality of the service</li>
        </ul>
        <p className="mt-3">
          We do <strong>not</strong> sell personal information, and mobile
          numbers and SMS consent records are never shared with third parties for
          their own marketing.
        </p>
      </section>

      <section>
        <h2>4. Call recording and AI disclosure</h2>
        <p className="mt-3">
          Calls handled by the platform are answered by an AI assistant that
          identifies itself as such. Businesses using our platform are
          responsible for complying with call-recording consent laws that apply
          in their jurisdiction. Transcripts and recordings are stored encrypted
          and access is restricted by role.
        </p>
      </section>

      <section>
        <h2>5. Service providers</h2>
        <p className="mt-3">
          We rely on a small set of processors to run the service: Supabase
          (database and authentication), Vercel (hosting), Twilio (voice and SMS
          connectivity), Retell (real-time voice AI that powers the phone
          receptionist), OpenAI and similar AI providers (speech and language
          processing), Google (Calendar scheduling, when a business connects it),
          Resend (transactional email), and Stripe (payments). Each processes
          data only to provide its service to us.
        </p>
      </section>

      <section>
        <h2>6. Google Calendar data</h2>
        <p className="mt-3">
          When a business connects its Google Calendar, we request access to the
          calendar&rsquo;s busy/free times and the ability to create, update, and
          cancel events. We use this access <strong>solely</strong> to check
          availability and to schedule, reschedule, or cancel that
          business&rsquo;s appointments — never for advertising, and we never sell
          it. Tokens are stored encrypted and a business can disconnect at any
          time in Settings. Our use of information received from Google APIs
          adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-cyan hover:underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section>
        <h2>7. Retention</h2>
        <p className="mt-3">
          Call recordings, transcripts, and messages are retained according to
          the subscribing business&rsquo;s plan and settings, and deleted or
          anonymized when no longer needed. Businesses can request deletion of
          their data by contacting support.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p className="mt-3">
          Data is encrypted in transit and at rest. Customer data is separated
          per business with database-level row isolation, and sensitive fields
          such as raw transcripts are additionally encrypted. No method of
          transmission or storage is 100% secure, but we treat protecting your
          information as a core product requirement.
        </p>
      </section>

      <section>
        <h2>9. Your choices</h2>
        <ul className="mt-3 space-y-1.5">
          <li>Reply STOP to any text to stop receiving messages; reply HELP for help</li>
          <li>Ask the business you contacted, or our support team, to access or delete your information</li>
          <li>Business customers can export or delete their account data via support</li>
        </ul>
      </section>

      <section>
        <h2>10. Children</h2>
        <p className="mt-3">
          The service is intended for business use and is not directed to
          children under 13. We do not knowingly collect information from
          children.
        </p>
      </section>

      <section>
        <h2>11. Changes and contact</h2>
        <p className="mt-3">
          We may update this policy as the service evolves; the current version
          and effective date always appear on this page. Questions, access
          requests, or deletion requests: email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalShell>
  );
}
