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
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(d);
}

/** Короткая дата для title (Europe/Warsaw), единый числовой формат. */
export function formatEventDateShortForTitle(iso: string): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Warsaw",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  if (!day || !month || !year) return "";
  return `${day}.${month}.${year}`;
}

/** Panel administracyjny — data po polsku. */
export function formatPlDateTime(iso: string): string {
  return formatEventDateTime(iso, "pl");
}
