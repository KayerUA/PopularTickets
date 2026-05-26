import type { AppLocale } from "@/i18n/routing";
import type { EventListingKind } from "@/lib/eventMarketingStatus";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";
import { TICKETS_INTENT_CLUSTER_SLUGS, type IntentClusterKey } from "@/lib/ticketsIntentRoutes";

/** Slug intent-страниц popularpoet.pl (зеркало poetIntentClusters). */
const POET_HUB_SLUGS: Record<string, Partial<Record<AppLocale, string>>> = {
  "acting-course": {
    pl: "kurs-aktorski-warszawa",
    uk: "aktorski-kursy-varshava",
    ru: "akterskie-kursy-varshava",
  },
  "improv-course": {
    pl: "improwizacja-kurs-warszawa",
    uk: "kurs-improvizatsii-varshava",
    ru: "improvizatsiya-varshava",
  },
  trial: {
    pl: "probnie-zajecia-warszawa",
    uk: "probne-zanyattya-varshava",
    ru: "probnoe-zanyatie-varshava",
  },
  playback: {
    pl: "playback-teatr-warszawa",
    uk: "playback-teatr-varshava",
    ru: "playback-teatr-varshava",
  },
};

function textBlob(title: string, description: string): string {
  return `${title} ${description}`.toLowerCase();
}

export function resolveEventIntentCluster(input: {
  listingKind: EventListingKind;
  title: string;
  description: string;
}): IntentClusterKey {
  if (input.listingKind === "trial") return "trial";
  const text = textBlob(input.title, input.description);
  if (text.includes("playback") || text.includes("play-back") || text.includes("плей")) return "playback";
  if (text.includes("impro") || text.includes("импров") || text.includes("імпров")) return "improv";
  return "theatre";
}

export function ticketsIntentPathForCluster(locale: AppLocale, cluster: IntentClusterKey): string | null {
  const slug = TICKETS_INTENT_CLUSTER_SLUGS[cluster]?.[locale];
  return slug ? `/${slug}` : null;
}

export function poetHubUrlForCluster(locale: AppLocale, cluster: IntentClusterKey): string | null {
  const poetCluster =
    cluster === "trial"
      ? "trial"
      : cluster === "playback"
        ? "playback"
        : cluster === "improv"
          ? "improv-course"
          : "acting-course";
  const slug = POET_HUB_SLUGS[poetCluster]?.[locale];
  if (!slug) return null;
  return `${POPULAR_POET_SITE_URL.replace(/\/+$/, "")}/${locale}/${slug}`;
}

export function eventContextLinks(
  locale: AppLocale,
  input: { listingKind: EventListingKind; title: string; description: string },
): { ticketsIntentPath: string | null; poetHubUrl: string | null; cluster: IntentClusterKey } {
  const cluster = resolveEventIntentCluster(input);
  return {
    cluster,
    ticketsIntentPath: ticketsIntentPathForCluster(locale, cluster),
    poetHubUrl: poetHubUrlForCluster(locale, cluster),
  };
}
