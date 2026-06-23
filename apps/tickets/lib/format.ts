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

const WARSAW_TZ = "Europe/Warsaw";

export type EventDateTimeParts = {
  weekday: string;
  date: string;
  time: string;
};

/** День недели отдельно — для крупного отображения на карточках и странице события. */
export function formatEventDateTimeParts(iso: string, locale: AppLocale): EventDateTimeParts | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const tag = localeTag[locale];
  const weekday = new Intl.DateTimeFormat(tag, { weekday: "long", timeZone: WARSAW_TZ }).format(d);
  const date = new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: WARSAW_TZ,
  }).format(d);
  const time = new Intl.DateTimeFormat(tag, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WARSAW_TZ,
  }).format(d);

  return { weekday, date, time };
}

export function capitalizeWeekday(weekday: string, locale: AppLocale = "ru"): string {
  if (!weekday) return weekday;
  return weekday.charAt(0).toLocaleUpperCase(localeTag[locale]) + weekday.slice(1);
}

export function formatEventDateTime(iso: string, locale: AppLocale): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: WARSAW_TZ,
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
