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
import { IMAGE_FOCALS_KEY } from "@/lib/telegram/draftImageFocal";

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

/** Gemini иногда отдаёт секунды, пробел вместо T, диапазон времени — приводим к yyyy-MM-ddTHH:mm. */
export function normalizeStartsAtWarsaw(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return null;

  let s = v.trim().replace(/Z$/i, "").replace(/\s+\+\d{2}:?\d{0,2}$/, "");
  s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/, "$1T$2");

  const range = s.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{1,2}:\d{2})\s*[-–—]\s*\d{1,2}:\d{2}/,
  );
  if (range) {
    const [, date, time] = range;
    const [h, m] = time!.split(":");
    s = `${date}T${h!.padStart(2, "0")}:${m!.padStart(2, "0")}`;
  }

  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (iso) {
    return `${iso[1]}T${iso[2]!.padStart(2, "0")}:${iso[3]}`;
  }

  const dmy = s.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?:\s+(\d{1,2})[:.](\d{2}))?/);
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    const year = dmy[3]
      ? dmy[3].length === 2
        ? `20${dmy[3]}`
        : dmy[3]
      : String(DateTime.now().setZone(EVENT_ADMIN_TIMEZONE).year);
    const hour = (dmy[4] ?? "19").padStart(2, "0");
    const min = (dmy[5] ?? "00").padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${min}`;
  }

  return null;
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

const startsAtSchema = z.preprocess(
  normalizeStartsAtWarsaw,
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
);

/** Ответ Gemini: null = в источнике не было — нужно спросить у админа. */
export const RawParsedSchema = z.object({
  title: z.string().min(2).max(200),
  titlePl: z.string().min(2).max(200),
  titleUk: z.string().min(2).max(200),
  description: z.string().min(MIN_DESCRIPTION_CHARS).max(20000),
  descriptionPl: z.string().min(MIN_DESCRIPTION_CHARS).max(20000),
  descriptionUk: z.string().min(MIN_DESCRIPTION_CHARS).max(20000),
  startsAtWarsaw: startsAtSchema,
  pricePln: z.number().positive().max(10000).nullable(),
  dayOfEventPricePln: z.number().positive().max(10000).nullable().optional().default(null),
  totalTickets: z.number().int().min(1).max(5000).nullable(),
  venue: z.string().min(2).max(200),
  listingKind: z.enum(["performance", "trial"]),
  eventLanguage: z.enum(["ru", "uk", "ru_uk", "pl", "en", "mixed"]),
  /** Slug курса на popularpoet.pl (/kursy/{slug}) — выставляется сервером, не Gemini. */
  poetCourseSlug: z.enum(["improv", "acting", "playback", "masterclass"]).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  notes: z.string().max(500).optional(),
});

export type RawParsedEvent = z.infer<typeof RawParsedSchema>;

export type ParsedTelegramEvent = {
  title: string;
  titlePl: string;
  titleUk: string;
  description: string;
  descriptionPl: string;
  descriptionUk: string;
  startsAtWarsaw: string;
  pricePln: number;
  dayOfEventPricePln: number | null;
  totalTickets: number;
  venue: string;
  listingKind: "performance" | "trial";
  eventLanguage: ReturnType<typeof normalizeEventLanguage>;
  poetCourseSlug?: "improv" | "acting" | "playback" | "masterclass";
  confidence?: "high" | "medium" | "low";
  notes?: string;
};

export type ClarificationField = "startsAtWarsaw" | "pricePln" | "totalTickets";

const CLARIFICATION_LABELS: Record<ClarificationField, string> = {
  startsAtWarsaw: "дату и время (например: 23.05 19:00)",
  pricePln: "цену билета в PLN (например: 50)",
  totalTickets: "количество мест (например: 30)",
};

function rejectDateLeakage(o: Record<string, unknown>): void {
  const starts = o.startsAtWarsaw;
  if (typeof starts !== "string") return;
  const dt = DateTime.fromFormat(starts, "yyyy-MM-dd'T'HH:mm", { zone: EVENT_ADMIN_TIMEZONE });
  if (!dt.isValid) return;
  const day = dt.day;
  for (const key of ["pricePln", "dayOfEventPricePln", "totalTickets"] as const) {
    const v = o[key];
    if (typeof v === "number" && v === day) {
      o[key] = null;
    }
  }
}

function sanitizeOneEvent(
  input: Record<string, unknown>,
  shared: {
    pricePln: number | null;
    dayOfEventPricePln: number | null;
    totalTickets: number | null;
    venue: string;
    eventLanguage: string;
  },
): Record<string, unknown> {
  const o = { ...input };

  const confidence = coerceConfidence(o.confidence);
  if (confidence) o.confidence = confidence;
  else delete o.confidence;

  o.startsAtWarsaw = normalizeStartsAtWarsaw(o.startsAtWarsaw);
  o.pricePln = coerceNullableNumber(o.pricePln) ?? shared.pricePln;
  o.dayOfEventPricePln = coerceNullableNumber(o.dayOfEventPricePln) ?? shared.dayOfEventPricePln;
  o.totalTickets = coerceNullableInt(o.totalTickets) ?? shared.totalTickets;

  rejectDateLeakage(o);
  if (
    typeof o.pricePln === "number" &&
    typeof o.dayOfEventPricePln === "number" &&
    o.dayOfEventPricePln <= o.pricePln
  ) {
    o.dayOfEventPricePln = null;
  }

  if (typeof o.listingKind === "string") {
    const lk = o.listingKind.toLowerCase();
    o.listingKind = lk.includes("trial") || lk.includes("проб") || lk.includes("prob") ? "trial" : "performance";
  } else {
    o.listingKind = "trial";
  }

  const venue =
    typeof o.venue === "string" && o.venue.trim().length >= 2 ? o.venue.trim() : shared.venue;
  o.venue = venue;

  o.eventLanguage = shared.eventLanguage;
  o.description = ensureMinDescription(o.description, venue);
  o.descriptionPl = ensureMinDescription(o.descriptionPl, venue);
  o.descriptionUk = ensureMinDescription(o.descriptionUk, venue);

  delete o.notes;

  return o;
}

/** Резервный разбор строк расписания «20.05 (ср) 20:00-22:00 — …». */
export function extractScheduleLinesFromSource(sourceText: string): {
  startsAtWarsaw: string;
  lineHint: string;
}[] {
  const now = DateTime.now().setZone(EVENT_ADMIN_TIMEZONE);
  const out: { startsAtWarsaw: string; lineHint: string }[] = [];
  const re =
    /(\d{1,2})\.(\d{1,2})(?:\s*\([^)]+\))?\s+(\d{1,2}):(\d{2})(?:\s*[-–—]\s*\d{1,2}:\d{2})?\s*[—–-]\s*(.+)/gm;

  for (const m of sourceText.matchAll(re)) {
    const day = m[1]!.padStart(2, "0");
    const month = m[2]!.padStart(2, "0");
    const hour = m[3]!.padStart(2, "0");
    const min = m[4]!.padStart(2, "0");
    const lineHint = m[5]!.trim();
    out.push({
      startsAtWarsaw: `${now.year}-${month}-${day}T${hour}:${min}`,
      lineHint,
    });
  }

  return out;
}

function applyScheduleFallback(events: RawParsedEvent[], sourceText: string): void {
  const lines = extractScheduleLinesFromSource(sourceText);
  if (lines.length < 2) return;

  for (let i = 0; i < Math.min(events.length, lines.length); i++) {
    const ev = events[i]!;
    const line = lines[i]!;
    if (!ev.startsAtWarsaw) {
      ev.startsAtWarsaw = line.startsAtWarsaw;
    }
    if (/импров|impro|комед/i.test(line.lineHint) && ev.listingKind !== "trial") {
      ev.listingKind = "trial";
    }
    if (/актёр|актер|acting|мастерств/i.test(line.lineHint)) {
      ev.listingKind = "trial";
    }
    inferPoetCourseSlugForTrial(ev, line.lineHint);
  }
}

function isTrialScheduleAfisha(sourceText: string): boolean {
  const t = sourceText.toLowerCase();
  if (/пробн|zajęci[aę]\s+prób|zajec\s+prob|trial\s+class/i.test(t)) return true;
  const lines = extractScheduleLinesFromSource(sourceText);
  return lines.length >= 2 && /(?:^|\n)\s*вход\s*:\s*70|70\s*zł|70\s*zl\b/i.test(t);
}

function scheduleSlotKey(startsAtWarsaw: string | null | undefined): string | null {
  if (!startsAtWarsaw) return null;
  const dt = DateTime.fromFormat(startsAtWarsaw, "yyyy-MM-dd'T'HH:mm", { zone: EVENT_ADMIN_TIMEZONE });
  if (!dt.isValid) return null;
  return `${dt.toFormat("MM-dd")}T${dt.toFormat("HH:mm")}`;
}

function poetCourseSlugFromLineHint(lineHint: string): "improv" | "acting" | "playback" | "masterclass" {
  if (/playback|play-back|плейбек|play\s*back/i.test(lineHint)) return "playback";
  if (/актёр|актер|acting/i.test(lineHint) && /мастерств/i.test(lineHint)) return "acting";
  if (/импров|impro|комед/i.test(lineHint)) return "improv";
  return "improv";
}

function inferPoetCourseSlugForTrial(ev: RawParsedEvent, lineHint?: string): void {
  if (ev.listingKind !== "trial") {
    delete ev.poetCourseSlug;
    return;
  }
  if (lineHint) {
    ev.poetCourseSlug = poetCourseSlugFromLineHint(lineHint);
    return;
  }
  const blob = `${ev.title} ${ev.description}`.toLowerCase();
  if (/playback|play-back|плейбек/i.test(blob)) ev.poetCourseSlug = "playback";
  else if (/актёр|актер|acting/i.test(blob) && /мастерств/i.test(blob)) ev.poetCourseSlug = "acting";
  else if (/импров|impro|комед/i.test(blob)) ev.poetCourseSlug = "improv";
}

function trialTitlesFromLineHint(lineHint: string): Pick<RawParsedEvent, "title" | "titlePl" | "titleUk"> {
  const isActing = /актёр|актер|acting/i.test(lineHint) && /мастерств/i.test(lineHint);
  if (isActing) {
    return {
      title: "Пробное занятие по актёрскому мастерству в Варшаве — театр «Популярный поэт»",
      titlePl: "Zajęcia próbne z aktorstwa w Warszawie — Teatr „Popularny Poeta”",
      titleUk: "Пробне заняття з акторської майстерності у Варшаві — театр «Популярний поет»",
    };
  }
  return {
    title: "Пробное занятие по импровизации в Варшаве — театр «Популярный поэт»",
    titlePl: "Zajęcia próbne z improwizacji w Warszawie — Teatr „Popularny Poeta”",
    titleUk: "Пробне заняття з імпровізації у Варшаві — театр «Популярний поет»",
  };
}

function titleLooksLikeMasterclass(title: string): boolean {
  return /мастер[-\s]?класс|master[-\s]?class|masterclass/i.test(title);
}

/** Пробные из расписания: trial + каноничные title (Gemini путает impro с «мастер-классом»). */
function applyTrialSchedulePolicy(events: RawParsedEvent[], sourceText: string): void {
  if (!isTrialScheduleAfisha(sourceText)) return;

  const lines = extractScheduleLinesFromSource(sourceText);

  for (const ev of events) {
    ev.listingKind = "trial";
  }

  for (const ev of events) {
    const key = scheduleSlotKey(ev.startsAtWarsaw);
    const line =
      (key ? lines.find((l) => scheduleSlotKey(l.startsAtWarsaw) === key) : undefined) ??
      (lines.length === events.length
        ? lines[events.indexOf(ev)]
        : undefined);

    if (line) {
      Object.assign(ev, trialTitlesFromLineHint(line.lineHint));
      inferPoetCourseSlugForTrial(ev, line.lineHint);
      continue;
    }

    if (titleLooksLikeMasterclass(ev.title)) {
      Object.assign(ev, trialTitlesFromLineHint("импров"));
      inferPoetCourseSlugForTrial(ev, "импров");
    }
  }

  for (const ev of events) {
    if (ev.listingKind === "trial" && !ev.poetCourseSlug) {
      inferPoetCourseSlugForTrial(ev);
    }
  }
}

function sanitizeGeminiBatchPayload(input: unknown, sourceText: string): RawParsedEvent[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Gemini JSON: ожидался объект");
  }

  const root = input as Record<string, unknown>;
  const sharedPrice = coerceNullableNumber(root.pricePln);
  const sharedDayOfEventPrice = coerceNullableNumber(root.dayOfEventPricePln);
  const sharedTickets = coerceNullableInt(root.totalTickets);
  const sharedVenue =
    typeof root.venue === "string" && root.venue.trim().length >= 2
      ? root.venue.trim()
      : POPULAR_POET_TRIAL_VENUE_PL;
  const sharedLang =
    typeof root.eventLanguage === "string" && root.eventLanguage.trim()
      ? root.eventLanguage.trim()
      : "ru";

  let rawEvents: unknown[] | undefined;
  if (Array.isArray(root.events)) {
    rawEvents = root.events;
  } else if (typeof root.title === "string") {
    rawEvents = [root];
  }

  if (!rawEvents?.length) {
    throw new Error("Gemini JSON: пустой массив events");
  }

  const shared = {
    pricePln: sharedPrice,
    dayOfEventPricePln: sharedDayOfEventPrice,
    totalTickets: sharedTickets,
    venue: sharedVenue,
    eventLanguage: sharedLang,
  };

  const sanitized = rawEvents.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Gemini JSON: некорректный элемент events");
    }
    return sanitizeOneEvent(item as Record<string, unknown>, shared);
  });

  const parsed: RawParsedEvent[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    const result = RawParsedSchema.safeParse(sanitized[i]);
    if (!result.success) {
      throw new Error(
        `Gemini JSON: events[${i}]: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      );
    }
    parsed.push(result.data);
  }

  applyScheduleFallback(parsed, sourceText);
  applyTrialSchedulePolicy(parsed, sourceText);
  for (const ev of parsed) {
    if (ev.listingKind === "trial" && !ev.poetCourseSlug) {
      inferPoetCourseSlugForTrial(ev);
    }
  }
  return parsed;
}

const RECENT_PAST_DAYS = 30;

/** Дата без года: не доверяем Gemini — нормализуем сами, предупреждаем по-русски. */
export function applyDatePolicy(raw: RawParsedEvent): {
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

export function applyDatePolicyBatch(events: RawParsedEvent[]): {
  previewNote?: string;
  forceDateClarification?: boolean;
} {
  const notes: string[] = [];
  let forceDateClarification = false;

  for (const ev of events) {
    const policy = applyDatePolicy(ev);
    if (policy.previewNote) notes.push(policy.previewNote);
    if (policy.forceDateClarification) forceDateClarification = true;
  }

  return {
    previewNote: notes.length ? [...new Set(notes)].join("\n") : undefined,
    forceDateClarification: forceDateClarification || undefined,
  };
}

export function missingClarificationFields(raw: RawParsedEvent): ClarificationField[] {
  const out: ClarificationField[] = [];
  if (!raw.startsAtWarsaw) out.push("startsAtWarsaw");
  if (raw.pricePln == null) out.push("pricePln");
  if (raw.totalTickets == null) out.push("totalTickets");
  return out;
}

export function missingClarificationFieldsBatch(events: RawParsedEvent[]): ClarificationField[] {
  const out = new Set<ClarificationField>();
  if (events.some((e) => !e.startsAtWarsaw)) out.add("startsAtWarsaw");
  if (events.some((e) => e.pricePln == null)) out.add("pricePln");
  if (events.some((e) => e.totalTickets == null)) out.add("totalTickets");
  return [...out];
}

export function clarificationQuestion(fields: ClarificationField[], eventCount = 1): string {
  if (fields.length === 0) return "";
  const parts = fields.map((f) => CLARIFICATION_LABELS[f]);
  const prefix =
    eventCount > 1
      ? `В афише ${eventCount} событий — уточнение применится ко всем.\n`
      : "";
  return `${prefix}Уточните, пожалуйста: ${parts.join("; ")}.\nОтветьте одним сообщением.`;
}

export function applyClarificationReply(
  raw: RawParsedEvent,
  replyText: string,
  fields: ClarificationField[],
): RawParsedEvent {
  const text = replyText.trim();
  const next = { ...raw };
  let textForNums = text;

  if (fields.includes("startsAtWarsaw")) {
    const normalized = normalizeStartsAtWarsaw(text);
    if (normalized) {
      next.startsAtWarsaw = normalized;
      textForNums = text.replace(/\d{1,2}[./]\d{1,2}[^\d]*/g, " ");
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

export function applyClarificationReplyBatch(
  events: RawParsedEvent[],
  replyText: string,
  fields: ClarificationField[],
): RawParsedEvent[] {
  const onlyShared = fields.every((f): f is "pricePln" | "totalTickets" => f === "pricePln" || f === "totalTickets");

  if (onlyShared || events.length === 1) {
    const merged = applyClarificationReply(events[0]!, replyText, fields);
    return events.map((ev) => ({
      ...ev,
      ...(merged.pricePln != null && ev.pricePln == null ? { pricePln: merged.pricePln } : {}),
      ...(merged.totalTickets != null && ev.totalTickets == null ? { totalTickets: merged.totalTickets } : {}),
      ...(merged.startsAtWarsaw && fields.includes("startsAtWarsaw") && !ev.startsAtWarsaw
        ? { startsAtWarsaw: merged.startsAtWarsaw }
        : {}),
    }));
  }

  return events.map((ev) => applyClarificationReply(ev, replyText, fields));
}

export function finalizeParsed(raw: RawParsedEvent): ParsedTelegramEvent {
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
    dayOfEventPricePln:
      raw.dayOfEventPricePln != null && raw.dayOfEventPricePln > raw.pricePln
        ? raw.dayOfEventPricePln
        : null,
    totalTickets: raw.totalTickets,
    venue: raw.venue,
    listingKind: raw.listingKind,
    eventLanguage: normalizeEventLanguage(raw.eventLanguage),
    ...(raw.poetCourseSlug ? { poetCourseSlug: raw.poetCourseSlug } : {}),
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
    // 404 = неверное имя модели в env — пробуем fallback; 429/503 — тоже.
    if (res.status !== 429 && res.status !== 503 && res.status !== 404) break;
  }

  throw new Error(`Gemini API: ${lastError}`);
}

export type GeminiParseResult = {
  events: RawParsedEvent[];
  missing: ClarificationField[];
  previewNote?: string;
  isBatch: boolean;
};

export async function parseEventWithGemini(
  sourceText: string,
  image?: { base64: string; mimeType: string },
): Promise<GeminiParseResult> {
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

  const events = sanitizeGeminiBatchPayload(parsed, sourceText);
  const isBatch = events.length > 1;

  const datePolicy = applyDatePolicyBatch(events);
  let missing = missingClarificationFieldsBatch(events);
  if (datePolicy.forceDateClarification && !missing.includes("startsAtWarsaw")) {
    missing = ["startsAtWarsaw", ...missing];
  }

  return { events, missing, previewNote: datePolicy.previewNote, isBatch };
}

export function rawToStoredParsed(raw: RawParsedEvent): ParsedTelegramEvent {
  return finalizeParsed(raw);
}

export const BATCH_FLAG_KEY = "_batch";
export const PREVIEW_NOTE_KEY = "_previewNote";
export const EVENTS_KEY = "events";
export const IMAGE_FILE_IDS_KEY = "_imageFileIds";

export function sortEventsByDate(events: RawParsedEvent[]): RawParsedEvent[] {
  return [...events].sort((a, b) => {
    if (!a.startsAtWarsaw && !b.startsAtWarsaw) return 0;
    if (!a.startsAtWarsaw) return 1;
    if (!b.startsAtWarsaw) return -1;
    return a.startsAtWarsaw.localeCompare(b.startsAtWarsaw);
  });
}

export function storedImageFileIds(parsed: Record<string, unknown>, fallbackSingle?: string | null): string[] {
  const raw = parsed[IMAGE_FILE_IDS_KEY];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (fallbackSingle) return [fallbackSingle];
  return [];
}

export function withImageFileIds(parsed: Record<string, unknown>, fileIds: string[]): Record<string, unknown> {
  const next = { ...parsed };
  if (fileIds.length > 0) next[IMAGE_FILE_IDS_KEY] = fileIds;
  else delete next[IMAGE_FILE_IDS_KEY];
  return next;
}

export function draftParsedPayload(
  events: RawParsedEvent[],
  previewNote?: string,
  isBatch?: boolean,
  imageFileIds?: string[],
): Record<string, unknown> {
  const batch = isBatch ?? events.length > 1;
  let payload: Record<string, unknown>;
  if (batch) {
    payload = {
      [BATCH_FLAG_KEY]: true,
      [EVENTS_KEY]: events,
    };
    if (previewNote) payload[PREVIEW_NOTE_KEY] = previewNote;
  } else {
    payload = { ...events[0]! } as Record<string, unknown>;
    if (previewNote) payload[PREVIEW_NOTE_KEY] = previewNote;
  }
  if (imageFileIds?.length) payload[IMAGE_FILE_IDS_KEY] = imageFileIds;
  return payload;
}

export function previewNoteFromDraft(parsed: Record<string, unknown>): string | undefined {
  const note = parsed[PREVIEW_NOTE_KEY];
  return typeof note === "string" ? note : undefined;
}

export function isBatchDraft(parsed: Record<string, unknown>): boolean {
  return parsed[BATCH_FLAG_KEY] === true && Array.isArray(parsed[EVENTS_KEY]);
}

export function parseStoredEvents(parsed: Record<string, unknown>): RawParsedEvent[] {
  const {
    [PREVIEW_NOTE_KEY]: _note,
    [BATCH_FLAG_KEY]: _batch,
    [EVENTS_KEY]: events,
    [IMAGE_FILE_IDS_KEY]: _imgs,
    [IMAGE_FOCALS_KEY]: _focals,
    ...rest
  } = parsed;
  if (Array.isArray(events)) {
    return events.map((ev) => RawParsedSchema.parse(ev));
  }
  if (typeof rest.confidence === "number") delete rest.confidence;
  return [RawParsedSchema.parse(rest)];
}

export function parseStoredRaw(parsed: Record<string, unknown>): RawParsedEvent {
  return parseStoredEvents(parsed)[0]!;
}
