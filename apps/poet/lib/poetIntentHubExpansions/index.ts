import type { AppLocale } from "@/i18n/routing";
import type { PoetIntentHubExpansion } from "@/lib/poetIntentHubTypes";
import { PL_KURS_AKTORSKI_WARSZAWA } from "@/lib/poetIntentHubExpansions/pl-kurs-aktorski";
import { RU_AKTERSKAYA_MAYSTERNOST } from "@/lib/poetIntentHubExpansions/ru-akterskaya-maysternost";
import { RU_AKTERSKIE_KURSY_VARSHAVA } from "@/lib/poetIntentHubExpansions/ru-akterskie-kursy";
import { RU_IMPROVIZATSIYA_VARSHAVA } from "@/lib/poetIntentHubExpansions/ru-improvizatsiya";
import { RU_PROBNOE_ZANYATIE } from "@/lib/poetIntentHubExpansions/ru-probnoe";
import { UK_AKTORSKI_KURSY_VARSHAVA } from "@/lib/poetIntentHubExpansions/uk-aktorski-kursy";
import { UK_PROBNE_ZANYATTYA } from "@/lib/poetIntentHubExpansions/uk-probne-zanyattya";

const EXPANSIONS: Partial<Record<AppLocale, Record<string, PoetIntentHubExpansion>>> = {
  ru: {
    "improvizatsiya-varshava": RU_IMPROVIZATSIYA_VARSHAVA,
    "akterskie-kursy-varshava": RU_AKTERSKIE_KURSY_VARSHAVA,
    "akterskaya-maysternost-varshava": RU_AKTERSKAYA_MAYSTERNOST,
    "probnoe-zanyatie-varshava": RU_PROBNOE_ZANYATIE,
  },
  pl: {
    "kurs-aktorski-warszawa": PL_KURS_AKTORSKI_WARSZAWA,
  },
  uk: {
    "aktorski-kursy-varshava": UK_AKTORSKI_KURSY_VARSHAVA,
    "probne-zanyattya-varshava": UK_PROBNE_ZANYATTYA,
  },
};

export function getPoetIntentHubExpansion(locale: AppLocale, slug: string): PoetIntentHubExpansion | undefined {
  return EXPANSIONS[locale]?.[slug];
}

export function isExpandedPoetIntentHub(locale: AppLocale, slug: string): boolean {
  return Boolean(getPoetIntentHubExpansion(locale, slug));
}
