import type { Metadata } from "next";
import Link from "next/link";
import { Contact, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

import { AddStaffForm } from "./add-staff-form";
import { removeStaffContact } from "./actions";
import { NotifyToggle } from "./notify-toggle";

export const metadata: Metadata = { title: "Staff" };

type StaffRow = { id: string; name: string; phone: string; notify_on_lead: boolean };

export default async function StaffPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data } = await supabase
    .from("staff_contacts")
    .select("id, name, phone, notify_on_lead")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true });
  const staff = (data ?? []) as StaffRow[];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <Contact className="size-6 text-cyan" aria-hidden />
        Staff
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The people who get new-lead and dispatch alerts. This is also the number list checked by
        the{" "}
        <Link href="/dashboard/settings#callback-ivr" className="text-cyan hover:underline">
          callback IVR
        </Link>{" "}
        (call your own business number to place a call) and the{" "}
        <Link href="/dashboard/dispatch" className="text-cyan hover:underline">
          Dispatch board
        </Link>
        .
      </p>

      <Card className="mt-6 bg-card/60">
        <CardContent className="pt-6">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one added yet — add someone below so leads and dispatch alerts have somewhere to go.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {staff.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatUsPhone(c.phone)}
                    </p>
                  </div>
                  <NotifyToggle id={c.id} defaultChecked={c.notify_on_lead} />
                  <form action={removeStaffContact}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${c.name}`}
                    >
                      <Trash2 className="size-4 text-steel" aria-hidden />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Add someone to notify</CardTitle>
          <CardDescription>
            New-lead and dispatch texts go to these numbers. Turn off &ldquo;Alerts&rdquo; for
            someone you still want listed (e.g. for the callback IVR or dispatch assignment)
            without texting them every lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddStaffForm />
        </CardContent>
      </Card>
    </div>
  );
}
