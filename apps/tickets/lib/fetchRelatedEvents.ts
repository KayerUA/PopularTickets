import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventCardProps } from "@/components/EventCard";
import type { AppLocale } from "@/i18n/routing";
import { resolveEventCopy } from "@/lib/contentI18n";
import {
  normalizeEventListingKind,
  resolveEventMarketingStatus,
  sortEventsForMarketing,
  type EventListingKind,
} from "@/lib/eventMarketingStatus";

const EVENT_SELECT =
  "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind,event_language" as const;

function improvScore(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  if (text.includes("impro") || text.includes("импров") || text.includes("імпров")) score += 2;
  if (text.includes("playback") || text.includes("play-back") || text.includes("плей")) score += 2;
  return score;
}

/** До 3 похожих опубликованных событий (тот же listing_kind, ближайшие по дате). */
export async function fetchRelatedEvents(
  supabase: SupabaseClient,
  input: {
    locale: AppLocale;
    excludeSlug: string;
    listingKind: EventListingKind;
    title: string;
    description: string;
    limit?: number;
  },
): Promise<EventCardProps[]> {
  const limit = input.limit ?? 3;
  const { data: events, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("visibility", "published")
    .eq("listing_kind", input.listingKind)
    .neq("slug", input.excludeSlug)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(12);

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("events")
      .select(
        "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind",
      )
      .eq("visibility", "published")
      .eq("listing_kind", input.listingKind)
      .neq("slug", input.excludeSlug)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(12);
    if (fallback.error || !fallback.data?.length) return [];
    const ids = fallback.data.map((ev) => ev.id as string);
    const soldMap = new Map<string, number>();
    if (ids.length) {
      const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", ids);
      for (const row of ticketRows ?? []) {
        const eid = row.event_id as string;
        soldMap.set(eid, (soldMap.get(eid) ?? 0) + 1);
      }
    }
    return buildRelatedCards(
      fallback.data.map((ev) => ({ ...ev, event_language: null })),
      input,
      limit,
      soldMap,
    );
  }

  if (error || !events?.length) return [];
  const ids = events.map((ev) => ev.id as string);
  const soldMap = new Map<string, number>();
  if (ids.length) {
    const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", ids);
    for (const row of ticketRows ?? []) {
      const eid = row.event_id as string;
      soldMap.set(eid, (soldMap.get(eid) ?? 0) + 1);
    }
  }
  return buildRelatedCards(events, input, limit, soldMap);
}

async function buildRelatedCards(
  rows: Record<string, unknown>[],
  input: { locale: AppLocale; title: string; description: string },
  limit: number,
  soldMap: Map<string, number>,
): Promise<EventCardProps[]> {
  const currentImprov = improvScore(input.title, input.description);
  const sorted = [...rows].sort((a, b) => {
    const aTitle = String(a.title ?? "");
    const aDesc = String(a.description ?? "");
    const bTitle = String(b.title ?? "");
    const bDesc = String(b.description ?? "");
    const aScore = improvScore(aTitle, aDesc);
    const bScore = improvScore(bTitle, bDesc);
    if (aScore !== bScore) return bScore - aScore;
    return new Date(String(a.starts_at)).getTime() - new Date(String(b.starts_at)).getTime();
  });

  const cards: EventCardProps[] = [];
  for (const ev of sorted) {
    if (cards.length >= limit) break;
    const copy = resolveEventCopy(
      {
        title: ev.title as string,
        description: ev.description as string | undefined,
        title_pl: ev.title_pl as string | null | undefined,
        description_pl: ev.description_pl as string | null | undefined,
        title_uk: ev.title_uk as string | null | undefined,
        description_uk: ev.description_uk as string | null | undefined,
      },
      input.locale,
    );
    if (!copy) continue;
    const totalTickets = ev.total_tickets as number;
    const sold = soldMap.get(ev.id as string) ?? 0;
    const remaining = totalTickets - sold;
    cards.push({
      slug: ev.slug as string,
      title: copy.title,
      venue: ev.venue as string,
      startsAt: ev.starts_at as string,
      priceGrosze: ev.price_grosze as number,
      imageUrl: (ev.image_url as string | null) ?? null,
      imageFocalX: typeof ev.image_focal_x === "number" ? ev.image_focal_x : null,
      imageFocalY: typeof ev.image_focal_y === "number" ? ev.image_focal_y : null,
      locale: input.locale,
      status: resolveEventMarketingStatus({
        startsAt: ev.starts_at as string,
        remaining,
        totalTickets,
      }),
      listingKind: normalizeEventListingKind(ev.listing_kind as string | null),
      eventLanguage: (ev.event_language as never) ?? null,
    });
  }

  return sortEventsForMarketing(cards).slice(0, limit);
}
