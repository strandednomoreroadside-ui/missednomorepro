import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, UploadCloud } from "lucide-react";

import { FormBanner } from "@/components/form-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { importContacts } from "./actions";

export const metadata: Metadata = { title: "Import contacts" };

export default async function ImportContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const imported = typeof sp.imported === "string" ? Number(sp.imported) : null;
  const duplicates = Number(sp.duplicates ?? 0);
  const skipped = Number(sp.skipped ?? 0);
  const phoneDropped = Number(sp.phone_dropped ?? 0);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Contacts
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
        Import contacts
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bring in a CSV export from your phone, an old CRM, or a spreadsheet.
        We&rsquo;ll match common column names automatically — you don&rsquo;t
        need to reformat anything.
      </p>

      {error && <div className="mt-5"><FormBanner kind="error">{error}</FormBanner></div>}
      {imported !== null && !error && (
        <div className="mt-5">
          <FormBanner kind="success">
            Imported {imported} contact{imported === 1 ? "" : "s"}.
            {duplicates > 0 && ` Skipped ${duplicates} already in your contacts.`}
            {skipped > 0 && ` Skipped ${skipped} row${skipped === 1 ? "" : "s"} with no usable name.`}
            {phoneDropped > 0 &&
              ` ${phoneDropped} contact${phoneDropped === 1 ? "" : "s"} imported without a phone number (couldn't read it as a US number).`}
          </FormBanner>
        </div>
      )}

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <UploadCloud className="size-4 text-cyan" aria-hidden />
            Upload a CSV
          </CardTitle>
          <CardDescription>
            Needs a header row with at least a name column (&ldquo;Name&rdquo;, or
            &ldquo;First name&rdquo;/&ldquo;Last name&rdquo;). We also read
            Phone, Email, Address, and Tags columns if present — under any of
            their common names (e.g. &ldquo;Mobile&rdquo;, &ldquo;Email
            address&rdquo;). Up to 2,000 contacts per file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importContacts} className="space-y-3">
            <input
              type="file"
              name="file"
              required
              accept=".csv,text/csv,text/plain"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-cyan/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan hover:file:bg-cyan/20"
            />
            <Button type="submit">Import contacts</Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-steel">
        Contacts with a phone number already in your CRM are skipped, so it&rsquo;s
        safe to import the same file twice. Imported contacts can&rsquo;t be
        texted until you turn on SMS consent for them — we never assume consent
        from a spreadsheet.
      </p>
    </div>
  );
}
