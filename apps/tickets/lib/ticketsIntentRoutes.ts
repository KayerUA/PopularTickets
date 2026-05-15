import type { AppLocale } from "@/i18n/routing";

/** Кластер темы → ключи в namespace IntentDiscover (messages). */
export type IntentClusterKey =
  | "evening"
  | "theatre"
  | "improv"
  | "chamber"
  | "adults"
  | "russian"
  | "afisha";

/** Slug URL по локали → кластер контента. */
export const INTENT_SLUG_TO_CLUSTER: Record<AppLocale, Record<string, IntentClusterKey>> = {
  pl: {
    "co-robic-w-warszawie-wieczorem": "evening",
    "wydarzenia-teatralne-warszawa": "theatre",
    "improwizacja-warszawa": "improv",
    "spektakle-kameralne-warszawa": "chamber",
    "wydarzenia-dla-doroslych-warszawa": "adults",
  },
  ru: {
    "kuda-shodit-v-varshave-vecherom": "evening",
    "russkoyazychnye-meropriyatiya-varshava": "russian",
    "improvizatsiya-varshava": "improv",
    "teatr-varshava": "theatre",
    "afisha-varshava": "afisha",
  },
  uk: {
    "kudy-pity-u-varshavi-vvecheri": "evening",
    "ukrainski-podii-varshava": "russian",
    "improvizatsiya-varshava": "improv",
    "teatr-varshava": "theatre",
    "afisha-varshava": "afisha",
  },
};

export function intentClusterForSlug(locale: AppLocale, slug: string): IntentClusterKey | undefined {
  return INTENT_SLUG_TO_CLUSTER[locale]?.[slug];
}

export function allIntentSlugs(): { locale: AppLocale; slug: string }[] {
  const out: { locale: AppLocale; slug: string }[] = [];
  for (const locale of ["pl", "uk", "ru"] as AppLocale[]) {
    const map = INTENT_SLUG_TO_CLUSTER[locale];
    for (const slug of Object.keys(map)) {
      out.push({ locale, slug });
    }
  }
  return out;
}
