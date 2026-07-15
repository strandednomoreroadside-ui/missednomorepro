"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { parseTags } from "@/lib/contacts";
import { parseCsv } from "@/lib/csv";
import { normalizeUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_IMPORT_ROWS = 2000; // data rows — guards against a runaway import

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const NAME_ALIASES = new Set([
  "name", "full name", "contact name", "customer name", "client name",
]);
const FIRST_NAME_ALIASES = new Set(["first name", "firstname", "fname"]);
const LAST_NAME_ALIASES = new Set(["last name", "lastname", "lname", "surname"]);
const PHONE_ALIASES = new Set([
  "phone", "phone number", "mobile", "mobile phone", "cell", "cell phone",
  "telephone", "tel", "primary phone", "home phone",
]);
const EMAIL_ALIASES = new Set(["email", "email address", "e mail"]);
const ADDRESS_ALIASES = new Set([
  "address", "street address", "mailing address", "home address",
]);
const TAGS_ALIASES = new Set(["tags", "tag", "labels", "label"]);

type ColumnMap = {
  name: number | null;
  firstName: number | null;
  lastName: number | null;
  phone: number | null;
  email: number | null;
  address: number | null;
  tags: number | null;
};

function mapColumns(header: string[]): ColumnMap {
  const map: ColumnMap = {
    name: null,
    firstName: null,
    lastName: null,
    phone: null,
    email: null,
    address: null,
    tags: null,
  };
  header.forEach((raw, i) => {
    const h = normalizeHeader(raw);
    if (map.name === null && NAME_ALIASES.has(h)) map.name = i;
    else if (map.firstName === null && FIRST_NAME_ALIASES.has(h)) map.firstName = i;
    else if (map.lastName === null && LAST_NAME_ALIASES.has(h)) map.lastName = i;
    else if (map.phone === null && PHONE_ALIASES.has(h)) map.phone = i;
    else if (map.email === null && EMAIL_ALIASES.has(h)) map.email = i;
    else if (map.address === null && ADDRESS_ALIASES.has(h)) map.address = i;
    else if (map.tags === null && TAGS_ALIASES.has(h)) map.tags = i;
  });
  return map;
}

function cell(row: string[], idx: number | null): string {
  if (idx === null || idx >= row.length) return "";
  return (row[idx] ?? "").trim();
}

function failTo(message: string): never {
  redirect(`/dashboard/contacts/import?error=${encodeURIComponent(message)}`);
}

/**
 * Bulk-import contacts from a CSV export (phone/Google contacts, an old CRM,
 * a spreadsheet — whatever the owner has). Flexible header detection; no
 * consent is assumed for imported contacts (consent_sms stays false), so
 * they can't be texted until the owner opts them in per §8.3.
 */
export async function importContacts(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    failTo("Choose a CSV file to import.");
  }
  if (file.size > MAX_IMPORT_BYTES) {
    failTo("That file is too large (max 2 MB).");
  }

  const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    failTo(
      "That file doesn't look like a CSV with a header row and at least one contact."
    );
  }

  const [header, ...data] = rows;
  const cols = mapColumns(header);
  if (cols.name === null && cols.firstName === null) {
    failTo(
      'Couldn\'t find a name column. Include a "Name" column (or "First name"/"Last name").'
    );
  }

  const capped = data.slice(0, MAX_IMPORT_ROWS);

  type Draft = {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    tags: string[];
  };
  const drafts: Draft[] = [];
  let noName = 0;
  let phoneDropped = 0;
  let dupesInFile = 0;
  const seenPhones = new Set<string>();

  for (const row of capped) {
    if (row.every((c) => c.trim() === "")) continue; // blank row

    const first = cell(row, cols.firstName);
    const last = cell(row, cols.lastName);
    const name = (cell(row, cols.name) || [first, last].filter(Boolean).join(" ")).slice(
      0,
      160
    );
    if (!name) {
      noName++;
      continue;
    }

    let phone: string | null = null;
    const rawPhone = cell(row, cols.phone);
    if (rawPhone) {
      phone = normalizeUsPhone(rawPhone);
      if (!phone) phoneDropped++; // keep the contact, just drop the bad number
    }
    if (phone) {
      if (seenPhones.has(phone)) {
        dupesInFile++;
        continue; // first occurrence in the file wins
      }
      seenPhones.add(phone);
    }

    drafts.push({
      name,
      phone,
      email: cell(row, cols.email).slice(0, 320) || null,
      address: cell(row, cols.address).slice(0, 500) || null,
      tags: cols.tags !== null ? parseTags(cell(row, cols.tags)) : [],
    });
  }

  // Skip contacts whose phone already exists for this tenant — the existing
  // contact wins rather than silently overwriting curated data.
  const phonesToCheck = [
    ...new Set(drafts.map((d) => d.phone).filter((p): p is string => Boolean(p))),
  ];
  let existingPhones = new Set<string>();
  if (phonesToCheck.length > 0) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("phone")
      .eq("tenant_id", tenantId)
      .in("phone", phonesToCheck);
    existingPhones = new Set((existing ?? []).map((r) => r.phone as string));
  }

  const toInsert = drafts.filter((d) => !d.phone || !existingPhones.has(d.phone));
  const existingDupes = drafts.length - toInsert.length;

  let imported = 0;
  let failed = 0;
  if (toInsert.length > 0) {
    const rowsForInsert = toInsert.map((d) => ({
      tenant_id: tenantId,
      name: d.name,
      phone: d.phone,
      email: d.email,
      address: d.address,
      tags: d.tags,
    }));
    const { error } = await supabase.from("contacts").insert(rowsForInsert);
    if (!error) {
      imported = rowsForInsert.length;
    } else {
      // One bad/duplicate row (e.g. a race with a contact created moments
      // ago) shouldn't sink the whole batch — retry row by row.
      for (const r of rowsForInsert) {
        const { error: rowErr } = await supabase.from("contacts").insert(r);
        if (rowErr) failed++;
        else imported++;
      }
    }
  }

  revalidatePath("/dashboard/contacts");
  const params = new URLSearchParams({
    imported: String(imported),
    duplicates: String(existingDupes + dupesInFile),
    skipped: String(noName + failed),
    phone_dropped: String(phoneDropped),
  });
  redirect(`/dashboard/contacts/import?${params.toString()}`);
}
