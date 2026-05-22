import type { AppLocale } from "@/i18n/routing";

export type GiftProductCode = "trial_gift" | "pass_4";

export type GiftProduct = {
  code: GiftProductCode;
  priceGrosze: number;
  titleKey: string;
  bodyKey: string;
};

function envGrosze(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const pln = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(pln) || pln <= 0) return fallback;
  return Math.round(pln * 100);
}

export function getGiftProducts(): GiftProduct[] {
  return [
    {
      code: "trial_gift",
      priceGrosze: envGrosze("GIFT_TRIAL_PRICE_PLN", 70),
      titleKey: "trialGiftTitle",
      bodyKey: "trialGiftBody",
    },
    {
      code: "pass_4",
      priceGrosze: envGrosze("GIFT_PASS4_PRICE_PLN", 280),
      titleKey: "pass4Title",
      bodyKey: "pass4Body",
    },
  ];
}

export function getGiftProduct(code: GiftProductCode): GiftProduct | undefined {
  return getGiftProducts().find((p) => p.code === code);
}

export function giftP24Description(code: GiftProductCode, locale: AppLocale): string {
  const prefix = locale === "pl" ? "Certyfikat" : locale === "uk" ? "Сертифікат" : "Сертификат";
  if (code === "pass_4") return `${prefix} PP · 4 zajęcia`;
  return `${prefix} PP · zajęcie próbne`;
}
