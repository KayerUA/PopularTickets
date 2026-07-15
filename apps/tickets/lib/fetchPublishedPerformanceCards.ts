import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";
import type { EventCardProps } from "@/components/EventCard";
import type { AppLocale } from "@/i18n/routing";
import { resolveEventCopy } from "@/lib/contentI18n";
import { resolveEventMarketingStatus, sortEventsForMarketing, normalizeEventListingKind } from "@/lib/eventMarketingStatus";
import { eventPriceDetails } from "@/lib/eventPrice";

const FEATURED_SPECIAL_SLUG = "next-mode-2026-08-15";

export async function fetchPublishedPerformanceCards(
  supabase: SupabaseClient,
  locale: AppLocale,
): Promise<{ cards: EventCardProps[]; error: PostgrestError | null }> {
  let { data: events, error } = await supabase
    .from("events")
    .select(
      "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,day_of_event_price_grosze,discount_periods,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind,event_language,visibility",
    )
    .in("visibility", ["published", "unlisted"])
    .in("listing_kind", ["performance", "special"])
    .order("starts_at", { ascending: true });

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("events")
      .select(
        "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,day_of_event_price_grosze,discount_periods,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind,visibility",
      )
      .in("visibility", ["published", "unlisted"])
      .in("listing_kind", ["performance", "special"])
      .order("starts_at", { ascending: true });
    events = (fallback.data ?? []).map((ev) => ({ ...ev, event_language: null }));
    error = fallback.error;
  }

  if (error) return { cards: [], error };

  const eventRows = events ?? [];
  const ids = eventRows.map((ev) => ev.id as string);
  const soldMap = new Map<string, number>();
  if (ids.length) {
    const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", ids);
    for (const row of ticketRows ?? []) {
      const eid = row.event_id as string;
      soldMap.set(eid, (soldMap.get(eid) ?? 0) + 1);
    }
  }

  const cards: EventCardProps[] = eventRows.flatMap((ev) => {
    const slug = ev.slug as string;
    const listingKind = normalizeEventListingKind((ev as { listing_kind?: string | null }).listing_kind);
    const visibility = String((ev as { visibility?: unknown }).visibility ?? "");
    const isPublishedPerformance = visibility === "published" && listingKind === "performance";
    if (!isPublishedPerformance && slug !== FEATURED_SPECIAL_SLUG) return [];

    const copy = resolveEventCopy(
      {
        title: ev.title as string,
        description: ev.description as string | undefined,
        title_pl: (ev as { title_pl?: string | null }).title_pl,
        description_pl: (ev as { description_pl?: string | null }).description_pl,
        title_uk: (ev as { title_uk?: string | null }).title_uk,
        description_uk: (ev as { description_uk?: string | null }).description_uk,
      },
      locale,
    );
    if (!copy) return [];
    const totalTickets = ev.total_tickets as number;
    const sold = soldMap.get(ev.id as string) ?? 0;
    const remaining = totalTickets - sold;
    const status = resolveEventMarketingStatus({
      startsAt: ev.starts_at as string,
      remaining,
      totalTickets,
    });
    const pricing = eventPriceDetails({
      starts_at: ev.starts_at as string,
      price_grosze: ev.price_grosze as number,
      day_of_event_price_grosze: ev.day_of_event_price_grosze as number | null,
      listing_kind: listingKind,
      discount_periods: (ev as { discount_periods?: unknown }).discount_periods,
    });
    return [
      {
        slug,
        title: copy.title,
        venue: ev.venue as string,
        startsAt: ev.starts_at as string,
        priceGrosze: pricing.effectivePriceGrosze,
        dayOfEventPriceGrosze: pricing.dayOfEventPriceGrosze,
        isEventDayPrice: pricing.isEventDay && pricing.hasDayOfEventIncrease,
        imageUrl: (ev.image_url as string | null) ?? null,
        imageFocalX:
          typeof (ev as { image_focal_x?: unknown }).image_focal_x === "number"
            ? (ev as { image_focal_x: number }).image_focal_x
            : null,
        imageFocalY:
          typeof (ev as { image_focal_y?: unknown }).image_focal_y === "number"
            ? (ev as { image_focal_y: number }).image_focal_y
            : null,
        locale,
        status,
        listingKind,
        eventLanguage: (ev as { event_language?: never }).event_language,
      },
    ];
  });

  return { cards: sortEventsForMarketing(cards), error: null };
}
