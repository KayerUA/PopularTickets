import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { canonicalPath } from "@/lib/seo";

/** Кластер темы → ключи в namespace IntentDiscover (messages). */
export type IntentClusterKey =
  | "evening"
  | "theatre"
  | "improv"
  | "chamber"
  | "adults"
  | "russian"
  | "leisure"
  | "events"
  | "afisha"
  | "community"
  | "playback"
  | "trial";

/** Slug по локали для hreflang (разные URL одного кластера). */
export const TICKETS_INTENT_CLUSTER_SLUGS: Record<IntentClusterKey, Partial<Record<AppLocale, string>>> = {
  evening: {
    pl: "co-robic-w-warszawie-wieczorem",
    ru: "kuda-shodit-v-varshave-vecherom",
    uk: "kudy-pity-u-varshavi-vvecheri",
  },
  theatre: {
    pl: "wydarzenia-teatralne-warszawa",
    ru: "teatr-varshava",
    uk: "teatr-varshava",
  },
  improv: {
    pl: "improwizacja-warszawa",
    ru: "improvizatsiya-varshava",
    uk: "improvizatsiya-varshava",
  },
  chamber: {
    pl: "spektakle-kameralne-warszawa",
  },
  adults: {
    pl: "wydarzenia-dla-doroslych-warszawa",
  },
  russian: {
    ru: "russkoyazychnye-meropriyatiya-varshava",
    uk: "ukrainski-podii-varshava",
  },
  leisure: {
    ru: "dosug-v-varshave",
    uk: "dozvillya-u-varshavi",
  },
  events: {
    ru: "sobytiya-v-varshave",
    uk: "podii-u-varshavi",
  },
  afisha: {
    ru: "afisha-varshava",
    uk: "afisha-varshava",
  },
  community: {
    pl: "gdzie-isc-samemu-warszawa",
    ru: "kuda-poyti-odnomu-varshava",
    uk: "kudy-pity-samostijno-varshava",
  },
  playback: {
    pl: "playback-show-warszawa",
    ru: "playback-shou-varshava",
    uk: "playback-shou-varshava",
  },
  trial: {
    pl: "probnie-zajecia-warszawa",
    ru: "probnoe-zanyatie-varshava",
    uk: "probne-zanyattya-varshava",
  },
};

/** Slug URL по локали → кластер контента. */
export const INTENT_SLUG_TO_CLUSTER: Record<AppLocale, Record<string, IntentClusterKey>> = {
  pl: {
    "co-robic-w-warszawie-wieczorem": "evening",
    "wydarzenia-teatralne-warszawa": "theatre",
    "improwizacja-warszawa": "improv",
    "spektakle-kameralne-warszawa": "chamber",
    "wydarzenia-dla-doroslych-warszawa": "adults",
    "gdzie-isc-samemu-warszawa": "community",
    "playback-show-warszawa": "playback",
    "probnie-zajecia-warszawa": "trial",
  },
  ru: {
    "kuda-shodit-v-varshave-vecherom": "evening",
    "dosug-v-varshave": "leisure",
    "sobytiya-v-varshave": "events",
    "russkoyazychnye-meropriyatiya-varshava": "russian",
    "improvizatsiya-varshava": "improv",
    "teatr-varshava": "theatre",
    "afisha-varshava": "afisha",
    "kuda-poyti-odnomu-varshava": "community",
    "playback-shou-varshava": "playback",
    "probnoe-zanyatie-varshava": "trial",
  },
  uk: {
    "kudy-pity-u-varshavi-vvecheri": "evening",
    "dozvillya-u-varshavi": "leisure",
    "podii-u-varshavi": "events",
    "ukrainski-podii-varshava": "russian",
    "improvizatsiya-varshava": "improv",
    "teatr-varshava": "theatre",
    "afisha-varshava": "afisha",
    "kudy-pity-samostijno-varshava": "community",
    "playback-shou-varshava": "playback",
    "probne-zanyattya-varshava": "trial",
  },
};

export function intentClusterForSlug(locale: AppLocale, slug: string): IntentClusterKey | undefined {
  return INTENT_SLUG_TO_CLUSTER[locale]?.[slug];
}

export function ticketsIntentHreflangUrls(
  locale: AppLocale,
  slug: string,
): Record<string, string> | undefined {
  const cluster = intentClusterForSlug(locale, slug);
  if (!cluster) return undefined;

  const base = getPublicAppUrl()?.replace(/\/$/, "");
  if (!base) return undefined;

  const map = TICKETS_INTENT_CLUSTER_SLUGS[cluster];
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const s = map[loc];
    if (s) languages[loc] = `${base}${canonicalPath(loc, `/${s}`)}`;
  }
  const defaultSlug = map[routing.defaultLocale] ?? map.ru ?? map.pl ?? map.uk;
  if (defaultSlug) {
    languages["x-default"] = `${base}${canonicalPath(routing.defaultLocale, `/${defaultSlug}`)}`;
  }
  return Object.keys(languages).length ? languages : undefined;
}

/** listing_kind для выборки событий на intent-странице. */
export function intentListingKindFilter(cluster: IntentClusterKey): "performance" | "trial" | "all" {
  if (cluster === "trial") return "trial";
  return "performance";
}

export function allIntentSlugs(): { locale: AppLocale; slug: string }[] {
  const out: { locale: AppLocale; slug: string }[] = [];
  for (const locale of routing.locales) {
    const map = INTENT_SLUG_TO_CLUSTER[locale];
    for (const slug of Object.keys(map)) {
      out.push({ locale, slug });
    }
  }
  return out;
}
