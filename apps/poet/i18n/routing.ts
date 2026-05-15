import { defineRouting } from "next-intl/routing";

/**
 * Дефолт `ru` — основной вход для RU/UK-аудитории; `pl` для польского контекста и SEO.
 * Cookie `NEXT_LOCALE` + Accept-Language при первом заходе на `/`.
 */
export const routing = defineRouting({
  locales: ["pl", "uk", "ru"],
  defaultLocale: "ru",
  localePrefix: "always",
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];
