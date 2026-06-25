import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarCheck,
  Check,
  CreditCard,
  KanbanSquare,
  MessageSquareText,
  Minus,
  PhoneCall,
  Repeat2,
  Route,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Faq } from "@/components/landing/faq";
import { Pricing } from "@/components/landing/pricing";
import { ButtonLink, EARLY_ACCESS_MAILTO, SectionHeading } from "@/components/landing/primitives";
import { Reveal } from "@/components/landing/reveal";
import { CheckRow, ProductShowcase } from "@/components/landing/showcase";

const NICHES = [
  "Towing",
  "Roadside",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "Garage Doors",
  "Pest Control",
  "Landscaping",
  "Cleaning",
  "Locksmiths",
  "Mobile Mechanics",
  "Appliance Repair",
  "Handyman",
];

export default function LandingPage() {
  return (
    <div className="relative overflow-x-clip">
      <SiteHeader />
      <main>
        <Hero />
        <NicheMarquee />
        <MissedCallMath />
        <Showcase />
        <HowItWorks />
        <Pillars />
        <AddOns />
        <Integrations />
        <Comparison />
        <ProofBand />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const links = [
    ["#product", "Product"],
    ["#features", "Features"],
    ["#add-ons", "Add-ons"],
    ["#pricing", "Pricing"],
    ["#faq", "FAQ"],
  ] as const;
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-night/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" aria-label="Missed No More Pro — home">
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {links.map(([href, label]) => (
            <a key={href} className="transition-colors hover:text-foreground" href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {/* Mobile menu — native disclosure, no JS */}
          <details className="relative md:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border text-foreground [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open menu</span>
              <span className="flex flex-col gap-1" aria-hidden>
                <span className="h-0.5 w-5 bg-current" />
                <span className="h-0.5 w-5 bg-current" />
                <span className="h-0.5 w-5 bg-current" />
              </span>
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-popover p-2 shadow-xl">
              {links.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </div>
          </details>
          <ButtonLink href="/login" variant="outline" className="hidden sm:inline-flex">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup">Start free trial</ButtonLink>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="glow-field relative">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <div>
          <p
            className="animate-fade-up flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.22em] text-steel"
            style={{ animationDelay: "0ms" }}
          >
            <span className="font-semibold text-cyan">AI Receptionist</span>
            <span className="text-border" aria-hidden>
              /
            </span>
            <span>Smart CRM</span>
            <span className="text-border" aria-hidden>
              /
            </span>
            <span>AI Business Assistant</span>
          </p>
          <h1
            className="animate-fade-up mt-6 font-display text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl"
            style={{ animationDelay: "120ms" }}
          >
            Never miss
            <br />
            another call.
            <span className="text-gradient mt-3 block text-3xl font-semibold leading-tight sm:text-4xl">
              Every call answered.
              <br />
              Every lead captured.
            </span>
          </h1>
          <p
            className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "240ms" }}
          >
            Missed No More Pro answers your phones 24/7, qualifies the caller, quotes the exact
            price, books the job, and follows up by text — then shows you the revenue it saved.
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "360ms" }}
          >
            <ButtonLink href="/signup" large>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#product" variant="outline" large>
              See it in action
            </ButtonLink>
          </div>
          <p
            className="animate-fade-up mt-5 font-mono text-xs uppercase tracking-wider text-steel"
            style={{ animationDelay: "440ms" }}
          >
            A2P 10DLC-compliant · STOP/HELP built in · for 1–15 person teams
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-wrap gap-2"
            style={{ animationDelay: "520ms" }}
          >
            {NICHES.slice(0, 8).map((niche) => (
              <span
                key={niche}
                className="rounded-full border border-border/70 px-3 py-1 text-xs text-steel"
              >
                {niche}
              </span>
            ))}
          </div>
        </div>
        <LiveCallCard />
      </div>
    </section>
  );
}

function LiveCallCard() {
  return (
    <div
      className="animate-fade-up border-glow rounded-2xl p-6 shadow-[0_24px_80px_-24px_rgba(0,107,255,0.35)]"
      style={{ animationDelay: "200ms" }}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="animate-ring-wave absolute inline-flex size-full rounded-full bg-cyan" />
            <span className="animate-pulse-dot relative inline-flex size-2.5 rounded-full bg-cyan" />
          </span>
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-cyan">
            Live · Incoming call
          </span>
        </span>
        <span className="font-mono text-xs text-steel">(555) 014-2287</span>
      </div>

      <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
        <Bubble side="left" label="Caller">
          My AC just died and it&rsquo;s 95 degrees. Can anyone come out today?
        </Bubble>
        <Bubble side="right" label="AI receptionist">
          I&rsquo;m sorry to hear that — let&rsquo;s get it fixed fast. What&rsquo;s your ZIP code?
        </Bubble>
        <Bubble side="left" label="Caller">
          37214.
        </Bubble>
        <Bubble side="right" label="AI receptionist">
          You&rsquo;re in our service area. Our first opening is today at 2:30 PM — should I book it?
        </Bubble>
      </div>

      <div className="mt-5 space-y-2 border-t border-border/70 pt-5">
        <ProgressRow>Lead captured — name, number, address</ProgressRow>
        <ProgressRow>Appointment booked · Today 2:30 PM</ProgressRow>
        <ProgressRow>Technician notified by text</ProgressRow>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-night/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">Job saved while you worked</span>
        <span className="font-mono text-lg font-semibold text-success">+$385</span>
      </div>
    </div>
  );
}

function Bubble({
  side,
  label,
  children,
}: {
  side: "left" | "right";
  label: string;
  children: React.ReactNode;
}) {
  const isAi = side === "right";
  return (
    <div className={`flex ${isAi ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isAi
            ? "rounded-br-sm border border-cyan/25 bg-cyan/10 text-foreground"
            : "rounded-bl-sm bg-secondary/70 text-foreground"
        }`}
      >
        <span
          className={`mb-0.5 block font-mono text-[10px] uppercase tracking-widest ${
            isAi ? "text-cyan" : "text-steel"
          }`}
        >
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

function ProgressRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-success/40 bg-success/10">
        <Check className="size-3 text-success" strokeWidth={3} aria-hidden />
      </span>
      {children}
    </div>
  );
}

function NicheMarquee() {
  const row = [...NICHES, ...NICHES];
  return (
    <section className="border-y border-border/60 bg-navy/30 py-6">
      <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
        Built for local service pros
      </p>
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track flex w-max gap-3">
          {row.map((niche, i) => (
            <span
              key={`${niche}-${i}`}
              className="whitespace-nowrap rounded-full border border-border/70 bg-card/40 px-4 py-1.5 text-sm text-steel"
            >
              {niche}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MissedCallMath() {
  const stats = [
    ["80%", "of callers won't leave a voicemail — they just dial the next business"],
    ["24/7", "every call answered, including nights, weekends, and holidays"],
    ["1 job", "is usually all it takes to cover your entire monthly plan"],
  ] as const;
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <Reveal>
        <SectionHeading
          eyebrow="The math of a missed call"
          title="A missed call isn't a missed call. It's a booked job — for someone else."
        />
      </Reveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {stats.map(([big, small], i) => (
          <Reveal key={big} delay={i * 90}>
            <div className="rounded-2xl border border-border bg-card/50 p-6 text-center">
              <div className="font-mono text-4xl font-bold text-cyan">{big}</div>
              <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{small}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section id="product" className="border-t border-border/60 bg-navy/20">
      <div className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="See it in action"
            title="One system, from first ring to repeat customer"
            sub="Not a chatbot bolted onto a phone line — a full front office that answers, quotes, books, texts, and keeps the books."
          />
        </Reveal>
        <ProductShowcase />
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: PhoneCall,
      title: "Answers & qualifies",
      body: "Greets callers with your business name, spots spam, and captures who, what, and where — one question at a time.",
    },
    {
      icon: CalendarCheck,
      title: "Quotes & books",
      body: "Computes the exact price from your approved rates, checks real availability, and books inside the hours you allow.",
    },
    {
      icon: MessageSquareText,
      title: "Texts & follows up",
      body: "Instant confirmations, missed-call text-back, reminders, and staff alerts — fully STOP/HELP compliant out of the box.",
    },
    {
      icon: TrendingUp,
      title: "Proves the revenue",
      body: "Every call becomes a logged lead with a transcript, summary, and dollar value — so you see exactly what it saved.",
    },
  ];
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title="From missed ring to booked job"
          sub="Your AI front desk runs the whole play — you just do the work you get paid for."
        />
      </Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 80}>
            <div className="h-full rounded-xl border border-border bg-card/60 p-6 transition-colors hover:border-cyan/40">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue/80 to-cyan/80">
                  <step.icon className="size-5 text-white" aria-hidden />
                </span>
                <span className="font-mono text-xs text-steel">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Pillars() {
  const pillars = [
    {
      icon: PhoneCall,
      name: "AI Receptionist",
      tagline: "Answers every call, day or night.",
      features: [
        "24/7 natural-voice answering, trained on your business",
        "Smart booking, cancel & reschedule on your calendar",
        "Exact, computed quotes — never invented prices",
        "Missed-call text-back within seconds",
        "Spam shield + warm transfer to a real person",
      ],
    },
    {
      icon: Users,
      name: "Smart CRM",
      tagline: "Every caller becomes a tracked customer.",
      features: [
        "Auto-built contacts with full call & text history",
        "Lead pipeline that advances as the AI quotes & books",
        "Jobs, appointments & reminders in one place",
        "Payment requests, deposits & invoices by text",
        "Tamper-proof timeline for every interaction",
      ],
    },
    {
      icon: Bot,
      name: "AI Business Assistant",
      tagline: "Ask your business anything.",
      features: [
        "“How are we doing this week?” — answered instantly",
        "“Who still needs a follow-up?”",
        "Real analytics: answer rate, booking rate, revenue",
        "Knowledge Hub — upload a price sheet, we extract it",
        "Weekly call intelligence & recommendations",
      ],
    },
  ];
  return (
    <section id="features" className="border-t border-border/60 bg-navy/25">
      <div className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Everything you get"
            title="Three products in one subscription"
            sub="Built for owner-operators and small teams — not enterprise software you need a consultant to run."
          />
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.name} delay={i * 90}>
              <div className="flex h-full flex-col rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-cyan/40">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-cyan/25 bg-cyan/10">
                  <pillar.icon className="size-5.5 text-cyan" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold">{pillar.name}</h3>
                <p className="mt-1 text-sm text-steel">{pillar.tagline}</p>
                <ul className="mt-5 space-y-2.5 border-t border-border/70 pt-5">
                  {pillar.features.map((f) => (
                    <CheckRow key={f}>{f}</CheckRow>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AddOns() {
  // Mirrors the real catalog in src/lib/billing/addons.ts.
  const addons = [
    {
      icon: Repeat2,
      name: "AI Outbound Assistant",
      price: "+$49/mo",
      blurb: "Proactive texts that bring work back in — quote follow-ups, win-backs, reminders.",
    },
    {
      icon: MessageSquareText,
      name: "Omnichannel AI Chat",
      price: "+$29/mo",
      blurb: "One AI brain across website chat, two-way SMS, and a unified inbox.",
      badge: "New",
    },
    {
      icon: Bot,
      name: "AI Business Assistant",
      price: "+$39/mo",
      blurb: "Natural-language answers about your CRM — “who needs follow-up?”",
    },
    {
      icon: Sparkles,
      name: "AI Growth Suite",
      price: "+$100/mo",
      blurb: "All three growth add-ons bundled — save $17/mo.",
      badge: "Bundle",
    },
    {
      icon: Star,
      name: "AI Reputation Manager",
      price: "+$29/mo",
      blurb: "More 5-star reviews, fewer public 1-stars, AI-drafted responses.",
    },
    {
      icon: TrendingUp,
      name: "AI Call Intelligence",
      price: "+$19/mo",
      blurb: "A weekly read on what your calls are telling you, with recommendations.",
    },
  ];
  return (
    <section id="add-ons" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Add-ons"
          title="Bolt on more growth, only when you need it"
          sub="Optional modules that layer on any plan. Turn them on or off anytime."
        />
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {addons.map((addon, i) => (
          <Reveal key={addon.name} delay={(i % 3) * 80}>
            <div className="flex h-full flex-col rounded-xl border border-border bg-card/60 p-6 transition-colors hover:border-cyan/40">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-lg border border-cyan/25 bg-cyan/10">
                  <addon.icon className="size-5 text-cyan" aria-hidden />
                </span>
                {addon.badge && (
                  <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-cyan">
                    {addon.badge}
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{addon.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{addon.blurb}</p>
              <p className="mt-4 font-mono text-sm font-semibold text-cyan">{addon.price}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Integrations() {
  const tools = [
    { icon: CalendarCheck, label: "Google Calendar" },
    { icon: MessageSquareText, label: "Twilio" },
    { icon: CreditCard, label: "Stripe" },
    { icon: Workflow, label: "Make / Zapier" },
    { icon: Sparkles, label: "OpenAI" },
  ];
  return (
    <section className="border-y border-border/60 bg-navy/30">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
          Works with the tools you already use
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {tools.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/40 px-4 py-2.5 text-sm font-medium text-steel"
            >
              <t.icon className="size-4 text-cyan" aria-hidden />
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const cols = ["Missed No More Pro", "Voicemail", "Answering service", "In-house hire"];
  const rows: { label: string; values: (boolean | string)[] }[] = [
    { label: "Answers 24/7", values: [true, false, true, false] },
    { label: "Books jobs on your calendar", values: [true, false, false, true] },
    { label: "Quotes the exact price", values: [true, false, false, true] },
    { label: "Logs every lead in a CRM", values: [true, false, false, "Maybe"] },
    { label: "Follows up by text", values: [true, false, false, "Maybe"] },
    { label: "Never calls in sick", values: [true, true, true, false] },
    { label: "Monthly cost", values: ["from $99", "$0", "$300+", "$3,000+"] },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Why Missed No More Pro"
          title="The front desk, without the front-desk overhead"
        />
      </Reveal>
      <Reveal className="mt-12">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card/40">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-5 py-4 text-left font-medium text-muted-foreground">Capability</th>
                {cols.map((c, i) => (
                  <th
                    key={c}
                    className={`px-4 py-4 text-center font-display font-semibold ${
                      i === 0 ? "text-cyan" : "text-muted-foreground"
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/40 last:border-0">
                  <td className="px-5 py-3.5 text-left font-medium text-foreground">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3.5 text-center ${i === 0 ? "bg-cyan/5" : ""}`}
                    >
                      {typeof v === "boolean" ? (
                        v ? (
                          <Check className="mx-auto size-4 text-success" strokeWidth={3} aria-label="Yes" />
                        ) : (
                          <X className="mx-auto size-4 text-steel/50" aria-label="No" />
                        )
                      ) : (
                        <span
                          className={`font-mono text-xs ${i === 0 ? "font-semibold text-cyan" : "text-muted-foreground"}`}
                        >
                          {v}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}

function ProofBand() {
  return (
    <section className="border-t border-border/60 bg-navy/20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/5 px-3.5 py-1.5 text-xs font-medium text-cyan">
            <Sparkles className="size-3.5" aria-hidden />
            Early access — founding customers
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Built by an operator who got tired of missing calls.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Missed No More Pro runs live today on a real roadside-assistance business — answering
            calls, quoting tows and jumps to the dollar, booking jobs, and texting customers back.
            We&rsquo;re onboarding a small group of founding businesses now and building the roadmap
            with them.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={EARLY_ACCESS_MAILTO} large>
              Become a founding customer <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="border-glow rounded-2xl p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-steel">Live pilot</p>
            <div className="mt-4 space-y-3">
              <ProofStat icon={PhoneCall} label="Answering calls 24/7" value="Live now" />
              <ProofStat icon={Route} label="Exact quotes by driving distance" value="Per call" />
              <ProofStat icon={KanbanSquare} label="Leads tracked to booked jobs" value="Automatic" />
              <ProofStat icon={BellRing} label="Staff alerted on every lead" value="Instant" />
            </div>
            <p className="mt-5 border-t border-border/70 pt-4 text-xs leading-relaxed text-steel">
              Customer results vary. We&rsquo;ll publish verified outcomes as founding customers
              come online.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ProofStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon className="size-4 text-cyan" aria-hidden />
        {label}
      </span>
      <span className="font-mono text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function FinalCta() {
  return (
    <section className="glow-field border-t border-border/60">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center lg:py-28">
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Stop paying for <span className="text-gradient">missed calls.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Every unanswered ring is a job your competitor books. Put an AI front desk on your phones
          — and never wonder what that voicemail cost you.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-night">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The AI front office for local service businesses. Every call answered. Every lead
              captured.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-steel">Product</p>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="#product">
                Product
              </a>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="#features">
                Features
              </a>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="#add-ons">
                Add-ons
              </a>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="#pricing">
                Pricing
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-steel">Legal</p>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="/privacy">
                Privacy Policy
              </a>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="/terms">
                Terms of Service
              </a>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="/sms-terms">
                SMS Terms
              </a>
            </div>
          </nav>
        </div>
        <p className="mt-10 flex items-center gap-1.5 border-t border-border/60 pt-6 text-xs text-steel">
          <Minus className="size-3" aria-hidden />© 2026 Missed No More Pro. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
