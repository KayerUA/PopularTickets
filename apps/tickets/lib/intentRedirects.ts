import type { AppLocale } from "@/i18n/routing";
import { TICKETS_INTENT_CLUSTER_SLUGS } from "@/lib/ticketsIntentRoutes";

export function ticketsIntentRedirect(locale: AppLocale, slug: string): string | null {
  const slugs = TICKETS_INTENT_CLUSTER_SLUGS;
  if (slug === slugs.evening[locale]) return `/${locale}/${slugs.leisure[locale]}`;
  if (slug === slugs.events[locale]) return `/${locale}/${slugs.afisha[locale]}`;
  if (slug === slugs.playback[locale]) return `/${locale}/events/shou-play-back`;
  if (slug === slugs.trial[locale]) return `https://www.popularpoet.pl/${locale}/${slugs.trial[locale]}`;
  return null;
}
