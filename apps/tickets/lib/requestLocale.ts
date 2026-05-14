import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";

/** Совпадает с `next-intl` / нашим middleware (`middleware.ts`). */
const NEXT_INTL_LOCALE_HEADER = "x-next-intl-locale";

function parseAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (routing.locales.includes(v as AppLocale)) return v as AppLocale;
  return null;
}

/**
 * Локаль для серверных переводов: заголовок от middleware next-intl,
 * затем `getLocale()`, иначе `defaultLocale`.
 */
export async function getRequestAppLocale(): Promise<AppLocale> {
  const h = await headers();
  const fromHeader = parseAppLocale(h.get(NEXT_INTL_LOCALE_HEADER));
  if (fromHeader) return fromHeader;

  try {
    const loc = await getLocale();
    if (routing.locales.includes(loc as AppLocale)) return loc as AppLocale;
  } catch {
    /* нет контекста next-intl (редкий edge-case) */
  }
  return routing.defaultLocale;
}
