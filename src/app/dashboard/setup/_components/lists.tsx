import { Check, MapPin, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
  savePricingRule,
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

// ── Services ─────────────────────────────────────────────────────

export function ServicesStep({ data }: { data: SetupData }) {
  return (
    <div>
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

// ── Pricing rules ────────────────────────────────────────────────

export function PricingStep({ data }: { data: SetupData }) {
  const activeServices = data.services.filter((s) => s.active);
  const ruleFor = (serviceId: string) =>
    data.pricingRules.find((r) => r.service_id === serviceId && r.active);

  return (
    <div>
      <p className="rounded-lg border border-cyan/20 bg-cyan/5 px-3.5 py-3 text-xs leading-relaxed text-steel">
        Safety rule: the AI <span className="font-semibold text-foreground">never invents a price</span>.
        Until quoting unlocks at a later milestone, callers asking about price hear
        &ldquo;the owner will text you an exact quote&rdquo; — these numbers prepare for that day.
      </p>

      {activeServices.length === 0 ? (
        <Card className="mt-4 bg-card/60">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Add at least one service first — pricing rules attach to services.
          </CardContent>
        </Card>
      ) : (
        activeServices.map((s) => {
          const rule = ruleFor(s.id);
          const amount = rule?.config_json?.amount;
          return (
            <Card key={s.id} className="mt-4 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">
                  {s.name}
                  {rule && (
                    <span className="ml-2 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-sans text-xs font-normal text-success">
                      {rule.rule_type === "flat" ? "Flat" : "Starts at"} ${amount}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={savePricingRule} className="flex flex-wrap items-end gap-4">
                  <input type="hidden" name="service_id" value={s.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`type-${s.id}`}>Price type</Label>
                    <Select
                      id={`type-${s.id}`}
                      name="rule_type"
                      defaultValue={rule?.rule_type ?? "flat"}
                      className="w-40"
                    >
                      <option value="flat">Flat price</option>
                      <option value="base_fee">Starting at (base fee)</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`amount-${s.id}`}>Amount ($)</Label>
                    <Input
                      id={`amount-${s.id}`}
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={amount ?? ""}
                      className="w-32"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-2.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      name="auto_quote"
                      defaultChecked={rule ? !rule.requires_human_approval : false}
                      className="accent-cyan"
                    />
                    Let the AI share this price without my approval (later milestone)
                  </label>
                  <Button type="submit" variant="outline">
                    Save price
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })
      )}

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
            New-lead alerts go to these numbers. Until texting unlocks at a later
            milestone, alerts may arrive by other means — the list is ready either way.
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
