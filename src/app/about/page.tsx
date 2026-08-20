import type { Metadata } from "next";
import { ArrowRight, PhoneCall, Route, ShieldCheck } from "lucide-react";

import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink } from "@/components/landing/primitives";

const TITLE = "Why We Built an AI Receptionist for Service Businesses";
const DESCRIPTION =
  "Missed No More Pro was built by an operator who got tired of missing calls on the job. Here's why it exists and where it stands today.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `${TITLE} · Missed No More Pro`,
    description: DESCRIPTION,
    url: "/about",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · Missed No More Pro`,
    description: DESCRIPTION,
  },
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
          About
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Built by someone who missed too many calls.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Missed No More Pro started as a fix for one problem on one truck: the phone ringing
          while both hands were on a job, and no way to get to it in time.
        </p>

        {/* Founder photo/name/LinkedIn intentionally omitted — real identifying
            details (name, headshot, LinkedIn link) need to come from the
            operator; this section is written to slot them in without a
            rewrite once supplied. */}
        <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Where this started
          </h2>
          <p>
            The founder runs a real roadside-assistance business — the kind of work where
            you&rsquo;re under a hood or driving a tow when the next call comes in. Every ring
            that went unanswered was a job that went to whoever picked up first. Voicemail didn&rsquo;t
            fix it; most callers just hang up and call the next name on Google.
          </p>
          <p>
            So the first version of this wasn&rsquo;t a product — it was an AI receptionist built to
            answer that one business&rsquo;s phone, quote real jobs at the real price, and book them
            on the calendar. It&rsquo;s still running on that business today. Missed No More Pro is
            that same system, opened up for other local service owners with the same problem.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground">What we believe</h2>
          <ul className="grid gap-4 not-italic sm:grid-cols-3">
            <li className="rounded-xl border border-border bg-card/60 p-5">
              <PhoneCall className="size-5 text-cyan" aria-hidden />
              <p className="mt-3 font-medium text-foreground">Answer every call</p>
              <p className="mt-1 text-sm">
                No caller should hit voicemail because you&rsquo;re on a ladder.
              </p>
            </li>
            <li className="rounded-xl border border-border bg-card/60 p-5">
              <Route className="size-5 text-cyan" aria-hidden />
              <p className="mt-3 font-medium text-foreground">Never guess a price</p>
              <p className="mt-1 text-sm">
                An AI that quotes should compute the number from your real rates — not make one up.
              </p>
            </li>
            <li className="rounded-xl border border-border bg-card/60 p-5">
              <ShieldCheck className="size-5 text-cyan" aria-hidden />
              <p className="mt-3 font-medium text-foreground">Built for owner-operators</p>
              <p className="mt-1 text-sm">
                Not enterprise software you need a consultant to run — set up in about 15 minutes.
              </p>
            </li>
          </ul>

          <h2 className="font-display text-xl font-semibold text-foreground">
            Where we are today
          </h2>
          <p>
            We&rsquo;re early. Missed No More Pro is onboarding a small group of founding customers
            and building the roadmap with them. Customer results vary, and we&rsquo;ll publish
            verified outcomes as founding customers come online — we&rsquo;d rather say that plainly
            than dress up a pre-launch product with numbers we can&rsquo;t back up yet.
          </p>
        </div>

        <div className="mt-10">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </MarketingShell>
  );
}
