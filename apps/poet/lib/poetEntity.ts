import { THEATRE_INSTAGRAM_URL, THEATRE_TELEGRAM_URL, THEATRE_YOUTUBE_URL } from "@/lib/social";

/** Одна каноническая сущность для фактов, schema.org и футера (без маркетинговых вариаций). */
export const POET_ORGANIZATION_NAME = "Popular Poet";
export const POET_ORGANIZATION_ALTERNATE_NAMES = ["Театр Популярный Поэт", "Популярный Поэт"];

export const POET_ADDRESS_STREET = "ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42";
export const POET_ADDRESS_LOCALITY = "Warszawa";
export const POET_ADDRESS_POSTAL_CODE = "02-677";
export const POET_ADDRESS_COUNTRY = "PL";

/** Google Maps — театр Popular Poet (канонический URL, совпадает с tickets theatreVenueDefaults). */
export const POET_THEATRE_MAPS_URL = "https://maps.app.goo.gl/BtaKyKYvp6nGZbx37";

/** Legacy maps URL (Świetlica / старый GBP) — не использовать для Domaniewska 37. */
export const POET_LEGACY_THEATRE_MAPS_URL_FRAGMENT = "jz9E6JUn8rcymRoH7";

/** Координаты Centrum biznesowe Zepter, ul. Domaniewska 37 (Google Maps). */
export const POET_GEO_LAT = 52.1783;
export const POET_GEO_LNG = 21.0034;

/** Контакт театра (совпадает с PopularTickets /firma). */
export const POET_PUBLIC_PHONE = {
  tel: "+48452203802",
  display: "+48 452 203 802",
} as const;

export function poetSameAsUrls(): string[] {
  return [THEATRE_INSTAGRAM_URL, THEATRE_YOUTUBE_URL, THEATRE_TELEGRAM_URL].filter(Boolean);
}

export function poetPostalAddress(): {
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  addressCountry: string;
} {
  return {
    streetAddress: POET_ADDRESS_STREET,
    addressLocality: POET_ADDRESS_LOCALITY,
    postalCode: POET_ADDRESS_POSTAL_CODE,
    addressCountry: POET_ADDRESS_COUNTRY,
  };
}
