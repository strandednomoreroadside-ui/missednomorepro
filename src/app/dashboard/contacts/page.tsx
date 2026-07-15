import type { Metadata } from "next";
import Link from "next/link";
import { Search, Upload, UserPlus } from "lucide-react";

import { FormBanner } from "@/components/form-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireActiveOrg } from "@/lib/auth";
import { getBusinessTimezone } from "@/lib/business/timezone";
import { formatDateInZone } from "@/lib/calendar/timezone";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

import { createContact } from "./actions";

export const metadata: Metadata = { title: "Contacts" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ContactRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  consent_sms: boolean;
  created_at: string;
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tag = typeof sp.tag === "string" ? sp.tag.trim() : "";
  const error = typeof sp.error === "string" ? sp.error : null;
  const deleted = sp.deleted === "1";

  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const tz = await getBusinessTimezone(active.organization_id);

  let query = supabase
    .from("contacts")
    .select("id, name, phone, email, tags, consent_sms, created_at")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    // Match by name, or by phone when the search looks like a number.
    const digits = q.replace(/\D/g, "");
    const safe = q.replace(/[%_,()]/g, " ").trim();
    query =
      digits.length >= 4
        ? query.or(`name.ilike.%${safe}%,phone.like.%${digits}%`)
        : query.ilike("name", `%${safe}%`);
  }
  if (tag) query = query.contains("tags", [tag]);

  const { data, error: queryErr } = await query;
  if (queryErr) throw new Error(`Failed to load contacts: ${queryErr.message}`);
  const contacts = (data ?? []) as ContactRow[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every caller becomes a contact with history — this is your business&rsquo;s memory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2" role="search">
            <Label htmlFor="q" className="sr-only">
              Search by name or phone
            </Label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search name or phone…"
              className="w-64"
            />
            <Button type="submit" variant="outline" size="sm" aria-label="Search">
              <Search className="size-4" aria-hidden />
            </Button>
          </form>
          <Link href="/dashboard/contacts/import">
            <Button type="button" variant="outline" size="sm">
              <Upload className="size-4" aria-hidden />
              Import
            </Button>
          </Link>
        </div>
      </div>

      {error && <div className="mt-5"><FormBanner kind="error">{error}</FormBanner></div>}
      {deleted && <div className="mt-5"><FormBanner kind="success">Contact deleted.</FormBanner></div>}

      {tag && (
        <p className="mt-4 text-sm text-muted-foreground">
          Filtering by tag{" "}
          <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-xs text-cyan">
            {tag}
          </span>{" "}
          —{" "}
          <Link href="/dashboard/contacts" className="text-cyan hover:underline">
            clear
          </Link>
        </p>
      )}

      <Card className="mt-6 bg-card/60">
        <CardContent className="pt-6">
          {contacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {q || tag
                ? "No contacts match — try a different search."
                : "No contacts yet. Add your first one below — the AI creates them automatically from calls too."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left font-mono text-[10px] uppercase tracking-widest text-steel">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Phone</th>
                    <th className="pb-2 pr-4">Tags</th>
                    <th className="pb-2 pr-4">Texts OK?</th>
                    <th className="pb-2">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-border/40">
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/dashboard/contacts/${c.id}`}
                          className="font-medium text-foreground hover:text-cyan"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {formatUsPhone(c.phone)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <Link
                              key={t}
                              href={`/dashboard/contacts?tag=${encodeURIComponent(t)}`}
                              className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-steel hover:border-cyan/50 hover:text-cyan"
                            >
                              {t}
                            </Link>
                          ))}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {c.consent_sms ? (
                          <span className="text-success">yes</span>
                        ) : (
                          <span className="text-steel">no</span>
                        )}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {formatDateInZone(c.created_at, tz)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <UserPlus className="size-4 text-cyan" aria-hidden />
            Add a contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Customer data, not the signed-in user's — keep autofill out */}
          <form action={createContact} autoComplete="off" className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name *</Label>
              <Input id="new-name" name="name" required maxLength={160} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone</Label>
              <Input id="new-phone" name="phone" type="tel" placeholder="(440) 555-0123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Address</Label>
              <Input id="new-address" name="address" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Add contact</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
