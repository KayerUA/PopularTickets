import { z } from "zod";
import { DateTime } from "luxon";
import { GEMINI_EVENT_MODEL, GEMINI_EVENT_MODEL_FALLBACKS, getGeminiApiKey } from "@/lib/telegram/config";
import {
  buildGeminiEventParsePrompt,
  MIN_EVENT_DESCRIPTION_CHARS,
} from "@/lib/telegram/geminiEventPrompt";
import { POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import { normalizeEventLanguage } from "@/lib/eventLanguage";

const MIN_DESCRIPTION_CHARS = MIN_EVENT_DESCRIPTION_CHARS;

function coerceConfidence(v: unknown): "high" | "medium" | "low" | undefined {
  if (v === "high" || v === "medium" || v === "low") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (/high|высок|висок/.test(s)) return "high";
    if (/low|низк|низьк/.test(s)) return "low";
    if (/med|средн|середн/.test(s)) return "medium";
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v >= 3 || v >= 0.75) return "high";
    if (v >= 2 || v >= 0.45) return "medium";
    return "low";
  }
  return undefined;
}

function coerceNullableNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceNullableInt(v: unknown): number | null {
  const n = coerceNullableNumber(v);
  if (n == null) return null;
  return Math.round(n);
}

function ensureMinDescription(text: unknown, venue: string): string {
  const base = typeof text === "string" ? text.trim() : "";
  if (base.length >= MIN_DESCRIPTION_CHARS) return base.slice(0, 20000);
  const footer = `\n\n${venue}. Билеты онлайн — populartickets.pl · театр «Популярный поэт», Warszawa.`;
  let out = base || "Вечер импровизации и живого театра в театре «Популярный поэт» (Warszawa).";
  while (out.length < MIN_DESCRIPTION_CHARS) out += footer;
  return out.slice(0, 20000);
}

function extractJsonFromGeminiText(rawText: string): unknown {
  let t = rawText.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) t = fenced[1]!.trim();
  else if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  }

  const tryParse = (s: string): unknown => {
    const cleaned = s.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned);
  };

  try {
    return tryParse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return tryParse(t.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error("Gemini вернул невалидный JSON");
  }
}

function sanitizeGeminiPayload(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const o = { ...(input as Record<string, unknown>) };

  const confidence = coerceConfidence(o.confidence);
  if (confidence) o.confidence = confidence;
  else delete o.confidence;

  o.pricePln = coerceNullableNumber(o.pricePln);
  o.totalTickets = coerceNullableInt(o.totalTickets);

  rejectDateLeakage(o);

  if (typeof o.startsAtWarsaw === "string" && o.startsAtWarsaw.trim() === "") {
    o.startsAtWarsaw = null;
  }

  if (typeof o.listingKind === "string") {
    const lk = o.listingKind.toLowerCase();
    o.listingKind = lk.includes("trial") || lk.includes("проб") || lk.includes("prob") ? "trial" : "performance";
  }

  const venue =
    typeof o.venue === "string" && o.venue.trim().length >= 2
      ? o.venue.trim()
      : POPULAR_POET_TRIAL_VENUE_PL;
  o.venue = venue;

  o.description = ensureMinDescription(o.description, venue);
  o.descriptionPl = ensureMinDescription(o.descriptionPl, venue);
  o.descriptionUk = ensureMinDescription(o.descriptionUk, venue);

  delete o.notes;

  return o;
}

/** Gemini иногда подставляет день/час из даты как цену или места (19 мая → 19 PLN). */
function rejectDateLeakage(o: Record<string, unknown>): void {
  const starts = o.startsAtWarsaw;
  if (typeof starts !== "string") return;
  const dt = DateTime.fromFormat(starts, "yyyy-MM-dd'T'HH:mm", { zone: EVENT_ADMIN_TIMEZONE });
  if (!dt.isValid) return;
  const day = dt.day;
  const hour = dt.hour;
  const minute = dt.minute;
  for (const key of ["pricePln", "totalTickets"] as const) {
    const v = o[key];
    if (typeof v === "number" && (v === day || v === hour || v === minute)) {
      o[key] = null;
    }
  }
}

const RECENT_PAST_DAYS = 30;

/** Дата без года: не доверяем Gemini — нормализуем сами, предупреждаем по-русски. */
export function applyDatePolicy(raw: z.infer<typeof RawParsedSchema>): {
  previewNote?: string;
  forceDateClarification?: boolean;
} {
  const starts = raw.startsAtWarsaw;
  if (!starts) return {};

  const dt = DateTime.fromFormat(starts, "yyyy-MM-dd'T'HH:mm", { zone: EVENT_ADMIN_TIMEZONE });
  if (!dt.isValid) {
    raw.startsAtWarsaw = null;
    return { forceDateClarification: true, previewNote: "Не удалось разобрать дату — укажите явно, например: 23.05.2026 19:00" };
  }

  const now = DateTime.now().setZone(EVENT_ADMIN_TIMEZONE);
  const thisYear = dt.set({ year: now.year });

  if (thisYear < now) {
    const daysAgo = Math.floor(now.diff(thisYear, "days").days);
    if (daysAgo <= RECENT_PAST_DAYS) {
      raw.startsAtWarsaw = null;
      return {
        forceDateClarification: true,
        previewNote: `На афише ${thisYear.setLocale("ru").toFormat("d MMMM, HH:mm")} — это ${daysAgo} дн. назад. Укажите год и время, например: 19.05.2027 19:00`,
      };
    }
    const next = thisYear.plus({ years: 1 });
    raw.startsAtWarsaw = next.toFormat("yyyy-MM-dd'T'HH:mm");
    return {
      previewNote: `Без года на афише — поставил ${next.setLocale("ru").toFormat("d MMMM yyyy, HH:mm")}. Проверьте дату.`,
    };
  }

  if (dt < now) {
    raw.startsAtWarsaw = thisYear.toFormat("yyyy-MM-dd'T'HH:mm");
    return {
      previewNote: `Дата скорректирована на ${thisYear.setLocale("ru").toFormat("d MMMM yyyy, HH:mm")}. Проверьте перед публикацией.`,
    };
  }

  return {};
}

/** Ответ Gemini: null = в источнике не было — нужно спросить у админа. */
const RawParsedSchema = z.object({
  title: z.string().min(2).max(200),
  titlePl: z.string().min(2).max(200),
  titleUk: z.string().min(2).max(200),
  description: z.string().min(MIN_DESCRIPTION_CHARS).max(20000),
  descriptionPl: z.string().min(MIN_DESCRIPTION_CHARS).max(20000),
  descriptionUk: z.string().min(MIN_DESCRIPTION_CHARS).max(20000),
  startsAtWarsaw: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
  pricePln: z.number().positive().max(10000).nullable(),
  totalTickets: z.number().int().min(1).max(5000).nullable(),
  venue: z.string().min(2).max(200),
  listingKind: z.enum(["performance", "trial"]),
  eventLanguage: z.enum(["ru", "uk", "ru_uk", "pl", "en", "mixed"]),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  notes: z.string().max(500).optional(),
});

export type ParsedTelegramEvent = {
  title: string;
  titlePl: string;
  titleUk: string;
  description: string;
  descriptionPl: string;
  descriptionUk: string;
  startsAtWarsaw: string;
  pricePln: number;
  totalTickets: number;
  venue: string;
  listingKind: "performance" | "trial";
  eventLanguage: ReturnType<typeof normalizeEventLanguage>;
  confidence?: "high" | "medium" | "low";
  notes?: string;
};

export type ClarificationField = "startsAtWarsaw" | "pricePln" | "totalTickets";

const CLARIFICATION_LABELS: Record<ClarificationField, string> = {
  startsAtWarsaw: "дату и время (например: 23.05 19:00)",
  pricePln: "цену билета в PLN (например: 50)",
  totalTickets: "количество мест (например: 30)",
};

export function missingClarificationFields(raw: z.infer<typeof RawParsedSchema>): ClarificationField[] {
  const out: ClarificationField[] = [];
  if (!raw.startsAtWarsaw) out.push("startsAtWarsaw");
  if (raw.pricePln == null) out.push("pricePln");
  if (raw.totalTickets == null) out.push("totalTickets");
  return out;
}

export function clarificationQuestion(fields: ClarificationField[]): string {
  if (fields.length === 0) return "";
  const parts = fields.map((f) => CLARIFICATION_LABELS[f]);
  return `Уточните, пожалуйста: ${parts.join("; ")}.\nОтветьте одним сообщением.`;
}

export function applyClarificationReply(
  raw: z.infer<typeof RawParsedSchema>,
  replyText: string,
  fields: ClarificationField[],
): z.infer<typeof RawParsedSchema> {
  const text = replyText.trim();
  const next = { ...raw };
  let textForNums = text;

  if (fields.includes("startsAtWarsaw")) {
    const dm = text.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?:\s+(\d{1,2})[:.](\d{2}))?/);
    if (dm) {
      const day = dm[1]!.padStart(2, "0");
      const month = dm[2]!.padStart(2, "0");
      const year = dm[3]
        ? dm[3].length === 2
          ? `20${dm[3]}`
          : dm[3]
        : String(DateTime.now().setZone(EVENT_ADMIN_TIMEZONE).year);
      const hour = (dm[4] ?? "19").padStart(2, "0");
      const min = (dm[5] ?? "00").padStart(2, "0");
      next.startsAtWarsaw = `${year}-${month}-${day}T${hour}:${min}`;
      textForNums = text.replace(dm[0], " ");
    }
  }

  const numericFields = fields.filter((f): f is "pricePln" | "totalTickets" => f === "pricePln" || f === "totalTickets");
  if (numericFields.length > 0) {
    const nums = [...textForNums.matchAll(/(\d+(?:[.,]\d{1,2})?)/g)].map((m) =>
      parseFloat(m[1]!.replace(",", ".")),
    );
    let idx = 0;
    for (const field of numericFields) {
      if (idx >= nums.length) break;
      const n = Math.round(nums[idx]!);
      idx += 1;
      if (field === "pricePln") next.pricePln = n;
      if (field === "totalTickets") next.totalTickets = n;
    }
  }

  return next;
}

export function finalizeParsed(raw: z.infer<typeof RawParsedSchema>): ParsedTelegramEvent {
  if (!raw.startsAtWarsaw || raw.pricePln == null || raw.totalTickets == null) {
    throw new Error("Не все обязательные поля заполнены");
  }
  return {
    title: raw.title,
    titlePl: raw.titlePl,
    titleUk: raw.titleUk,
    description: raw.description,
    descriptionPl: raw.descriptionPl,
    descriptionUk: raw.descriptionUk,
    startsAtWarsaw: raw.startsAtWarsaw,
    pricePln: raw.pricePln,
    totalTickets: raw.totalTickets,
    venue: raw.venue,
    listingKind: raw.listingKind,
    eventLanguage: normalizeEventLanguage(raw.eventLanguage),
    confidence: raw.confidence,
    notes: raw.notes,
  };
}

function buildPrompt(sourceText: string, hasImage: boolean): string {
  return buildGeminiEventParsePrompt(sourceText, hasImage);
}

async function callGeminiGenerate(parts: { text?: string; inline_data?: { mime_type: string; data: string } }[]): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY не задан");

  const models = [GEMINI_EVENT_MODEL, ...GEMINI_EVENT_MODEL_FALLBACKS.filter((m) => m !== GEMINI_EVENT_MODEL)];
  let lastError = "Gemini API failed";

  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.25, responseMimeType: "application/json" },
        }),
      },
    );

    if (res.ok) {
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawText) throw new Error("Gemini не вернул текст");
      return rawText;
    }

    const errText = await res.text().catch(() => "");
    lastError = `${model} ${res.status}: ${errText.slice(0, 300)}`;
    if (res.status !== 429 && res.status !== 503) break;
  }

  throw new Error(`Gemini API: ${lastError}`);
}

export async function parseEventWithGemini(
  sourceText: string,
  image?: { base64: string; mimeType: string },
): Promise<{ raw: z.infer<typeof RawParsedSchema>; missing: ClarificationField[]; previewNote?: string }> {
  const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [
    { text: buildPrompt(sourceText, Boolean(image)) },
  ];
  if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });

  const rawText = await callGeminiGenerate(parts);
  let parsed: unknown;
  try {
    parsed = extractJsonFromGeminiText(rawText);
  } catch {
    throw new Error("Gemini вернул невалидный JSON");
  }

  parsed = sanitizeGeminiPayload(parsed);

  const result = RawParsedSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Gemini JSON: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }

  const datePolicy = applyDatePolicy(result.data);
  let missing = missingClarificationFields(result.data);
  if (datePolicy.forceDateClarification && !missing.includes("startsAtWarsaw")) {
    missing = ["startsAtWarsaw", ...missing];
  }

  return { raw: result.data, missing, previewNote: datePolicy.previewNote };
}

export function rawToStoredParsed(raw: z.infer<typeof RawParsedSchema>): ParsedTelegramEvent {
  return finalizeParsed(raw);
}
