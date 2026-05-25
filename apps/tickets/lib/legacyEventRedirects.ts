import type { AppLocale } from "@/i18n/routing";

/** Старые slug → канонический URL события (301). Дополняйте при переименовании. */
const LEGACY_EVENT_SLUG_TO_CANONICAL: Record<string, string> = {
  // "sale-14": "improvizatsiya-2026-05-21",
};

const LEGACY_EVENT_SLUG_REDIRECTS: Record<string, "afisha"> = {
  "improv-swietlica-2026-05-08": "afisha",
};

export function legacyEventRedirectPath(locale: AppLocale, slug: string): string | null {
  const canonical = LEGACY_EVENT_SLUG_TO_CANONICAL[slug];
  if (canonical) return `/${locale}/events/${canonical}`;

  const target = LEGACY_EVENT_SLUG_REDIRECTS[slug];
  if (target === "afisha") return `/${locale}#afisha`;
  return null;
}
