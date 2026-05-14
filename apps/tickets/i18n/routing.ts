import { defineRouting } from "next-intl/routing";

/**
 * Локаль при первом заходе на `/` (без префикса): из cookie `NEXT_LOCALE`, иначе из
 * заголовка Accept-Language браузера, иначе `defaultLocale`. Выбор в LocaleSwitcher
 * записывает cookie — повторные визиты идут сразу на выбранный язык.
 */
export const routing = defineRouting({
  locales: ["pl", "uk", "ru"],
  defaultLocale: "pl",
  localePrefix: "always",
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];
