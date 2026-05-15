import { THEATRE_INSTAGRAM_URL, THEATRE_TELEGRAM_URL, THEATRE_YOUTUBE_URL } from "@/lib/social";

/** Одна каноническая сущность для фактов, schema.org и футера (без маркетинговых вариаций). */
export const POET_ORGANIZATION_NAME = "Popular Poet";

export const POET_ADDRESS_STREET = "ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42";
export const POET_ADDRESS_LOCALITY = "Warszawa";
export const POET_ADDRESS_COUNTRY = "PL";

/** Приблизительные координаты (центр Варшавы; при появлении точных — заменить). */
export const POET_GEO_LAT = 52.185;
export const POET_GEO_LNG = 21.0;

export function poetSameAsUrls(): string[] {
  return [THEATRE_INSTAGRAM_URL, THEATRE_YOUTUBE_URL, THEATRE_TELEGRAM_URL].filter(Boolean);
}

export function poetPostalAddress(): {
  streetAddress: string;
  addressLocality: string;
  addressCountry: string;
} {
  return {
    streetAddress: POET_ADDRESS_STREET,
    addressLocality: POET_ADDRESS_LOCALITY,
    addressCountry: POET_ADDRESS_COUNTRY,
  };
}
