import type { AppLocale } from "@/i18n/routing";

export type EventLanguage = "ru" | "uk" | "ru_uk" | "pl" | "en" | "mixed";

export const DEFAULT_EVENT_LANGUAGE: EventLanguage = "ru_uk";

export function normalizeEventLanguage(raw: unknown): EventLanguage {
  if (
    raw === "ru" ||
    raw === "uk" ||
    raw === "ru_uk" ||
    raw === "pl" ||
    raw === "en" ||
    raw === "mixed"
  ) {
    return raw;
  }
  return DEFAULT_EVENT_LANGUAGE;
}

export function eventLanguageIso(language: EventLanguage): string | string[] {
  if (language === "ru") return "ru-RU";
  if (language === "uk") return "uk-UA";
  if (language === "pl") return "pl-PL";
  if (language === "en") return "en";
  if (language === "ru_uk") return ["ru-RU", "uk-UA"];
  return ["ru-RU", "uk-UA", "pl-PL"];
}

export function eventLanguageLabel(language: EventLanguage, locale: AppLocale): string {
  const labels: Record<AppLocale, Record<EventLanguage, string>> = {
    pl: {
      ru: "rosyjski",
      uk: "ukraiński",
      ru_uk: "rosyjski / ukraiński",
      pl: "polski",
      en: "angielski",
      mixed: "kilka języków",
    },
    uk: {
      ru: "російська",
      uk: "українська",
      ru_uk: "російська / українська",
      pl: "польська",
      en: "англійська",
      mixed: "кілька мов",
    },
    ru: {
      ru: "русский",
      uk: "украинский",
      ru_uk: "русский / украинский",
      pl: "польский",
      en: "английский",
      mixed: "несколько языков",
    },
  };
  return labels[locale][language];
}
