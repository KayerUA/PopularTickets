export const RATING_BOEING_OFFER_SLUG = "spektakl-boing-boing-scena-kocjana-2026-10-04";
export const RATING_BOEING_OFFER_PROMO = "RATE70";
export const RATING_BOEING_OFFER_GIFT = "audience";
export const NEWSLETTER_BOEING_OFFER_PROMO = "MAIL70";
export const NEWSLETTER_BOEING_OFFER_GIFT = "mail";

const SILENT_GIFT_PROMOS: Record<string, string> = {
  [RATING_BOEING_OFFER_GIFT]: RATING_BOEING_OFFER_PROMO,
  [NEWSLETTER_BOEING_OFFER_GIFT]: NEWSLETTER_BOEING_OFFER_PROMO,
};

export type RatingBoeingOfferView = {
  eventId: string;
  slug: string;
  title: string;
  venue: string;
  startsAt: string;
  imageUrl: string | null;
  imageFocalX: number | null;
  imageFocalY: number | null;
  regularGrosze: number;
  saleGrosze: number;
};

export function ratingOfferPrices(unitPriceGrosze: number, discountFixedGrosze: number) {
  const regular = Math.max(0, Math.round(unitPriceGrosze));
  const off = Math.max(0, Math.round(discountFixedGrosze));
  return { regularGrosze: regular, saleGrosze: Math.max(0, regular - off) };
}

export function shouldShowRatingOffer(params: {
  currentEventId: string;
  offerEventId: string;
  startsAt: string;
  saleGrosze: number;
  now?: number;
}) {
  if (!params.currentEventId || params.currentEventId === params.offerEventId) return false;
  if (params.saleGrosze <= 0) return false;
  return Date.parse(params.startsAt) > (params.now ?? Date.now());
}

export function ratingOfferHref(slug: string) {
  return `/events/${slug}?gift=${encodeURIComponent(RATING_BOEING_OFFER_GIFT)}`;
}

export function newsletterOfferHref(slug: string) {
  return `/events/${slug}?gift=${encodeURIComponent(NEWSLETTER_BOEING_OFFER_GIFT)}`;
}

export function promoFromPublicQuery(params: { slug: string; promo?: string | null; gift?: string | null }) {
  if (params.slug === RATING_BOEING_OFFER_SLUG && params.gift) {
    const mapped = SILENT_GIFT_PROMOS[params.gift];
    if (mapped) return mapped;
  }
  return params.promo?.trim() || undefined;
}

export function isSilentRatingOfferPromo(code: string | null | undefined) {
  const normalized = (code ?? "").trim().toUpperCase();
  return normalized === RATING_BOEING_OFFER_PROMO || normalized === NEWSLETTER_BOEING_OFFER_PROMO;
}

export function shortOfferVenue(venue: string) {
  const afterDash = venue.split("—")[1]?.trim() ?? venue;
  return afterDash.split(",")[0]?.trim() || venue;
}

/** Короткое имя для кнопки в письме: «Труффальдино из Бергамо», иначе кусок до тире. */
export function shortRatingEventTitle(title: string) {
  const quoted = title.match(/[«„"]([^»“"]+)[»“"]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  return title.split(" — ")[0]?.trim() || title.trim();
}

export function formatOfferZloty(grosze: number) {
  const n = grosze / 100;
  if (Number.isInteger(n)) return `${n} zł`;
  return `${n.toFixed(2).replace(".", ",")} zł`;
}
