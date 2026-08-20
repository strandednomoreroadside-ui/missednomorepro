import type { Metadata } from "next";

import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink } from "@/components/landing/primitives";
import { ArrowRight } from "lucide-react";

const TITLE = "Changelog";
const DESCRIPTION =
  "What's shipped in Missed No More Pro, dated, in the founder's own words — the AI receptionist, CRM, and business assistant as it's actually being built.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/changelog" },
  openGraph: { title: `${TITLE} · Missed No More Pro`, description: DESCRIPTION, url: "/changelog" },
  twitter: { card: "summary_large_image", title: `${TITLE} · Missed No More Pro`, description: DESCRIPTION },
};

type Entry = { date: string; title: string; body: string };

// Real, dated, shipped work — newest first. Written for the person deciding
// whether this thing is actually being built, not a marketing recap.
const ENTRIES: Entry[] = [
  {
    date: "2026-08-15",
    title: "Sharper pricing, honest comparisons",
    body: "Rewrote the pricing page and rebuilt /about to actually say something, added FAQ schema so AI assistants can read our FAQ directly, and published side-by-side pages against Hexnut and human answering services — with the parts where they still beat us left in, not hidden.",
  },
  {
    date: "2026-07-24",
    title: "You can call it and hear it",
    body: "Put up a public demo line — (440) 644-2423 — running a real (non-roadside) business so anyone can call and talk to the AI before signing up for anything. Also fixed a real bug: the call script was asking every business about \"the vehicle,\" even HVAC and cleaning companies, left over from when this only ran on a roadside-assistance line.",
  },
  {
    date: "2026-07-23",
    title: "Founding offer widened to 10 spots",
    body: "The first 10 businesses to become paying customers get every current and future paid add-on free, for as long as their subscription stays active. Was 5 spots, widened to 10.",
  },
  {
    date: "2026-06-26",
    title: "Zapier, weekly recap emails, uptime monitoring",
    body: "Professional-plan businesses can now push leads, bookings, completed jobs, and payments to Zapier or any webhook URL. Everyone active gets a Monday recap email of what their AI did that week. Added a public health check so an outage gets caught fast.",
  },
  {
    date: "2026-06-25",
    title: "Hear your own AI on your own phone",
    body: "Added \"Test my AI\" — a button in the dashboard that calls YOUR phone and bridges you to your own AI receptionist, so you can hear exactly what your customers hear before you ever go live. Also: businesses can now claim their own local phone number in-app instead of waiting on us to assign one, and Stripe went live — this is a real product charging real cards now, not a demo.",
  },
  {
    date: "2026-06-24",
    title: "Free trial, real onboarding",
    body: "Every plan now starts with a 7-day free trial (card required, capped voice minutes so a trial can't run up a bill). The setup wizard got a home-base address and service-radius step, and you can upload an existing price sheet or FAQ doc instead of typing everything in by hand.",
  },
  {
    date: "2026-06-21",
    title: "The beta gate: kill switch, cost caps, real usage alerts",
    body: "Added an owner-facing AI on/off switch and hard spend caps — if a business ever approaches a cost limit, calls forward straight to the owner's phone instead of racking up a bill. Usage alerts and billing receipts now go out by text and email.",
  },
  {
    date: "2026-06-16",
    title: "The AI stopped guessing prices",
    body: "This is the one we'd point to first: the AI no longer estimates or guesses a price on a call. Every quote is computed server-side from your own rate sheet plus real driving distance to the job, and read back to the caller exact, to the dollar.",
  },
  {
    date: "2026-06-15",
    title: "Live transfer to a real person",
    body: "When a caller is upset, or asks for a human, or the situation is outside what the AI should handle alone, it now warm-transfers to your team — briefing them on who's calling and why first, so the caller never has to repeat themselves.",
  },
  {
    date: "2026-06-14",
    title: "Booking on your actual calendar, and texting that doesn't spam",
    body: "The AI can now check your real Google Calendar availability and book appointments directly — no double-booking, no booking outside your hours. Also shipped the SMS system: missed-call text-back, STOP/HELP compliance, and a suppression list so anyone who opts out never gets texted again, even a transactional message.",
  },
  {
    date: "2026-06-13",
    title: "The AI receptionist goes live",
    body: "The core of the product: a voice AI that answers your business phone 24/7, in your business's name, and never claims to be human. Every call gets logged with a transcript and a summary. This is the version that first went live answering real calls for a real roadside-assistance business.",
  },
];

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
          Changelog
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          What&rsquo;s actually shipped.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          No press releases, no roadmap slides — just dated entries for what changed, in plain
          language, as we build this in the open.
        </p>

        <ol className="mt-12 space-y-10 border-l border-border/70 pl-8">
          {ENTRIES.map((entry) => (
            <li key={entry.date} className="relative">
              <span
                className="absolute -left-[calc(2rem+5px)] top-1.5 size-2.5 rounded-full border-2 border-night bg-cyan"
                aria-hidden
              />
              <time
                dateTime={entry.date}
                className="font-mono text-xs uppercase tracking-widest text-steel"
              >
                {entry.date}
              </time>
              <h2 className="mt-1.5 font-display text-xl font-semibold text-foreground">
                {entry.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{entry.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </MarketingShell>
  );
}
