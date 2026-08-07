import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import { capitalizeWeekday, formatEventDateTimeParts, formatPlnFromGrosze } from "@/lib/format";
import { eventPriceDetails } from "@/lib/eventPrice";
import { TRIAL_HUB_SEGMENT } from "@/lib/trialCourseHub";
import type { PublishedEventInfo } from "@/lib/telegram/broadcastToGroups";

export type EventBroadcastDetails = {
  slug: string;
  title: string;
  description: string;
  venue: string;
  startsAtIso: string;
  priceGrosze: number;
  dayOfEventPriceGrosze: number | null;
  listingKind: string;
  /** Курс пробного — для постоянной ссылки /probnoe/{slug}. */
  poetCourseSlug: string | null;
  /** Ближайшие даты того же курса (включая текущую), уже отсортированные. */
  upcomingDates: string[];
};

const EVENT_SELECT =
  "slug,title,description,venue,starts_at,price_grosze,day_of_event_price_grosze,listing_kind,poet_course_id" as const;

const EVENT_SELECT_NO_COURSE =
  "slug,title,description,venue,starts_at,price_grosze,day_of_event_price_grosze,listing_kind" as const;

const WARSAW = "Europe/Warsaw";
const TRIAL_DURATION_HOURS = 2;
const MAX_DATES_IN_CAPTION = 6;

/** Короткий продающий абзац из описания — без SEO-хвоста и обрезка по предложению. */
export function extractBroadcastTeaser(description: string, maxLen = 240): string {
  let text = description
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/\s+Билеты онлайн[^]*$/i, "");
  text = text.replace(/\s+populartickets\.pl[^]*$/i, "");
  text = text.replace(/\s+театр «Популярный поэт»[^]*$/i, "");
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (lastStop > 60) return cut.slice(0, lastStop + 1).trim();
  return `${cut.trim()}…`;
}

function formatPlnShort(grosze: number): string {
  const zl = grosze / 100;
  return Number.isInteger(zl) ? `${zl} zł` : formatPlnFromGrosze(grosze);
}

function isTodayInWarsaw(iso: string): boolean {
  const d = DateTime.fromISO(iso, { zone: "utc" }).setZone(WARSAW);
  const now = DateTime.now().setZone(WARSAW);
  return d.isValid && d.hasSame(now, "day");
}

type TrialKind = "improv" | "acting" | "playback" | "generic";

function trialKind(details: Pick<EventBroadcastDetails, "title" | "description" | "poetCourseSlug">): TrialKind {
  if (details.poetCourseSlug === "improv") return "improv";
  if (details.poetCourseSlug === "acting") return "acting";
  if (details.poetCourseSlug === "playback") return "playback";
  const t = `${details.title} ${details.description}`.toLowerCase();
  if (/актёр|актер|acting/.test(t)) return "acting";
  if (/playback|play-?back/.test(t)) return "playback";
  if (/импров|impro/.test(t)) return "improv";
  return "generic";
}

function trialSubjectLine(kind: TrialKind): string {
  if (kind === "acting") return "ПРОБНОЕ · АКТЁРСКОЕ МАСТЕРСТВО";
  if (kind === "playback") return "ПРОБНОЕ · PLAYBACK";
  if (kind === "improv") return "ПРОБНОЕ · ИМПРОВИЗАЦИЯ";
  return "ПРОБНОЕ ЗАНЯТИЕ";
}

function trialPitch(kind: TrialKind): string {
  if (kind === "acting") {
    return "Открытое занятие: голос, тело, внимание и уверенность на сцене — без опыта, с поддержкой группы.";
  }
  if (kind === "playback") {
    return "Открытое занятие в формате playback: ваши истории оживают на сцене здесь и сейчас.";
  }
  return "Открытое занятие по импровизации: быстрее реагировать, легче общаться и не бояться проявляться.";
}

function trialBullets(kind: TrialKind): string[] {
  if (kind === "acting") {
    return [
      "✨ Работа с голосом и телом",
      "✨ Внимание, контакт и подача",
      "✨ Безопасное пространство для пробы",
      "✨ Знакомство с методикой театра",
    ];
  }
  if (kind === "playback") {
    return [
      "✨ Истории зала → короткие сцены",
      "✨ Эмпатия и живой контакт",
      "✨ Без заученных текстов",
      "✨ Атмосфера поддержки",
    ];
  }
  return [
    "✨ Быстрая реакция и чувство юмора",
    "✨ Живой контакт без зажимов",
    "✨ Комедийные форматы и много смеха",
    "✨ Знакомство с методикой театра",
  ];
}

function formatVenueForBroadcast(venue: string): string {
  const v = venue.trim();
  if (/популярн|popular\s*poet|domaniewska/i.test(v)) {
    return "Театр «Популярный поэт» · ul. Domaniewska 37";
  }
  return v;
}

/** Одна строка даты для списка в посте. */
export function formatTrialDateBullet(startsAtIso: string): string {
  const parts = formatEventDateTimeParts(startsAtIso, "ru");
  const start = DateTime.fromISO(startsAtIso, { zone: "utc" }).setZone(WARSAW);
  if (!parts || !start.isValid) return `• ${startsAtIso}`;

  const end = start.plus({ hours: TRIAL_DURATION_HOURS });
  const timeRange = `${parts.time}–${end.toFormat("HH:mm")}`;
  if (isTodayInWarsaw(startsAtIso)) return `• Сегодня · ${timeRange}`;
  return `• ${capitalizeWeekday(parts.weekday, "ru")}, ${parts.date} · ${timeRange}`;
}

function trialHubUrl(base: string, courseSlug: string | null, eventSlug?: string): string {
  const root = base.replace(/\/$/, "");
  if (courseSlug) {
    const hub = `${root}/ru/${TRIAL_HUB_SEGMENT}/${encodeURIComponent(courseSlug)}`;
    // Постоянная ссылка без ?d= — дата выбирается на странице.
    return hub;
  }
  return `${root}/ru/events/${encodeURIComponent(eventSlug ?? "")}`;
}

function buildTrialBroadcastCaption(details: EventBroadcastDetails, hubUrl: string): string {
  const kind = trialKind(details);
  const pricing = eventPriceDetails({
    starts_at: details.startsAtIso,
    price_grosze: details.priceGrosze,
    day_of_event_price_grosze: details.dayOfEventPriceGrosze,
  });
  const price =
    pricing.regularPriceGrosze > 0 ? formatPlnShort(pricing.regularPriceGrosze) : "на сайте";

  const dates = (details.upcomingDates.length ? details.upcomingDates : [details.startsAtIso])
    .slice(0, MAX_DATES_IN_CAPTION)
    .map(formatTrialDateBullet);
  const more =
    details.upcomingDates.length > MAX_DATES_IN_CAPTION
      ? `• и ещё ${details.upcomingDates.length - MAX_DATES_IN_CAPTION} на странице`
      : null;

  return [
    `🎭 ${trialSubjectLine(kind)}`,
    "",
    trialPitch(kind),
    "",
    ...trialBullets(kind),
    "",
    "📅 Ближайшие даты:",
    ...dates,
    ...(more ? [more] : []),
    "",
    `📍 ${formatVenueForBroadcast(details.venue)}`,
    `🎟 ${price} · без опыта · язык занятия — на странице`,
    "",
    "Все даты и запись — по одной ссылке:",
    hubUrl,
    "",
    "Можно просто прийти попробовать. Ни к чему не обязывает ❤️",
  ].join("\n");
}

function performanceUrgency(startsAtIso: string): string {
  if (isTodayInWarsaw(startsAtIso)) return "СЕГОДНЯ!";
  const parts = formatEventDateTimeParts(startsAtIso, "ru");
  if (!parts) return "СКОРО!";
  return `${capitalizeWeekday(parts.weekday, "ru").toUpperCase()}!`;
}

function buildPerformanceBroadcastCaption(details: EventBroadcastDetails, ticketUrl: string): string {
  const parts = formatEventDateTimeParts(details.startsAtIso, "ru");
  const when = parts
    ? `${capitalizeWeekday(parts.weekday, "ru")}, ${parts.date} · ${parts.time}`
    : details.startsAtIso;
  const teaser = extractBroadcastTeaser(details.description);
  const pricing = eventPriceDetails({
    starts_at: details.startsAtIso,
    price_grosze: details.priceGrosze,
    day_of_event_price_grosze: details.dayOfEventPriceGrosze,
  });

  let priceLine = "🎟 Билеты и цена — на сайте";
  if (pricing.regularPriceGrosze > 0) {
    const regular = formatPlnShort(pricing.regularPriceGrosze);
    if (pricing.dayOfEventPriceGrosze) {
      const day = formatPlnShort(pricing.dayOfEventPriceGrosze);
      priceLine = `🎟 ${regular} заранее · ${day} в день события`;
    } else {
      priceLine = `🎟 Билеты от ${regular}`;
    }
  }

  const lines = [
    `🎭 ${details.title.toUpperCase()} — ${performanceUrgency(details.startsAtIso)}`,
    "",
  ];

  if (teaser) {
    lines.push(teaser, "");
  }

  lines.push(
    `📅 ${when}`,
    `📍 ${formatVenueForBroadcast(details.venue)}`,
    "",
    priceLine,
    "Билеты на сайте👇",
    ticketUrl,
    "",
    "Живой зал, сильные эмоции и вечер, который хочется повторить 🎭",
  );

  return lines.join("\n");
}

export function buildGroupBroadcastContent(
  base: string,
  details: EventBroadcastDetails,
): { photoCaption: string; previewMessage: string; ticketUrl: string; buttonLabel: string } {
  const isTrial = details.listingKind === "trial";
  const ticketUrl = isTrial
    ? trialHubUrl(base, details.poetCourseSlug, details.slug)
    : `${base.replace(/\/$/, "")}/ru/events/${details.slug}`;

  const photoCaption = isTrial
    ? buildTrialBroadcastCaption(details, ticketUrl)
    : buildPerformanceBroadcastCaption(details, ticketUrl);

  const previewMessage = isTrial
    ? "Страница не протухает: даты обновляются, ссылка та же."
    : ["🎫 Билеты и описание на сайте:", ticketUrl].join("\n");

  const buttonLabel = isTrial ? "🎟 Выбрать дату" : "🎫 Билеты";

  return {
    photoCaption: photoCaption.slice(0, 1024),
    previewMessage,
    ticketUrl,
    buttonLabel,
  };
}

async function fetchCourseSlug(
  supabase: SupabaseClient,
  poetCourseId: string | null,
): Promise<string | null> {
  if (!poetCourseId) return null;
  const { data, error } = await supabase.from("poet_course").select("slug").eq("id", poetCourseId).maybeSingle();
  if (error || !data) return null;
  return typeof data.slug === "string" ? data.slug : null;
}

async function fetchUpcomingTrialStarts(
  supabase: SupabaseClient,
  poetCourseId: string | null,
): Promise<string[]> {
  if (!poetCourseId) return [];
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("starts_at")
    .eq("listing_kind", "trial")
    .eq("poet_course_id", poetCourseId)
    .in("visibility", ["published", "unlisted"])
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(12);
  if (error || !data) return [];
  return data.map((row) => String(row.starts_at));
}

export async function fetchEventBroadcastDetails(
  supabase: SupabaseClient,
  event: PublishedEventInfo,
): Promise<EventBroadcastDetails | null> {
  const query = (select: string) => {
    const q = supabase.from("events").select(select);
    return event.id ? q.eq("id", event.id).maybeSingle() : q.eq("slug", event.slug).maybeSingle();
  };

  let result = await query(EVENT_SELECT);
  if (result.error?.code === "42703") {
    result = await query(EVENT_SELECT_NO_COURSE);
  }
  if (result.error || !result.data) return null;

  const row = result.data as unknown as {
    slug: string;
    title: string;
    description: string;
    venue: string;
    starts_at: string;
    price_grosze: number;
    day_of_event_price_grosze: number | null;
    listing_kind: string | null;
    poet_course_id?: string | null;
  };

  const poetCourseId = typeof row.poet_course_id === "string" ? row.poet_course_id : null;
  const listingKind = row.listing_kind ?? "performance";
  const poetCourseSlug =
    listingKind === "trial" ? await fetchCourseSlug(supabase, poetCourseId) : null;
  const upcomingDates =
    listingKind === "trial" ? await fetchUpcomingTrialStarts(supabase, poetCourseId) : [];

  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    venue: row.venue,
    startsAtIso: row.starts_at,
    priceGrosze: row.price_grosze,
    dayOfEventPriceGrosze: row.day_of_event_price_grosze,
    listingKind,
    poetCourseSlug,
    upcomingDates: upcomingDates.length ? upcomingDates : [row.starts_at],
  };
}

/** Fallback, если событие в БД не подгрузилось. */
export function fallbackBroadcastDetails(event: PublishedEventInfo): EventBroadcastDetails {
  return {
    slug: event.slug,
    title: event.title,
    description: "",
    venue: "Warszawa",
    startsAtIso: event.startsAtIso,
    priceGrosze: 0,
    dayOfEventPriceGrosze: null,
    listingKind: "performance",
    poetCourseSlug: null,
    upcomingDates: [event.startsAtIso],
  };
}
