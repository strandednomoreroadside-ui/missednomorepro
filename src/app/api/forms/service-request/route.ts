import { NextResponse } from "next/server";

import { ingestServiceRequestForm } from "@/lib/forms/service-request";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY_BYTES = 16_384;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(request: Request) {
  const token = request.headers.get("x-mnm-form-token")?.trim() ?? "";
  if (!token) return json({ ok: false, error: "forbidden" }, 403);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  }

  const raw = await request.text();
  if (!raw || raw.length > MAX_BODY_BYTES) return json({ ok: false, error: "bad_request" }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const admin = createAdminClient();
  const result = await ingestServiceRequestForm(admin, token, payload);

  if (!result.ok) {
    if (result.reason === "invalid_token") return json({ ok: false, error: "forbidden" }, 403);
    if (result.reason === "invalid_payload" || result.reason === "invalid_phone") {
      return json({ ok: false, error: "bad_request" }, 400);
    }
    return json({ ok: false, error: "processing_failed" }, 500);
  }

  return json({
    ok: true,
    duplicate: result.duplicate ?? false,
  });
}
