import type { AppLocale } from "@/i18n/routing";

export function formatPlnFromGrosze(grosze: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(grosze / 100);
}

const localeTag: Record<AppLocale, string> = {
  pl: "pl-PL",
  uk: "uk-UA",
  ru: "ru-RU",
};

export function formatEventDateTime(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(iso));
}

/** Panel administracyjny — data po polsku. */
export function formatPlDateTime(iso: string): string {
  return formatEventDateTime(iso, "pl");
}
