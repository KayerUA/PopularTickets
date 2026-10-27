import { POET_INTENT_CLUSTER_SLUGS } from "@/lib/poetIntentClusters";
import type { AppLocale } from "@/i18n/routing";

export function poetIntentRedirect(locale: AppLocale, slug: string): string | null {
  const slugs = POET_INTENT_CLUSTER_SLUGS;
  if (slug === slugs["improv-course"][locale]) return `/${locale}/kursy/improv`;
  if (locale !== "pl" && slug === slugs["acting-workshops"][locale]) return `/${locale}/kursy/acting`;
  if (slug === slugs.beginners[locale] || slug === slugs.playback[locale]) return `/${locale}/${slugs["acting-course"][locale]}`;
  if (slug === slugs["community-alone"][locale]) return `https://www.populartickets.pl/${locale}/${slug}`;
  return null;
}
