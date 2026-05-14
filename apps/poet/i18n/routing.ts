import { defineRouting } from "next-intl/routing";

/**
 * Дефолт `uk` — основная ЦА RU/UK; `pl` для польского контекста и SEO.
 * Cookie `NEXT_LOCALE` + Accept-Language при первом заходе на `/`.
 */
export const routing = defineRouting({
  locales: ["pl", "uk", "ru"],
  defaultLocale: "uk",
  localePrefix: "always",
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];
