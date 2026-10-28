import type { AppLocale } from "@/i18n/routing";

/** Старые slug → канонический URL события (301). Дополняйте при переименовании. */
const LEGACY_EVENT_SLUG_TO_CANONICAL: Record<string, string> = Object.assign(Object.create(null), {
  "pimpro-bazar-club-2026-11-29": "pimpro-bazar-club-2026-12-20",
});

const LEGACY_EVENT_SLUG_REDIRECTS: Record<string, "afisha"> = Object.assign(Object.create(null), {
  "improv-swietlica-2026-05-08": "afisha",
});

export function legacyEventRedirectPath(locale: AppLocale, slug: string): string | null {
  if (slug === "improvizatsiya-probnoe-zanyatie-varshave-2026-07-29") return `/${locale}/probnoe/improv`;
  const canonical = LEGACY_EVENT_SLUG_TO_CANONICAL[slug];
  if (canonical) return `/${locale}/events/${canonical}`;

  const target = LEGACY_EVENT_SLUG_REDIRECTS[slug];
  if (target === "afisha") return `/${locale}#afisha`;
  return null;
}
