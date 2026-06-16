import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  Check,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";

// TODO(M1): point this at the real support inbox once the domain is purchased.
const EARLY_ACCESS_MAILTO =
  "mailto:hello@missednomorepro.com?subject=Early%20access%20request%20%E2%80%94%20Missed%20No%20More%20Pro";

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
        <PromiseStrip />
        <HowItWorks />
        <Features />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-night/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" aria-label="Missed No More Pro — home">
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a className="transition-colors hover:text-foreground" href="#how-it-works">
            How it works
          </a>
          <a className="transition-colors hover:text-foreground" href="#features">
            Features
          </a>
          <a className="transition-colors hover:text-foreground" href="#pricing">
            Pricing
          </a>
        </nav>
        <ButtonLink href={EARLY_ACCESS_MAILTO}>Get early access</ButtonLink>
      </div>
    </header>
  );
}

/**
 * Small helper: the header CTA is an anchor styled as a button. Kept local so
 * the shadcn Button stays standard.
 */
function ButtonLink({
  href,
  children,
  variant = "primary",
  large = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  large?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const size = large ? "h-12 rounded-xl px-7 text-base" : "h-9 px-4 text-sm";
  const look =
    variant === "primary"
      ? "bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--color-cyan)] hover:shadow-[0_0_36px_-4px_var(--color-cyan)] hover:brightness-110"
      : "border border-border bg-transparent text-foreground hover:border-cyan/50 hover:text-cyan";
  return (
    <a href={href} className={`${base} ${size} ${look}`}>
      {children}
    </a>
  );
}

function Hero() {
  return (
    <section id="top" className="glow-field relative">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <div>
          <p
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-cyan"
            style={{ animationDelay: "0ms" }}
          >
            <Zap className="size-3.5" aria-hidden />
            AI Receptionist + Business OS for local service pros
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
            Missed No More Pro answers your phones 24/7, qualifies the caller, books
            the job, and follows up by text — then shows you exactly how much
            revenue it saved.
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "360ms" }}
          >
            <ButtonLink href={EARLY_ACCESS_MAILTO} large>
              Get early access <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="outline" large>
              See how it works
            </ButtonLink>
          </div>
          <div
            className="animate-fade-up mt-10 flex flex-wrap gap-2"
            style={{ animationDelay: "480ms" }}
          >
            {NICHES.map((niche) => (
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
        <Bubble delay={500} side="left" label="Caller">
          My AC just died and it&rsquo;s 95 degrees. Can anyone come out today?
        </Bubble>
        <Bubble delay={900} side="right" label="AI receptionist">
          I&rsquo;m sorry to hear that — let&rsquo;s get it fixed fast. What&rsquo;s
          your ZIP code?
        </Bubble>
        <Bubble delay={1300} side="left" label="Caller">
          37214.
        </Bubble>
        <Bubble delay={1700} side="right" label="AI receptionist">
          You&rsquo;re in our service area. Our first opening is today at 2:30 PM —
          should I book it?
        </Bubble>
      </div>

      <div className="mt-5 space-y-2 border-t border-border/70 pt-5">
        <ProgressRow delay={2100}>Lead captured — name, number, address</ProgressRow>
        <ProgressRow delay={2350}>Appointment booked · Today 2:30 PM</ProgressRow>
        <ProgressRow delay={2600}>Technician notified by text</ProgressRow>
      </div>

      <div
        className="animate-fade-up mt-5 flex items-center justify-between rounded-xl bg-night/60 px-4 py-3"
        style={{ animationDelay: "2850ms" }}
      >
        <span className="text-sm text-muted-foreground">Job saved while you worked</span>
        <span className="font-mono text-lg font-semibold text-success">+$385</span>
      </div>
    </div>
  );
}

function Bubble({
  side,
  label,
  delay,
  children,
}: {
  side: "left" | "right";
  label: string;
  delay: number;
  children: React.ReactNode;
}) {
  const isAi = side === "right";
  return (
    <div
      className={`animate-fade-up flex ${isAi ? "justify-end" : "justify-start"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
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

function ProgressRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <div
      className="animate-fade-up flex items-center gap-2.5 text-sm text-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-success/40 bg-success/10">
        <Check className="size-3 text-success" strokeWidth={3} aria-hidden />
      </span>
      {children}
    </div>
  );
}

function PromiseStrip() {
  const stats = [
    ["24/7", "every call answered — nights, weekends, holidays"],
    ["100%", "of calls logged, transcribed, and summarized"],
    ["0", "voicemails left for you to chase"],
  ] as const;
  return (
    <section className="border-y border-border/60 bg-navy/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-3">
        {stats.map(([big, small]) => (
          <div key={big} className="text-center sm:text-left">
            <div className="font-mono text-3xl font-semibold text-cyan">{big}</div>
            <div className="mt-1 text-sm leading-snug text-muted-foreground">{small}</div>
          </div>
        ))}
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
      title: "Books the job",
      body: "Checks your service area and real calendar availability, then books inside the hours you approve. Never invents prices.",
    },
    {
      icon: MessageSquareText,
      title: "Texts & follows up",
      body: "Instant confirmations, missed-call text-back, and staff alerts — fully STOP/HELP compliant out of the box.",
    },
    {
      icon: TrendingUp,
      title: "Proves the revenue",
      body: "Every call becomes a logged lead with a transcript, summary, and dollar value — so you see exactly what it saved.",
    },
  ];
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
      <SectionHeading
        eyebrow="How it works"
        title="From missed ring to booked job"
        sub="Your AI front desk runs the whole play — you just do the work you get paid for."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-border bg-card/60 p-6 transition-colors hover:border-cyan/40"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue/80 to-cyan/80">
                <step.icon className="size-5 text-white" aria-hidden />
              </span>
              <span className="font-mono text-xs text-steel">0{i + 1}</span>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: PhoneCall,
      title: "24/7 AI receptionist",
      body: "Answers instantly in a natural voice, trained on your services, hours, and service area. Always discloses it's an AI.",
    },
    {
      icon: MessageSquareText,
      title: "Missed-call text-back",
      body: "Caller hangs up early? They get a text within seconds — before they dial your competitor.",
    },
    {
      icon: CalendarCheck,
      title: "Smart booking",
      body: "Connects to your calendar and books only inside approved windows. Emergencies follow your rules.",
    },
    {
      icon: Users,
      title: "Built-in CRM",
      body: "Every caller becomes a contact with full history — calls, texts, jobs, and notes on one timeline.",
    },
    {
      icon: ShieldCheck,
      title: "Spam shield",
      body: "Robocalls and vendors get screened out and logged, never forwarded to your cell at 7 AM.",
    },
    {
      icon: BellRing,
      title: "Instant staff alerts",
      body: "New lead, booked job, or urgent escalation — your team knows by text the moment it happens.",
    },
  ];
  return (
    <section id="features" className="border-t border-border/60 bg-navy/25">
      <div className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
        <SectionHeading
          eyebrow="Features"
          title="A front office that never sleeps"
          sub="Built for owner-operators and small teams — not enterprise software you need a consultant to run."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card/60 p-6 transition-colors hover:border-cyan/40"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg border border-cyan/25 bg-cyan/10">
                <feature.icon className="size-5 text-cyan" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "$99",
      blurb: "Solo operators who never want to miss a call",
      minutes: "250 AI minutes",
      extras: ["Booking, cancel & reschedule", "Human transfer + Google Calendar", "Review requests", "1 user"],
      popular: false,
    },
    {
      name: "Growth",
      price: "$199",
      blurb: "Teams that want more leads converted",
      minutes: "500 AI minutes",
      extras: ["Lead pipeline + timeline", "AI follow-ups & reminders", "Payment requests + analytics", "3 users"],
      popular: false,
    },
    {
      name: "Professional",
      price: "$349",
      blurb: "Growing teams that dispatch and need insight",
      minutes: "900 AI minutes",
      extras: ["Dispatch board + team calendar", "AI business insights", "Make/Zapier + website chat", "10 users"],
      popular: true,
    },
    {
      name: "Elite",
      price: "$599",
      blurb: "Multi-location operations at scale",
      minutes: "1,500 AI minutes",
      extras: ["Multiple locations & numbers", "Membership management", "API access", "25 users"],
      popular: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      blurb: "Large & multi-location organizations",
      minutes: "Custom minutes",
      extras: ["Dedicated onboarding", "Custom integrations", "Priority support"],
      popular: false,
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
      <SectionHeading
        eyebrow="Pricing"
        title="Plans that pay for themselves"
        sub="One recovered job usually covers the month. Annual billing saves 20%."
      />
      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-xl p-6 ${
              plan.popular
                ? "border-glow shadow-[0_16px_60px_-20px_rgba(0,229,255,0.4)]"
                : "border border-border bg-card/60"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">{plan.price}</span>
              {plan.price.startsWith("$") && (
                <span className="text-sm text-muted-foreground">/mo</span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plan.blurb}</p>
            <ul className="mt-4 flex-1 space-y-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-2 font-medium text-foreground">
                <Check className="size-3.5 shrink-0 text-cyan" strokeWidth={3} aria-hidden />
                {plan.minutes}
              </li>
              {plan.extras.map((extra) => (
                <li key={extra} className="flex items-center gap-2">
                  <Check className="size-3.5 shrink-0 text-cyan/70" strokeWidth={3} aria-hidden />
                  {extra}
                </li>
              ))}
            </ul>
            <a
              href={EARLY_ACCESS_MAILTO}
              className={`mt-5 inline-flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                plan.popular
                  ? "bg-primary text-primary-foreground hover:brightness-110"
                  : "border border-border text-foreground hover:border-cyan/50 hover:text-cyan"
              }`}
            >
              Get early access
            </a>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        All plans include call summaries, transcripts, SMS compliance (STOP/HELP), and
        usage protection — no surprise overages.
      </p>
    </section>
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
          Every unanswered ring is a job your competitor books. Put an AI front
          desk on your phones — and never wonder what that voicemail cost you.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href={EARLY_ACCESS_MAILTO} large>
            Get early access <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{sub}</p>
    </div>
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
              The AI front office for local service businesses. Every call
              answered. Every lead captured.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-steel">
                Product
              </p>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="#how-it-works">
                How it works
              </a>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="#features">
                Features
              </a>
              <a className="block text-muted-foreground transition-colors hover:text-foreground" href="#pricing">
                Pricing
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-steel">
                Legal
              </p>
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
        <p className="mt-10 border-t border-border/60 pt-6 text-xs text-steel">
          © 2026 Missed No More Pro. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
