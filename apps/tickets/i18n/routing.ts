import { defineRouting } from "next-intl/routing";

/**
 * Дефолт `ru` — основной вход для RU/UK-аудитории; `pl` остаётся отдельной польской
 * версией для legal/P24/SEO. Cookie `NEXT_LOCALE` + Accept-Language при первом заходе на `/`.
 */
export const routing = defineRouting({
  locales: ["pl", "uk", "ru"],
  defaultLocale: "ru",
  localePrefix: "always",
  localeDetection: true,
  alternateLinks: false,
});

export type AppLocale = (typeof routing.locales)[number];
