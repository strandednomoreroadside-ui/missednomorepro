import Link from "next/link";
import { Check, DollarSign, FileUp, MapPin, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SetupData } from "@/lib/setup/queries";

import {
  addFaq,
  addService,
  addServiceArea,
  addStaffContact,
  finishFaqs,
  finishNotifications,
  finishPricing,
  finishServiceArea,
  finishServices,
  removeFaq,
  removeService,
  removeServiceArea,
  removeStaffContact,
  saveHomeBase,
} from "../actions";

function RemoveButton({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" aria-label={label}>
        <Trash2 className="size-4 text-steel" aria-hidden />
      </Button>
    </form>
  );
}

function ContinueBar({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} className="mt-6">
      <Button type="submit">Continue</Button>
    </form>
  );
}

/**
 * Fast-setup shortcut: upload a file and let AI fill this step in, instead of
 * typing each row. Reuses the Knowledge Hub upload-and-extract flow (the AI
 * proposes structured rows the owner approves; §5.1 — prices are never invented,
 * the AI only transcribes what's written, and quoting still needs approval on
 * Prices & Services). `from=setup` makes that page link back here.
 */
function UploadHint({ kind }: { kind: "services" | "faqs" }) {
  const copy =
    kind === "services"
      ? {
          title: "Have a price sheet? Upload it instead of typing.",
          body: "Snap a photo or drop in a PDF/spreadsheet of your services and prices — AI reads it and proposes each one for you to approve. Much faster than adding them by hand.",
          include:
            "What to include: each service name with its price (e.g. “Jump start — $40”, “Tow — $60 hook + $2.50/mi”). Dispatch-zone fees and surcharges are set later on Prices & Services.",
        }
      : {
          title: "Have an FAQ sheet? Upload it instead of typing.",
          body: "Drop in a document of the questions customers ask and your answers — AI reads it and proposes Q&A pairs for you to approve.",
          include:
            "What to include: each question and the answer you’d want the AI to give (e.g. “Do you take credit cards? — Yes, all major cards, cash, and Zelle.”).",
        };
  return (
    <Card className="border-cyan/25 bg-cyan/5">
      <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10">
            <FileUp className="size-4 text-cyan" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">{copy.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-steel">{copy.include}</p>
          </div>
        </div>
        <Link
          href="/dashboard/knowledge/upload?from=setup"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Upload a file
        </Link>
      </CardContent>
    </Card>
  );
}

// ── Services ─────────────────────────────────────────────────────

export function ServicesStep({ data }: { data: SetupData }) {
  return (
    <div>
      <div className="mb-4">
        <UploadHint kind="services" />
      </div>

      {data.services.length > 0 && (
        <Card className="bg-card/60">
          <CardContent className="pt-6">
            <ul className="divide-y divide-border/40">
              {data.services.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    {s.description && (
                      <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                  <RemoveButton action={removeService} id={s.id} label={`Remove ${s.name}`} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Services that live in the pricing sheet (Prices & Services) — the AI
          already speaks these; shown here so the full list is visible. */}
      {data.pricedServiceNames.length > 0 && (
        <Card className="mt-4 border-cyan/20 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm text-steel">
              Also offered (from your Prices &amp; Services)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {data.pricedServiceNames.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-border/70 px-3 py-1 text-sm text-foreground"
                >
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-steel">
              Your AI already knows these — they come from your priced services. Manage
              their prices on{" "}
              <a
                href="/dashboard/pricing"
                className="text-cyan underline-offset-2 hover:underline"
              >
                Prices &amp; Services
              </a>
              . Add one here only if you want it listed without a price.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Add a service</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addService} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-name">Service name *</Label>
                <Input id="svc-name" name="name" placeholder="Jump start" required maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-desc">Short description</Label>
                <Input id="svc-desc" name="description" placeholder="Dead battery? We come to you." />
              </div>
            </div>
            <Button type="submit" variant="outline">
              Add service
            </Button>
          </form>
        </CardContent>
      </Card>

      <ContinueBar action={finishServices} />
    </div>
  );
}

// ── Pricing & quoting (informational — real setup is on /dashboard/pricing) ─

export function PricingStep({ data }: { data: SetupData }) {
  const approved = Boolean(data.pricingSettings?.approved_at);
  const activePricedCount = data.pricedServiceNames.length;

  return (
    <div>
      <p className="rounded-lg border border-cyan/20 bg-cyan/5 px-3.5 py-3 text-xs leading-relaxed text-steel">
        Safety rule: the AI <span className="font-semibold text-foreground">never invents a price</span>.
        Every number it ever says is computed from rates you set and approve — never guessed.
      </p>

      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <DollarSign className="size-4 text-cyan" aria-hidden />
            Prices &amp; Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approved ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/5 px-3.5 py-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden />
              <p className="text-xs text-foreground">
                Live quoting is on — your AI reads back exact, computed prices on calls and
                texts. Add, change, or approve rates anytime on Prices &amp; Services.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not set up yet. Until you approve pricing there, callers who ask about cost hear
              &ldquo;the owner will text you an exact quote&rdquo; — a safe default, not a
              broken one. Head to Prices &amp; Services whenever you&rsquo;re ready to turn on
              live quoting{activePricedCount > 0 ? ` (${activePricedCount} service${activePricedCount === 1 ? "" : "s"} already priced there)` : ""}.
            </p>
          )}
          <Link
            href="/dashboard/pricing"
            className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}
          >
            {approved ? "Manage prices" : "Set up Prices & Services"}
          </Link>
        </CardContent>
      </Card>

      <ContinueBar action={finishPricing} />
    </div>
  );
}

// ── Service area ─────────────────────────────────────────────────

export function AreaStep({ data }: { data: SetupData }) {
  const base = data.pricingSettings;
  const hasBase = Boolean(base?.base_address);
  const geocoded = base?.base_lat != null && base?.base_lng != null;
  // Default for a brand-new business; field-service trades typically travel
  // wider than the old 25-mi default, so we lead with 40 (editable).
  const radius = base?.max_service_miles ?? 40;

  return (
    <div>
      {/* Primary: home base + radius — the real coverage mechanism */}
      <Card className="border-cyan/25 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <MapPin className="size-4 text-cyan" aria-hidden />
            Home base &amp; service radius
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs leading-relaxed text-steel">
            Your shop or dispatch address. The AI measures coverage as{" "}
            <span className="text-foreground">driving miles from here</span> — anyone
            inside your radius is covered, anyone outside is politely declined. This is
            also the starting point for distance-based quotes.
          </p>

          {hasBase && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/5 px-3.5 py-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden />
              <p className="text-xs text-foreground">
                Covering <span className="font-mono text-cyan">{radius}</span> miles around{" "}
                <span className="font-medium">{base?.base_address}</span>.
                {!geocoded && (
                  <span className="text-steel">
                    {" "}
                    We couldn&rsquo;t pin it on the map — the ZIP/city list below is used
                    as the backup.
                  </span>
                )}
              </p>
            </div>
          )}

          <form action={saveHomeBase} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="base-address">Address *</Label>
              <Input
                id="base-address"
                name="base_address"
                placeholder="6466 Haviland Dr, Brook Park, OH 44142"
                defaultValue={base?.base_address ?? ""}
                required
                maxLength={300}
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="radius">Service radius (miles) *</Label>
                <Input
                  id="radius"
                  name="max_service_miles"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="200"
                  step="1"
                  defaultValue={radius}
                  className="w-32"
                  required
                />
              </div>
              <Button type="submit">{hasBase ? "Update coverage" : "Save coverage"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Secondary: ZIP/city allowlist — optional backup + no-maps fallback */}
      <div className="mt-6">
        <p className="mb-3 text-xs leading-relaxed text-steel">
          <span className="font-medium text-foreground">Specific ZIPs &amp; cities (optional).</span>{" "}
          Your radius above covers most callers automatically. These are a backup the AI
          falls back to if it can&rsquo;t place a caller on the map — we add your home city
          here for you.
        </p>

        {data.areas.length > 0 && (
          <Card className="bg-card/60">
            <CardContent className="pt-6">
              <ul className="flex flex-wrap gap-2">
                {data.areas.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-1 rounded-full border border-border/70 py-1 pl-3 pr-1 text-sm"
                  >
                    <span className="font-mono text-xs text-cyan">
                      {a.type === "zip" ? a.zip_code : `${a.city}, ${a.state}`}
                    </span>
                    <RemoveButton
                      action={removeServiceArea}
                      id={a.id}
                      label={`Remove ${a.type === "zip" ? a.zip_code : a.city}`}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Add a ZIP code</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addServiceArea} className="flex items-end gap-3">
                <input type="hidden" name="type" value="zip" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    name="zip_code"
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    placeholder="44060"
                    required
                  />
                </div>
                <Button type="submit" variant="outline">
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Add a city</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addServiceArea} className="flex items-end gap-3">
                <input type="hidden" name="type" value="city" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" placeholder="Mentor" required />
                </div>
                <div className="w-20 space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" placeholder="OH" maxLength={2} required />
                </div>
                <Button type="submit" variant="outline">
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ContinueBar action={finishServiceArea} />
    </div>
  );
}

// ── Staff notifications ──────────────────────────────────────────

export function NotificationsStep({ data }: { data: SetupData }) {
  return (
    <div>
      {data.staff.length > 0 && (
        <Card className="bg-card/60">
          <CardContent className="pt-6">
            <ul className="divide-y divide-border/40">
              {data.staff.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <RemoveButton action={removeStaffContact} id={c.id} label={`Remove ${c.name}`} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Add someone to notify</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addStaffContact} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 space-y-2 sm:max-w-56">
              <Label htmlFor="staff-name">Name *</Label>
              <Input id="staff-name" name="name" placeholder="Stran" required />
            </div>
            <div className="flex-1 space-y-2 sm:max-w-56">
              <Label htmlFor="staff-phone">Mobile number *</Label>
              <Input
                id="staff-phone"
                name="phone"
                type="tel"
                placeholder="(440) 555-0123"
                required
              />
            </div>
            <Button type="submit" variant="outline">
              Add
            </Button>
          </form>
          <p className="mt-3 text-xs text-steel">
            New-lead alerts text these numbers the moment a call comes in.
          </p>
        </CardContent>
      </Card>

      <ContinueBar action={finishNotifications} />
    </div>
  );
}

// ── FAQs ─────────────────────────────────────────────────────────

export function FaqsStep({ data }: { data: SetupData }) {
  return (
    <div>
      <div className="mb-4">
        <UploadHint kind="faqs" />
      </div>

      {data.faqs.length > 0 && (
        <Card className="bg-card/60">
          <CardContent className="pt-6">
            <ul className="divide-y divide-border/40">
              {data.faqs.map((f) => (
                <li key={f.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{f.question}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {f.answer}
                    </p>
                  </div>
                  <RemoveButton action={removeFaq} id={f.id} label="Remove FAQ" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Add a question &amp; answer</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addFaq} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-q">Question callers ask *</Label>
              <Input
                id="faq-q"
                name="question"
                placeholder="Do you take credit cards?"
                required
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-a">The answer the AI may give *</Label>
              <Textarea
                id="faq-a"
                name="answer"
                placeholder="Yes — we take all major cards, cash, and Zelle."
                required
                maxLength={2000}
              />
            </div>
            <Button type="submit" variant="outline">
              Add FAQ
            </Button>
          </form>
        </CardContent>
      </Card>

      <ContinueBar action={finishFaqs} />
    </div>
  );
}
