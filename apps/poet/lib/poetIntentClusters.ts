import { routing, type AppLocale } from "@/i18n/routing";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";
import { poetCanonicalPath } from "@/lib/seoPoet";

/** Тематический кластер intent-страниц (hreflang между локалями с разными slug). */
export type PoetIntentClusterId =
  | "acting-course"
  | "acting-workshops"
  | "improv-course"
  | "trial"
  | "playback"
  | "beginners"
  | "community-alone";

/** Slug по локали для каждого кластера (не все локали обязаны иметь страницу). */
export const POET_INTENT_CLUSTER_SLUGS: Record<PoetIntentClusterId, Partial<Record<AppLocale, string>>> = {
  "acting-course": {
    pl: "kurs-aktorski-warszawa",
    uk: "aktorski-kursy-varshava",
    ru: "akterskie-kursy-varshava",
  },
  "acting-workshops": {
    pl: "warsztaty-aktorskie-warszawa",
    uk: "aktorska-maysternist-varshava",
    ru: "akterskaya-maysternost-varshava",
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
  beginners: {
    pl: "kurs-dla-poczatkujacych-warszawa",
    uk: "kurs-dlya-pochatkivtsiv-varshava",
    ru: "kurs-dlya-nachinayushchih-varshava",
  },
  "community-alone": {
    pl: "gdzie-isc-samemu-warszawa",
    uk: "kudy-pity-samostijno-varshava",
    ru: "kuda-poyti-odnomu-varshava",
  },
};

export function poetIntentClusterForSlug(locale: AppLocale, slug: string): PoetIntentClusterId | undefined {
  for (const [cluster, map] of Object.entries(POET_INTENT_CLUSTER_SLUGS) as [
    PoetIntentClusterId,
    Partial<Record<AppLocale, string>>,
  ][]) {
    if (map[locale] === slug) return cluster;
  }
  return undefined;
}

/** Полные URL hreflang для intent-страницы (только локали, где есть slug). */
export function poetIntentHreflangUrls(
  locale: AppLocale,
  slug: string,
): Record<string, string> | undefined {
  const cluster = poetIntentClusterForSlug(locale, slug);
  if (!cluster) return undefined;

  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  if (!base) return undefined;

  const map = POET_INTENT_CLUSTER_SLUGS[cluster];
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const s = map[loc];
    if (s) languages[loc] = `${base}${poetCanonicalPath(loc, `/${s}`)}`;
  }
  const defaultSlug = map[routing.defaultLocale] ?? map.ru ?? map.pl ?? map.uk;
  if (defaultSlug) {
    languages["x-default"] = `${base}${poetCanonicalPath(routing.defaultLocale, `/${defaultSlug}`)}`;
  }
  return Object.keys(languages).length ? languages : undefined;
}
