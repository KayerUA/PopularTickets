import type { AppLocale } from "@/i18n/routing";

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
