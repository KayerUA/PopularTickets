import fs from "fs";
import path from "path";

/** Oficjalny pasek „flagi” / metody płatności z pakietu P24 (sekcja „Flagi” na stronie do pobrania). */
const METHODS_STRIP_CANDIDATES = ["p24-metody-platnosci.png", "p24-payment-methods.png", "p24-metody.png"] as const;

/** Logo Przelewy24 z pakietu „Logo Przelewy24” — nazwij plik jednym z poniższych po wgraniu do `public/payments/`. */
const LOGO_CANDIDATES = ["p24-logo.png", "przelewy24-logo.png", "logo-przelewy24.png"] as const;

function paymentsDir(): string {
  return path.join(process.cwd(), "public", "payments");
}

function firstExistingPublicUrl(dir: string, candidates: readonly string[]): string | null {
  for (const file of candidates) {
    if (fs.existsSync(path.join(dir, file))) return `/payments/${file}`;
  }
  return null;
}

/** Ścieżka URL do oficjalnego paska metod płatności (P24), jeśli plik jest w `public/payments/`. */
export function getP24PaymentMethodsStripPublicPath(): string | null {
  return firstExistingPublicUrl(paymentsDir(), METHODS_STRIP_CANDIDATES);
}

/** Logo operatora płatności (P24), jeśli wgrane do `public/payments/`. */
export function getP24LogoPublicPath(): string | null {
  return firstExistingPublicUrl(paymentsDir(), LOGO_CANDIDATES);
}

export type P24FooterPaymentGraphics = {
  methodsStripUrl: string | null;
  logoUrl: string | null;
};

/** Zestaw grafik pod stopkę „zaufania” płatności (opcjonalnie — wg plików w `public/payments/`). */
export function getP24FooterPaymentGraphics(): P24FooterPaymentGraphics {
  const dir = paymentsDir();
  return {
    methodsStripUrl: firstExistingPublicUrl(dir, METHODS_STRIP_CANDIDATES),
    logoUrl: firstExistingPublicUrl(dir, LOGO_CANDIDATES),
  };
}
