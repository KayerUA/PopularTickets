import type { AppLocale } from "@/i18n/routing";

const WARSAW = "Europe/Warsaw";

function localeTag(loc: AppLocale): string {
  if (loc === "pl") return "pl-PL";
  if (loc === "ru") return "ru-RU";
  return "uk-UA";
}

/** Ключ дня YYYY-MM-DD у календарі Варшави (групування слотів). */
export function poetTrialDayKeyWarsaw(iso: string | null): string {
  if (!iso) return "_unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "_unknown";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WARSAW,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Дата й час пробного для картки. */
export function formatPoetTrialWhen(iso: string | null, locale: AppLocale): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WARSAW,
  }).format(d);
}

/** Заголовок групи в календарі (один день). */
export function formatPoetTrialDayHeading(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: WARSAW,
  }).format(d);
}
