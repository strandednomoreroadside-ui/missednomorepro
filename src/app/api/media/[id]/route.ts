import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Inbound-MMS photo proxy (Ph13). The bucket is private, so the browser
 * can't fetch it directly. We RLS-check that the signed-in user is a member
 * of the attachment's tenant (the user-scoped client only returns the row if
 * so), then stream the bytes from storage with the service-role client.
 */
const BUCKET = "mms-media";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // User-scoped: RLS returns the row only if the user can see this tenant.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: attachment } = await supabase
    .from("media_attachments")
    .select("storage_path, content_type")
    .eq("id", id)
    .maybeSingle();
  if (!attachment?.storage_path) return new Response("Not found", { status: 404 });

  // Authorized — pull the bytes with the service role (bucket is private).
  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage
    .from(BUCKET)
    .download(attachment.storage_path);
  if (error || !blob) return new Response("Unavailable", { status: 502 });

  return new Response(blob.stream(), {
    headers: {
      "Content-Type": attachment.content_type ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
