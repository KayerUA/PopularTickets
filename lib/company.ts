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

export function publicContactEmail(): string {
  return (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
}

export function companyFooterShort(): string {
  return `${COMPANY.legalNameShort} · NIP ${COMPANY.nip} · KRS ${COMPANY.krs} · ${companyAddressOneLine()}`;
}

export function krsPublicSearchUrl(): string {
  return `https://wyszukiwarka-krs.ms.gov.pl/details?query=${encodeURIComponent(COMPANY.krs)}`;
}
