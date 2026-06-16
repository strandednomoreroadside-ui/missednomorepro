import "server-only";

import { env } from "@/lib/env";

/**
 * Knowledge document extraction (Knowledge Hub).
 *
 * Turns an uploaded price sheet / FAQ document into STRUCTURED suggestions
 * the owner approves. The model only transcribes what is explicitly written
 * in the file — it never computes or guesses prices. Approved service rows
 * feed the deterministic calculate_quote engine; the LLM never reads prices
 * back from free text (preserves the §5.1 + §14 0%-hallucination gate).
 *
 * Raw fetch, no SDK — matches the Google client house style.
 */

const MODEL = "gpt-4.1-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type FaqSuggestion = { question: string; answer: string };

export type ServiceSuggestion = {
  name: string;
  pricing_type: "flat" | "tow";
  service_fee: number;
  /** Tow only — flat hook/connection fee. */
  hook_fee: number | null;
  /** Tow only — per-mile rate after free miles. */
  per_mile_rate: number | null;
  /** Tow only — miles included before per_mile_rate applies. */
  free_miles: number | null;
  /** "+ cost of <part>" services (tire/battery/fuel) — the part name. */
  variable_part: string | null;
};

export type ExtractionResult = {
  faqs: FaqSuggestion[];
  services: ServiceSuggestion[];
};

const SYSTEM_PROMPT = `You extract structured business knowledge from an uploaded document for a local service business (e.g. roadside assistance, towing, home services).

Return TWO things, only from what is EXPLICITLY written in the document:

1. faqs — common question/answer pairs a phone receptionist could use. Keep answers short and factual. Do not invent answers.

2. services — priced services. For each service:
   - name: what a caller would ask for (e.g. "Jump start", "Lockout", "Tow").
   - pricing_type: "tow" if priced by hook fee + per-mile, otherwise "flat".
   - service_fee: the flat fee in dollars (number). For tow services use 0.
   - hook_fee: tow only — the flat connection/hook fee. Otherwise null.
   - per_mile_rate: tow only — dollars per mile. Otherwise null.
   - free_miles: tow only — miles included before per-mile applies (0 if none stated). Otherwise null.
   - variable_part: for "+ cost of the part" services (tire/battery/fuel), the part name (e.g. "tire", "battery", "fuel"). Otherwise null.

Rules:
- NEVER invent or estimate a price. If a price is not clearly stated, do not include that service.
- Use plain numbers for money (45, not "$45.00").
- If the document has no FAQs, return an empty faqs array. If it has no priced services, return an empty services array.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
    },
    services: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          pricing_type: { type: "string", enum: ["flat", "tow"] },
          service_fee: { type: "number" },
          hook_fee: { type: ["number", "null"] },
          per_mile_rate: { type: ["number", "null"] },
          free_miles: { type: ["number", "null"] },
          variable_part: { type: ["string", "null"] },
        },
        required: [
          "name",
          "pricing_type",
          "service_fee",
          "hook_fee",
          "per_mile_rate",
          "free_miles",
          "variable_part",
        ],
      },
    },
  },
  required: ["faqs", "services"],
} as const;

const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_MIME_EXACT = ["application/csv", "application/json"];

function isTextMime(mime: string): boolean {
  return TEXT_MIME_PREFIXES.some((p) => mime.startsWith(p)) || TEXT_MIME_EXACT.includes(mime);
}

/** Build the user content part appropriate to the file type. */
function buildUserContent(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): unknown[] {
  const instruction = {
    type: "text",
    text: `Extract FAQs and priced services from this document ("${fileName}").`,
  };

  if (mimeType.startsWith("image/")) {
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
    return [instruction, { type: "image_url", image_url: { url: dataUrl } }];
  }

  if (mimeType === "application/pdf") {
    const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
    return [
      instruction,
      { type: "file", file: { filename: fileName, file_data: dataUrl } },
    ];
  }

  if (isTextMime(mimeType)) {
    const text = buffer.toString("utf8").slice(0, 100_000);
    return [{ type: "text", text: `${instruction.text}\n\n---\n${text}` }];
  }

  // Last resort: try to read it as text.
  const text = buffer.toString("utf8").slice(0, 100_000);
  return [{ type: "text", text: `${instruction.text}\n\n---\n${text}` }];
}

/** File types we accept for extraction. */
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/csv",
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function isExtractionConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY);
}

/**
 * Run the extraction pass. Throws on hard failure (caller marks the
 * document 'failed' and surfaces the message).
 */
export async function extractFromDocument(params: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<ExtractionResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const userContent = buildUserContent(
    params.buffer,
    params.mimeType || "application/octet-stream",
    params.fileName
  );

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "knowledge_extraction",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI extraction failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content.");

  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(content) as ExtractionResult;
  } catch {
    throw new Error("OpenAI returned malformed JSON.");
  }

  return sanitize(parsed);
}

/** Defensive normalisation — trim, clamp lengths, drop obviously empty rows. */
function sanitize(result: ExtractionResult): ExtractionResult {
  const faqs = (result.faqs ?? [])
    .map((f) => ({
      question: String(f.question ?? "").trim().slice(0, 300),
      answer: String(f.answer ?? "").trim().slice(0, 2000),
    }))
    .filter((f) => f.question && f.answer);

  const services = (result.services ?? [])
    .map((s) => {
      const pricing_type = s.pricing_type === "tow" ? "tow" : "flat";
      const num = (v: unknown): number | null =>
        typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
      return {
        name: String(s.name ?? "").trim().slice(0, 160),
        pricing_type,
        service_fee: num(s.service_fee) ?? 0,
        hook_fee: pricing_type === "tow" ? num(s.hook_fee) : null,
        per_mile_rate: pricing_type === "tow" ? num(s.per_mile_rate) : null,
        free_miles: pricing_type === "tow" ? num(s.free_miles) : null,
        variable_part: s.variable_part
          ? String(s.variable_part).trim().slice(0, 60)
          : null,
      } satisfies ServiceSuggestion;
    })
    .filter((s) => s.name);

  return { faqs, services };
}
