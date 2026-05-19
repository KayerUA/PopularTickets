/**
 * Publiczne dane operatora serwisu (skrót do stopki i strony /firma).
 * Przy zmianie wpisu w KRS — zaktualizuj tutaj.
 */
export const COMPANY = {
  productName: "PopularTickets",
  /** Krótka nazwa handlowa / prawna do komunikatów dla klienta */
  legalNameShort: "POPULAR POET Sp. z o.o.",
  /** Pełna nazwa zgodna z rejestrem (stopka, dokumenty) */
  legalName: "POPULAR POET SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ",
  krs: "0001156243",
  nip: "1133159208",
  regon: "540923962",
  address: {
    street: "ul. FLORIAŃSKA 6/02",
    postalCode: "03-707",
    city: "WARSZAWA",
    voivodeship: "MAZOWIECKIE",
  },
} as const;

/**
 * Oficjalne dokumenty Przelewy24 (tylko domena operatora).
 * Materiały graficzne (logo, znaki): https://www.przelewy24.pl/do-pobrania#materialy-graficzne
 */
export const PRZELEWY24_LINKS = {
  site: "https://www.przelewy24.pl/",
  regulamin: "https://www.przelewy24.pl/regulamin",
  privacy: "https://www.przelewy24.pl/polityka-prywatnosci",
  merchants: "https://www.przelewy24.pl/dla-firmy",
  /** Pakiety promocyjne / logotypy dla sklepu (stosować zgodnie z wytycznymi P24). */
  graphics: "https://www.przelewy24.pl/do-pobrania#materialy-graficzne",
  /** REST API (rejestracja transakcji itd.). */
  apiDocs: "https://developers.przelewy24.pl/index.php?pl#tag/Transaction-service-API",
} as const;

export function companyAddressOneLine(): string {
  const a = COMPANY.address;
  return `${a.street}, ${a.postalCode} ${a.city}`;
}

/** Kontakt telefoniczny sklepu (widoczny m.in. na /firma — wymóg weryfikacji Przelewy24). */
export const PUBLIC_CONTACT_PHONE = {
  tel: "+48452203802",
  display: "+48 452 203 802",
} as const;

export function publicContactPhoneTel(): string {
  return PUBLIC_CONTACT_PHONE.tel;
}

export function publicContactPhoneDisplay(): string {
  return PUBLIC_CONTACT_PHONE.display;
}

/** Fallback, если в окружении не задан NEXT_PUBLIC_CONTACT_EMAIL (страница /firma, футер, zwroty). */
const FALLBACK_PUBLIC_CONTACT_EMAIL = "severkelli@gmail.com";

/** Публичный контакт для покупателей (заказы, общие вопросы). */
export function publicContactEmail(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
  return fromEnv || FALLBACK_PUBLIC_CONTACT_EMAIL;
}

/** Отдельный ящик для zwroty/reklamacje; иначе тот же, что и основной контакт. */
export function publicReturnsEmail(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_RETURNS_EMAIL ?? "").trim();
  return fromEnv || publicContactEmail();
}

export function companyFooterShort(): string {
  return `${COMPANY.legalNameShort} · NIP ${COMPANY.nip} · KRS ${COMPANY.krs} · ${companyAddressOneLine()}`;
}

export function krsPublicSearchUrl(): string {
  return `https://wyszukiwarka-krs.ms.gov.pl/details?query=${encodeURIComponent(COMPANY.krs)}`;
}
