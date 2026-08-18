import type { Metadata } from "next";

import { LegalShell } from "@/components/legal-shell";
import { GOVERNING_LAW_STATE, SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern use of the Missed No More Pro platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" effectiveDate="June 25, 2026">
      <section>
        <h2>1. The service</h2>
        <p className="mt-3">
          Missed No More Pro provides an AI receptionist and front-office
          platform for local service businesses: call answering, lead capture,
          appointment booking, text messaging, and related dashboard tools
          (the &ldquo;Service&rdquo;). By creating an account or using the
          Service you agree to these terms.
        </p>
      </section>

      <section>
        <h2>2. Accounts and acceptable use</h2>
        <ul className="mt-3 space-y-1.5">
          <li>You are responsible for your account credentials and for activity under your account.</li>
          <li>You may only message contacts who have consented, and you must honor opt-outs (STOP).</li>
          <li>
            You may not use the Service for unlawful, deceptive, or harassing
            communications, to impersonate humans where AI disclosure is
            required, or in violation of telemarketing and messaging laws (e.g.
            TCPA) and carrier policies.
          </li>
          <li>You may not attempt to access another customer&rsquo;s data or disrupt the Service.</li>
        </ul>
      </section>

      <section>
        <h2>3. AI limitations — important</h2>
        <p className="mt-3">
          The Service uses artificial intelligence. AI output can be imperfect.
          You are responsible for reviewing your configuration (pricing, hours,
          service area, booking rules) and for the business decisions made from
          AI-handled calls. The AI is designed to identify itself as an AI, to
          quote only from rules you approve, and to escalate when unsure —
          but the Service is <strong>not suitable for emergency calls (911)
          or life-safety situations</strong>, and we do not guarantee that every
          call will be answered or handled without error.
        </p>
      </section>

      <section>
        <h2>4. Billing</h2>
        <ul className="mt-3 space-y-1.5">
          <li>Plans are billed in advance monthly or annually via Stripe; usage allowances (minutes, texts) reset each billing cycle.</li>
          <li>New subscriptions may include a free trial. A payment method is required up front, and unless you cancel before the trial ends, the plan automatically converts to paid at the price shown when you subscribed — you can cancel during the trial from the billing portal at no charge.</li>
          <li>Plans are a hard cap: once a billing cycle&rsquo;s minutes are used, your AI receptionist pauses and inbound calls forward to your phone until you upgrade or the cycle resets — we do not bill surprise overage charges.</li>
          <li>You can cancel anytime from the billing portal; service continues to the end of the paid period.</li>
          <li>Telephone numbers, carrier fees, and registration fees (e.g. A2P 10DLC) may be passed through at cost.</li>
        </ul>
      </section>

      <section>
        <h2>5. Your data</h2>
        <p className="mt-3">
          You own your business data. You grant us the rights needed to operate
          the Service (e.g. storing transcripts, sending messages you direct).
          Our handling of personal information is described in the{" "}
          <a className="text-cyan underline-offset-4 hover:underline" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2>6. Disclaimers and liability</h2>
        <p className="mt-3">
          The Service is provided &ldquo;as is&rdquo; without warranties of any
          kind. To the maximum extent permitted by law, our total liability for
          any claim arising from the Service is limited to the amounts you paid
          us in the three months before the claim. We are not liable for
          indirect, incidental, or consequential damages, including lost
          profits or lost business opportunities from missed or mishandled
          calls.
        </p>
      </section>

      <section>
        <h2>7. Termination</h2>
        <p className="mt-3">
          You may stop using the Service at any time. We may suspend or
          terminate accounts that violate these terms, create legal or carrier
          compliance risk, or fail to pay. We will make reasonable efforts to
          let you export your data after termination.
        </p>
      </section>

      <section>
        <h2>8. Changes, governing law, contact</h2>
        <p className="mt-3">
          We may update these terms; material changes will be notified in the
          dashboard or by email, and the current version always appears on this
          page. These terms are governed by the laws of the State of{" "}
          {GOVERNING_LAW_STATE}, United States, without regard to its conflict-of-law
          rules. Questions: email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalShell>
  );
}
