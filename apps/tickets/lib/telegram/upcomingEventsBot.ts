import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import type { InlineKeyboardButton } from "@/lib/telegram/telegramBotApi";

export const UPCOMING_EVENTS_PAGE_SIZE = 8;

export type UpcomingEventRow = {
  id: string;
  slug: string;
  title: string;
  startsAtIso: string;
  listingKind: string;
  visibility: string;
};

export async function fetchUpcomingEventsForBot(
  supabase: SupabaseClient,
  limit = 40,
): Promise<UpcomingEventRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("id,slug,title,starts_at,listing_kind,visibility")
    .in("visibility", ["published", "unlisted"])
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    startsAtIso: String(row.starts_at),
    listingKind: String(row.listing_kind ?? "performance"),
    visibility: String(row.visibility ?? "published"),
  }));
}

export function formatUpcomingEventWhenRu(startsAtIso: string): string {
  const dt = DateTime.fromISO(startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
  return dt.isValid ? dt.setLocale("ru").toFormat("d MMM, HH:mm") : startsAtIso;
}

function kindLabel(listingKind: string): string {
  return listingKind === "trial" ? "пробное" : "шоу";
}

function visibilityMark(visibility: string): string {
  if (visibility === "unlisted") return "👀";
  return "🌍";
}

export function formatUpcomingEventsMessage(
  events: UpcomingEventRow[],
  page: number,
  baseUrl: string,
): string {
  if (!events.length) {
    return "📅 Нет предстоящих событий на сайте.\n\nСоздайте афишу через бота или админку.";
  }

  const start = page * UPCOMING_EVENTS_PAGE_SIZE;
  const slice = events.slice(start, start + UPCOMING_EVENTS_PAGE_SIZE);
  const lines = slice.map((ev, i) => {
    const n = start + i + 1;
    const when = formatUpcomingEventWhenRu(ev.startsAtIso);
    const url = `${baseUrl.replace(/\/$/, "")}/ru/events/${ev.slug}`;
    return `${n}. ${visibilityMark(ev.visibility)} ${ev.title}\n   📅 ${when} · ${kindLabel(ev.listingKind)}\n   🔗 ${url}`;
  });

  const totalPages = Math.ceil(events.length / UPCOMING_EVENTS_PAGE_SIZE);
  const header =
    totalPages > 1
      ? `📅 Предстоящие события (${events.length}) — стр. ${page + 1}/${totalPages}`
      : `📅 Предстоящие события (${events.length})`;

  return [
    header,
    "",
    ...lines,
    "",
    "Нажмите «📢» у события — затем выберите все группы или мастер-группу.",
  ].join("\n");
}

function rebcastButtonLabel(ev: UpcomingEventRow): string {
  const when = formatUpcomingEventWhenRu(ev.startsAtIso);
  const short = ev.title.length > 22 ? `${ev.title.slice(0, 21)}…` : ev.title;
  const label = `📢 ${when} · ${short}`;
  return label.length > 64 ? `📢 ${when}` : label;
}

export function upcomingEventsKeyboard(events: UpcomingEventRow[], page: number): InlineKeyboardButton[][] {
  const start = page * UPCOMING_EVENTS_PAGE_SIZE;
  const slice = events.slice(start, start + UPCOMING_EVENTS_PAGE_SIZE);
  const rows: InlineKeyboardButton[][] = slice.map((ev) => [
    { text: rebcastButtonLabel(ev), callback_data: `rebcastpick:${ev.id}` },
  ]);

  const totalPages = Math.ceil(events.length / UPCOMING_EVENTS_PAGE_SIZE);
  if (totalPages > 1) {
    const nav: InlineKeyboardButton[] = [];
    if (page > 0) nav.push({ text: "◀️ Назад", callback_data: `evpage:${page - 1}` });
    if (page + 1 < totalPages) nav.push({ text: "Вперёд ▶️", callback_data: `evpage:${page + 1}` });
    if (nav.length) rows.push(nav);
  }

  rows.push([{ text: "🔄 Обновить список", callback_data: `evpage:${page}` }]);
  return rows;
}
