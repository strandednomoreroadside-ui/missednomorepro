import Link from "next/link";
import { ArrowRight, Check, PhoneCall } from "lucide-react";

import { PLAN_META, SELF_SERVE_PLAN_ORDER } from "@/lib/billing/plans";
import { DEMO_PHONE_E164 } from "@/lib/constants";
import type { Category, Niche } from "@/lib/setup/niches";
import { JsonLd, SITE_URL, breadcrumbJsonLd } from "@/lib/seo";

import { ComparisonTable, type ComparisonRow } from "../comparison-table";
import { Faq } from "../faq";
import { MarketingShell } from "../marketing-shell";
import { ButtonLink } from "../primitives";
import { VARIANT_CONTENT } from "./content";
import { inSentence, marketedNiches, nicheHref, titleCase, variantsOf } from "./links";
import type { NicheContent } from "./types";

export function nicheH1(niche: Niche): string {
  return `AI Receptionist for ${titleCase(niche.name)}`;
}

/** Generated /industries/[category]/[niche] page. */
export function NichePage({
  niche,
  category,
  content,
}: {
  niche: Niche;
  category: Category;
  content: NicheContent;
}) {
  const path = `/industries/${category.id}/${niche.slug}`;
  const h1 = nicheH1(niche);
  const who = inSentence(niche.name);
  const onsite = niche.mode !== "office";
  const booking = content.booking ?? "appointments";
  const variants = variantsOf(niche.slug);
  const siblings = marketedNiches(category.id).filter(
    (n) => n.slug !== niche.slug && !n.partOf && nicheHref(n)
  );
  const minPrice = Math.min(...SELF_SERVE_PLAN_ORDER.map((id) => PLAN_META[id].monthly));

  const rows: ComparisonRow[] = [
    { label: "Answers every call 24/7 in your business name", values: [true, true, false] },
    content.quotes
      ? { label: "Quotes exact prices from your approved rates", values: [true, false, false] }
      : onsite
        ? { label: "Never guesses a price or makes a promise you didn't approve", values: [true, "Maybe", false] }
        : { label: "Quotes exact prices from your service menu", values: [true, false, false] },
    { label: `Books ${booking} into open calendar times`, values: [true, "Maybe", false] },
    content.urgent
      ? { label: "Texts your on-call person on urgent calls", values: [true, "Maybe", false] }
      : { label: "Texts your team when a real lead calls", values: [true, "Maybe", false] },
    onsite
      ? { label: "Checks the caller is inside your service area", values: [true, "Maybe", false] }
      : { label: "Answers your policy questions in your words", values: [true, "Maybe", false] },
    { label: "Logs every caller, transcript, and summary in a CRM", values: [true, false, false] },
    { label: "Monthly cost", values: [`from $${minPrice}`, "$300+", "$0"] },
  ];

  const faqs = [
    ...content.faqs,
    {
      q: `How much does an AI receptionist for ${who} cost?`,
      a: `Missed No More Pro plans start at $${minPrice} per month for ${PLAN_META.starter.minutes}, with a 7-day free trial. Every plan is a hard cap, so there are no overage charges: if you reach your limit, calls forward to your phone.`,
    },
  ];

  return (
    <MarketingShell>
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${SITE_URL}${path}#webpage`,
              url: `${SITE_URL}${path}`,
              name: h1,
              description: content.hook,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              about: { "@id": `${SITE_URL}${path}#service` },
            },
            {
              "@type": "Service",
              "@id": `${SITE_URL}${path}#service`,
              name: h1,
              serviceType: "AI receptionist",
              provider: { "@id": `${SITE_URL}/#org` },
              areaServed: { "@type": "Country", name: "United States" },
              audience: {
                "@type": "BusinessAudience",
                audienceType: [niche.name, ...variants.map((v) => v.name)].join(", "),
              },
              description: content.hook,
            },
            breadcrumbJsonLd([
              { name: "Industries", path: "/industries" },
              { name: category.name, path: `/industries/${category.id}` },
              { name: titleCase(niche.name), path },
            ]),
          ],
        }}
      />

      <section className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
        <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.2em] text-steel">
          <Link href="/industries" className="hover:text-foreground">
            Industries
          </Link>
          <span aria-hidden> / </span>
          <Link href={`/industries/${category.id}`} className="text-cyan hover:text-foreground">
            {category.name}
          </Link>
        </nav>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{content.hook}</p>
        {variants.length > 0 && (
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Also built for{" "}
            {variants.map((v, i) => (
              <span key={v.slug}>
                {i > 0 && (i === variants.length - 1 ? " and " : ", ")}
                <a href={`#${v.slug}`} className="text-foreground underline underline-offset-4 hover:text-primary">
                  {inSentence(v.name)}
                </a>
              </span>
            ))}
            .
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href={`tel:${DEMO_PHONE_E164}`} variant="outline" large>
            <PhoneCall className="size-4" aria-hidden /> Call the live demo
          </ButtonLink>
        </div>
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-steel">
          Plans from ${minPrice}/mo · 7-day free trial · no overage charges
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Calls it handles for {who}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {content.calls.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl border border-border bg-card/55 p-4">
              <Check className="mt-0.5 size-4 shrink-0 text-cyan" strokeWidth={3} aria-hidden />
              <span className="text-sm font-medium text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-4xl space-y-10 px-6 pb-16">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            What calls look like for {who}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{content.why}</p>
        </div>

        {content.quotes ? (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Exact prices for the jobs you quote by phone
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Set your prices for {content.quotes}, plus travel zones by driving distance and an
              after-hours fee if you charge one. The AI reads back one exact total computed from
              those rules and mentions charges that depend on the job instead of adding them
              silently. It never makes up a number.
            </p>
          </div>
        ) : !onsite ? (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Exact prices from your service menu
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Add your service menu and approve it, and the AI tells callers the exact total for
              what they want, including several services at once, computed straight from your
              prices. Time-based charges you set, like an evening rate, are added automatically,
              and charges that depend on the job are mentioned instead of added silently. It never
              guesses a number. Until your prices are approved, it takes the caller&apos;s number so
              your team can text the price.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Prices are never guessed</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              When a caller asks what something costs, the AI never guesses or offers a ballpark. It
              takes their name and number so your team can follow up with the exact price.
            </p>
          </div>
        )}

        {content.estimates && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              The details your team needs
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              For {content.estimates}, the AI captures what the caller needs and the best callback
              number, then alerts your team so nothing sits in voicemail.
            </p>
          </div>
        )}

        {content.urgent && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Urgent calls texted to your team right away
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              When a caller has {content.urgent}, the AI takes the address and callback number,
              texts your on-call person right away, and can text the caller a confirmation with an
              estimated arrival time. Callers who want a person can be warm-transferred to your team.
            </p>
          </div>
        )}

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {booking[0].toUpperCase() + booking.slice(1)} booked, reminders sent
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Connect Google Calendar and the AI books {booking} into open times inside your hours
            without double-booking, then texts a confirmation and a reminder. Each service can have
            its own appointment length, so the AI only offers times where the whole appointment
            fits. Callers can call back to cancel or reschedule.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Every call in one place</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Each call is logged in the built-in CRM with a transcript and summary, and returning
            callers are greeted by name.
            {onsite
              ? " The AI checks each caller against the service radius you set, so out-of-area calls don't turn into wasted trips."
              : " It never asks callers for a street address, since they aren't expecting anyone to come out."}{" "}
            Sales pitches and robocalls are screened out.
          </p>
        </div>

        {variants.map((v) => (
          <div key={v.slug} id={v.slug} className="scroll-mt-28">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {VARIANT_CONTENT[v.slug].title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {VARIANT_CONTENT[v.slug].body}
            </p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          AI receptionist vs. answering service vs. voicemail
        </h2>
        <ComparisonTable cols={["Missed No More Pro", "Answering service", "Voicemail"]} rows={rows} />
      </section>

      <Faq items={faqs} id="faq" title={`AI receptionist for ${who}: questions`} />

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">Stop sending calls to voicemail.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start a 7-day free trial. Card required, cancel anytime before it ends.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/signup" large>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          {siblings.length > 0 && (
            <p className="mt-10 text-sm text-muted-foreground">
              More in{" "}
              <Link className="text-foreground underline underline-offset-4 hover:text-primary" href={`/industries/${category.id}`}>
                {category.name}
              </Link>
              :{" "}
              {siblings.map((s, i) => (
                <span key={s.slug}>
                  {i > 0 && " · "}
                  <Link className="text-foreground underline underline-offset-4 hover:text-primary" href={nicheHref(s)!}>
                    {titleCase(s.name)}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
