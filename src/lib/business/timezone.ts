import "server-only";

import { DEFAULT_TZ } from "@/lib/calendar/timezone";
import { createClient } from "@/lib/supabase/server";

/**
 * The active tenant's primary business timezone (IANA), used to render
 * dashboard timestamps in the operator's local time instead of the server's
 * (Vercel runs UTC). Falls back to Eastern. One cheap read per page.
 */
export async function getBusinessTimezone(tenantId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("timezone")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { timezone?: string | null } | null)?.timezone || DEFAULT_TZ;
}
