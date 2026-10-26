import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eventRatingPreviewToken, eventRatingToken } from "./tokens";
export { eventRatingOrderId, eventRatingPreviewEventId, isEventRatingSigningConfigured } from "./tokens";
import type { AppLocale } from "@/i18n/routing";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { resolveEventCopy } from "@/lib/contentI18n";
import { resolveApplicablePromoCode } from "@/lib/promoCodes";
import {
  RATING_BOEING_OFFER_PROMO,
  RATING_BOEING_OFFER_SLUG,
  ratingOfferPrices,
  shouldShowRatingOffer,
  type RatingBoeingOfferView,
} from "./offer";
export type { RatingBoeingOfferView } from "./offer";

export async function eventRatingLink(orderId: string, locale: AppLocale) {
  const base = getPublicAppUrl();
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL не задан");
  return `${base}/${locale}/rate/${await eventRatingToken(orderId)}`;
}

export async function eventRatingPreviewLink(eventId: string, locale: AppLocale) {
  const base = getPublicAppUrl();
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL не задан");
  return `${base}/${locale}/rate/event/${await eventRatingPreviewToken(eventId)}`;
}

export async function loadRatingBoeingOffer(
  db: SupabaseClient,
  currentEventId: string,
  locale: AppLocale,
): Promise<RatingBoeingOfferView | null> {
  const { data: event } = await db
    .from("events")
    .select("id,slug,title,title_pl,title_uk,venue,starts_at,price_grosze,image_url,image_focal_x,image_focal_y,listing_kind,visibility")
    .eq("slug", RATING_BOEING_OFFER_SLUG)
    .in("visibility", ["published", "unlisted"])
    .maybeSingle();
  if (!event) return null;

  const promo = await resolveApplicablePromoCode(db, RATING_BOEING_OFFER_PROMO, {
    id: event.id,
    listingKind: event.listing_kind,
  });
  if (!promo?.discountFixedGrosze) return null;

  const { regularGrosze, saleGrosze } = ratingOfferPrices(event.price_grosze, promo.discountFixedGrosze);
  if (
    !shouldShowRatingOffer({
      currentEventId,
      offerEventId: event.id,
      startsAt: event.starts_at,
      saleGrosze,
    })
  ) {
    return null;
  }

  const copy = resolveEventCopy(event, locale);
  return {
    eventId: event.id,
    slug: event.slug,
    title: copy?.title ?? event.title,
    venue: event.venue,
    startsAt: event.starts_at,
    imageUrl: event.image_url,
    imageFocalX: event.image_focal_x,
    imageFocalY: event.image_focal_y,
    regularGrosze,
    saleGrosze,
  };
}
