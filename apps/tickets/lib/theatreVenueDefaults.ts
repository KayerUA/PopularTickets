/**
 * Пробные Popular Poet всегда в театре на Domaniewskiej.
 * Адрес только по-польски (не переводить для других локалей UI).
 */
export const POPULAR_POET_TRIAL_VENUE_PL =
  "Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42";

/** Google Maps — театр Popular Poet (Domaniewska 37). */
export const POPULAR_POET_THEATRE_MAPS_URL = "https://maps.app.goo.gl/BtaKyKYvp6nGZbx37";

/** Индекс и координаты площадки (Centrum biznesowe Zepter, Domaniewska 37). */
export const POPULAR_POET_THEATRE_POSTAL_CODE = "02-677";
export const POPULAR_POET_THEATRE_GEO = { lat: 52.1783, lng: 21.0034 } as const;

const LEGACY_THEATRE_MAPS_URL_FRAGMENT = "jz9E6JUn8rcymRoH7";

/** Событие проходит в театре на Domaniewskiej 37 (пробные или performance с этим адресом). */
export function isPopularPoetTheatreVenue(venue: string | null | undefined): boolean {
  const v = (venue ?? "").toLowerCase();
  if (!v.trim()) return false;
  return v.includes("domaniewska") && v.includes("37");
}

export type EventListingKind = "performance" | "trial";

/** Дефолтная ссылка на карту для нового события (пустая строка — если не применимо). */
export function defaultMapsUrlForEvent(
  venue: string,
  listingKind: EventListingKind,
): string {
  if (listingKind === "trial") return POPULAR_POET_THEATRE_MAPS_URL;
  if (isPopularPoetTheatreVenue(venue)) return POPULAR_POET_THEATRE_MAPS_URL;
  return "";
}

/** Перед сохранением: подставить дефолт или заменить устаревший URL театра. */
export function resolveEventMapsUrlForSave(
  mapsUrl: string,
  venue: string,
  listingKind: EventListingKind,
): string | null {
  const trimmed = mapsUrl.trim();
  if (trimmed) {
    if (
      trimmed.includes(LEGACY_THEATRE_MAPS_URL_FRAGMENT) &&
      (listingKind === "trial" || isPopularPoetTheatreVenue(venue))
    ) {
      return POPULAR_POET_THEATRE_MAPS_URL;
    }
    return trimmed;
  }
  const def = defaultMapsUrlForEvent(venue, listingKind);
  return def || null;
}
