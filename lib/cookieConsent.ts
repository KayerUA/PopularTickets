/** Klucz localStorage — wersjonuj przy zmianie znaczenia wartości. */
export const COOKIE_CONSENT_STORAGE_KEY = "popular-tickets-cookie-consent-v1";

export type CookieConsentValue = "essential" | "all";

export function readCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (raw === "essential" || raw === "all") return raw;
  return null;
}

export function writeCookieConsent(value: CookieConsentValue): void {
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
}
