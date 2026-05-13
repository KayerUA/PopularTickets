/**
 * Grafiki P24 w `public/payments/` — serwowane z CDN jako `/payments/...`.
 *
 * Nie używamy `fs.existsSync`: w Vercel / RSC pliki z `public/` nie muszą być
 * widoczne w systemie plików lambdy, więc sprawdzanie dysku fałszywie zwracało
 * brak plików i pokazywała się tylko stopka-tekst zamiast obrazków.
 *
 * Logo: oficjalne SVG z pakietu P24. Pola metod: PNG „bez tła” (flagi_bez_tla).
 */
export const P24_FOOTER_GRAPHICS = {
  logo: "/payments/p24-logo.svg",
  methodsStrip: "/payments/p24-metody-platnosci.png",
  /** Kompaktowy znak P24 (np. przy koszyku). */
  mark: "/payments/p24-mark.svg",
} as const;

export type P24FooterPaymentGraphics = {
  methodsStripUrl: string | null;
  logoUrl: string | null;
};

/** Wyłączenie opcjonalne (np. fork bez binariów): `NEXT_PUBLIC_HIDE_P24_FOOTER_GRAPHICS=1` */
export function getP24FooterPaymentGraphics(): P24FooterPaymentGraphics {
  if (process.env.NEXT_PUBLIC_HIDE_P24_FOOTER_GRAPHICS === "1") {
    return { methodsStripUrl: null, logoUrl: null };
  }
  return {
    logoUrl: P24_FOOTER_GRAPHICS.logo,
    methodsStripUrl: P24_FOOTER_GRAPHICS.methodsStrip,
  };
}
