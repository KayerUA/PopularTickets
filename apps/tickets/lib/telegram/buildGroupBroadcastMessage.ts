import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import { capitalizeWeekday, formatEventDateTimeParts, formatPlnFromGrosze } from "@/lib/format";
import { eventPriceDetails } from "@/lib/eventPrice";
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
};

const EVENT_SELECT =
  "slug,title,description,venue,starts_at,price_grosze,day_of_event_price_grosze,listing_kind" as const;

const WARSAW = "Europe/Warsaw";
const TRIAL_DURATION_HOURS = 2;

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

function trialSubjectLine(title: string, description: string): string {
  const t = `${title} ${description}`.toLowerCase();
  if (/импров|impro/.test(t)) return "ПРОБНОЕ ЗАНЯТИЕ ПО ИМПРОВИЗАЦИИ";
  if (/актёр|актер|acting/.test(t)) return "ПРОБНОЕ ЗАНЯТИЕ ПО АКТЁРСКОМУ МАСТЕРСТВУ";
  if (/playback|play-?back/.test(t)) return "ПРОБНОЕ ЗАНЯТИЕ PLAYBACK";
  return "ПРОБНОЕ ЗАНЯТИЕ";
}

function trialInviteLine(title: string, description: string): string {
  const t = `${title} ${description}`.toLowerCase();
  if (/актёр|актер|acting/.test(t)) return "Приходите на пробное занятие по актёрскому мастерству!";
  if (/playback|play-?back/.test(t)) return "Приходите на пробное занятие по формату playback!";
  return "Приходите на пробное занятие по театральной импровизации!";
}

function trialClosingLine(title: string, description: string): string {
  const t = `${title} ${description}`.toLowerCase();
  if (/актёр|актер|acting/.test(t)) return "Без опыта. Просто приходите и попробуйте себя на сцене ❤️";
  if (/playback|play-?back/.test(t)) return "Без опыта. Приходите и попробуйте формат playback ❤️";
  return "Без опыта. Просто приходите и попробуйте себя в импровизации ❤️";
}

function formatVenueForBroadcast(venue: string): string {
  const v = venue.trim();
  if (/популярн|popular\s*poet|domaniewska/i.test(v)) {
    return "Театр «Популярный поэт» ul. Domaniewska 37";
  }
  return v;
}

function trialScheduleLine(startsAtIso: string): { urgency: string; when: string } {
  const parts = formatEventDateTimeParts(startsAtIso, "ru");
  const start = DateTime.fromISO(startsAtIso, { zone: "utc" }).setZone(WARSAW);
  if (!parts || !start.isValid) {
    return { urgency: "СКОРО!", when: startsAtIso };
  }

  const end = start.plus({ hours: TRIAL_DURATION_HOURS });
  const timeRange = `${parts.time}-${end.toFormat("HH:mm")}`;
  const dayPart = isTodayInWarsaw(startsAtIso)
    ? "Сегодня"
    : `${capitalizeWeekday(parts.weekday, "ru")}, ${parts.date}`;
  const moon = start.hour >= 17 ? "🌕" : "☀️";
  const urgency = isTodayInWarsaw(startsAtIso)
    ? "СЕГОДНЯ!"
    : `${capitalizeWeekday(parts.weekday, "ru").toUpperCase()}!`;

  return {
    urgency,
    when: `${dayPart} ${moon}${timeRange}`,
  };
}

function buildTrialBroadcastCaption(details: EventBroadcastDetails, ticketUrl: string): string {
  const { urgency, when } = trialScheduleLine(details.startsAtIso);
  const subject = trialSubjectLine(details.title, details.description);
  const pricing = eventPriceDetails({
    starts_at: details.startsAtIso,
    price_grosze: details.priceGrosze,
    day_of_event_price_grosze: details.dayOfEventPriceGrosze,
  });
  const price =
    pricing.regularPriceGrosze > 0
      ? formatPlnShort(pricing.regularPriceGrosze)
      : "на сайте";

  return [
    `🎭 ${subject} — ${urgency}`,
    "",
    "Хотите стать свободнее, увереннее и научиться легко общаться с людьми?",
    "",
    trialInviteLine(details.title, details.description),
    "✨ Учимся быстро мыслить",
    "✨ Развиваем чувство юмора",
    "✨ Прокачиваем общение и уверенность",
    "✨ Играем в комедийные форматы и много смеёмся",
    "",
    `📅 ${when} 📍 ${formatVenueForBroadcast(details.venue)}`,
    "",
    `🎟 Пробное занятие — ${price}`,
    "Билеты на сайте👇",
    ticketUrl,
    "",
    trialClosingLine(details.title, details.description),
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
): { photoCaption: string; previewMessage: string; ticketUrl: string } {
  const ticketUrl = `${base.replace(/\/$/, "")}/ru/events/${details.slug}`;
  const photoCaption =
    details.listingKind === "trial"
      ? buildTrialBroadcastCaption(details, ticketUrl)
      : buildPerformanceBroadcastCaption(details, ticketUrl);

  const previewMessage = ["🎫 Билеты и описание на сайте:", ticketUrl].join("\n");

  return { photoCaption: photoCaption.slice(0, 1024), previewMessage, ticketUrl };
}

export async function fetchEventBroadcastDetails(
  supabase: SupabaseClient,
  event: PublishedEventInfo,
): Promise<EventBroadcastDetails | null> {
  const query = supabase.from("events").select(EVENT_SELECT);
  const { data, error } = event.id
    ? await query.eq("id", event.id).maybeSingle()
    : await query.eq("slug", event.slug).maybeSingle();

  if (error || !data) return null;

  const row = data as {
    slug: string;
    title: string;
    description: string;
    venue: string;
    starts_at: string;
    price_grosze: number;
    day_of_event_price_grosze: number | null;
    listing_kind: string | null;
  };

  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    venue: row.venue,
    startsAtIso: row.starts_at,
    priceGrosze: row.price_grosze,
    dayOfEventPriceGrosze: row.day_of_event_price_grosze,
    listingKind: row.listing_kind ?? "performance",
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
  };
}
