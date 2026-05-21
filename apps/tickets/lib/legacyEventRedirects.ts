import type { AppLocale } from "@/i18n/routing";

const LEGACY_EVENT_SLUG_REDIRECTS: Record<string, "afisha"> = {
  "improv-swietlica-2026-05-08": "afisha",
};

export function legacyEventRedirectPath(locale: AppLocale, slug: string): string | null {
  const target = LEGACY_EVENT_SLUG_REDIRECTS[slug];
  if (target === "afisha") return `/${locale}#afisha`;
  return null;
}
