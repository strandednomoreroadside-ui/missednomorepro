import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PhoneForwarded, PhoneCall, Sparkles, Repeat } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Phone setup guide" };

const CARRIER_CODES: { mode: string; on: string; off: string }[] = [
  { mode: "Forward ALL calls", on: "*72 + number, press call", off: "*73" },
  { mode: "Forward when no answer", on: "*71 (or **61* + number + #)", off: "##61#" },
  { mode: "Forward when busy", on: "**67* + number + #", off: "##67#" },
];

export default function PhoneSetupGuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/numbers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-cyan"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to Numbers
      </Link>

      <h1 className="mt-3 flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <PhoneForwarded className="size-6 text-cyan" aria-hidden />
        Getting your phone set up
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your AI receptionist answers calls on a phone number. Pick the option that
        fits your business — both take about 5 minutes.
      </p>

      {/* Option A — new number (self-serve) */}
      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Sparkles className="size-4 text-cyan" aria-hidden />
            Option A — Get a brand-new number (simplest)
          </CardTitle>
          <CardDescription>
            Best for new businesses, a dedicated after-hours/overflow line, or
            anyone happy to advertise a new number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              On the{" "}
              <Link href="/dashboard/numbers" className="text-cyan hover:underline">
                Numbers
              </Link>{" "}
              page, search an area code and click <strong>Claim</strong> — it&rsquo;s
              set up instantly and included with your plan.
            </li>
            <li>
              Put it on your website, Google Business Profile, cards, truck wraps,
              and ads.
            </li>
            <li>Every call to it is answered by your AI receptionist, 24/7.</li>
          </ol>
          <p className="pt-1 text-xs text-steel">
            Already advertise a different number everywhere? Use Option B instead so
            you don&rsquo;t have to change your listings.
          </p>
        </CardContent>
      </Card>

      {/* Option B — keep your number (forwarding) */}
      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <PhoneForwarded className="size-4 text-cyan" aria-hidden />
            Option B — Keep your current number (call forwarding)
          </CardTitle>
          <CardDescription>
            Keep the number customers already know. You tell your carrier to forward
            calls to the number we gave you — your published number never changes.
            This is what most established businesses choose.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">1. Get your forwarding target</p>
            <p className="mt-0.5">
              On the{" "}
              <Link href="/dashboard/numbers" className="text-cyan hover:underline">
                Numbers
              </Link>{" "}
              page you&rsquo;ll see the number we gave you (e.g.{" "}
              <span className="font-mono text-foreground">+1 216 555 0142</span>).
              That&rsquo;s the number you forward <em>to</em>.
            </p>
          </div>

          <div>
            <p className="font-medium text-foreground">2. Pick how much the AI should handle</p>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="bg-night/40 text-steel">
                  <tr>
                    <th className="px-3 py-2 font-medium">Mode</th>
                    <th className="px-3 py-2 font-medium">What happens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Forward all calls</td>
                    <td className="px-3 py-2">
                      Every call goes straight to the AI — your full front desk.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">
                      When busy / no answer
                    </td>
                    <td className="px-3 py-2">
                      Your phone rings first; after ~4 rings (or if you&rsquo;re on a
                      call) it rolls to the AI as backup.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="font-medium text-foreground">3. Turn on forwarding with your carrier</p>
            <p className="mt-0.5">
              The easiest way: open your carrier&rsquo;s app (Verizon / AT&amp;T /
              T-Mobile) → <strong>Call Forwarding</strong> and paste the number — no
              codes needed. Or use these common dial codes (confirm with your
              carrier):
            </p>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="bg-night/40 text-steel">
                  <tr>
                    <th className="px-3 py-2 font-medium">Mode</th>
                    <th className="px-3 py-2 font-medium">Turn on</th>
                    <th className="px-3 py-2 font-medium">Turn off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {CARRIER_CODES.map((c) => (
                    <tr key={c.mode}>
                      <td className="px-3 py-2 font-medium text-foreground">{c.mode}</td>
                      <td className="px-3 py-2 font-mono">{c.on}</td>
                      <td className="px-3 py-2 font-mono">{c.off}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-steel">
              If a code doesn&rsquo;t work, call your carrier and ask them to
              &ldquo;forward my calls to &lt;your number from step 1&gt;.&rdquo;
              Landline / VoIP (RingCentral, Ooma, Spectrum): find Call Forwarding in
              your admin portal and point it at that number.
            </p>
          </div>

          <div>
            <p className="font-medium text-foreground">4. Test it</p>
            <p className="mt-0.5">
              Call your published number from another phone. The AI should pick up
              (immediately for &ldquo;forward all,&rdquo; or after a few rings for
              &ldquo;no answer&rdquo;), and the call appears under{" "}
              <Link href="/dashboard/calls" className="text-cyan hover:underline">
                Calls
              </Link>{" "}
              within a minute.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Option C — port */}
      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Repeat className="size-4 text-cyan" aria-hidden />
            Option C — Move (port) your number to us (later)
          </CardTitle>
          <CardDescription>
            Prefer we host your existing number directly, with no forwarding? We can
            transfer it.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Porting takes about <strong>1–2 weeks</strong>, your number keeps working
          the whole time, and we handle the paperwork. Email{" "}
          <a href="mailto:support@missednomorepro.com" className="text-cyan hover:underline">
            support@missednomorepro.com
          </a>{" "}
          to start.
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <PhoneCall className="size-4 text-cyan" aria-hidden />
            Frequently asked
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              Will I still see who called?
            </span>{" "}
            Yes — every call (AI-answered, forwarded, or missed) shows under Calls
            with a summary, and you get a text alert on new leads.
          </p>
          <p>
            <span className="font-medium text-foreground">
              Can I answer some calls myself?
            </span>{" "}
            Yes — use &ldquo;forward when busy / no answer&rdquo; so your phone rings
            first and the AI catches the ones you miss.
          </p>
          <p>
            <span className="font-medium text-foreground">
              What if I hit my plan&rsquo;s minutes?
            </span>{" "}
            Calls forward straight to your phone so nothing is missed, and we prompt
            you to upgrade — never a surprise overage charge.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
