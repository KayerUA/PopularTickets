import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";

const OG_LOCALE: Record<AppLocale, string> = {
  pl: "pl_PL",
  uk: "uk_UA",
  ru: "ru_RU",
};

const GEO_OTHER: Record<string, string> = {
  "geo.region": "PL",
  "geo.placename": "Warsaw",
  ICBM: "52.2297, 21.0122",
};

export function poetCanonicalPath(locale: AppLocale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const tail = normalized === "/" ? "" : normalized;
  return `/${locale}${tail}`;
}

function poetAbsoluteUrl(locale: AppLocale, path: string): string | undefined {
  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}${poetCanonicalPath(locale, path)}`;
}

function poetHreflangLanguages(path: string): Record<string, string> | undefined {
  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  if (!base) return undefined;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const tail = normalized === "/" ? "" : normalized;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${base}/${loc}${tail}`;
  }
  languages["x-default"] = `${base}/${routing.defaultLocale}${tail}`;
  return languages;
}

export type PoetPageMetaInput = {
  locale: AppLocale;
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  ogImages?: { url: string; width?: number; height?: number; alt?: string }[];
};

export function buildPoetPageMetadata(input: PoetPageMetaInput): Metadata {
  const url = poetAbsoluteUrl(input.locale, input.path);
  const languages = poetHreflangLanguages(input.path);
  const ogLocale = OG_LOCALE[input.locale];
  const alternateLocale = routing.locales.filter((l) => l !== input.locale).map((l) => OG_LOCALE[l]);

  let metadataBase: URL | undefined;
  const rawBase = getPoetSiteUrl();
  if (rawBase) {
    try {
      metadataBase = new URL(rawBase);
    } catch {
      metadataBase = undefined;
    }
  }

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: { default: input.title, template: "%s · Popular Poet" },
    description: input.description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: {
      ...(url ? { canonical: url } : {}),
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: url ?? undefined,
      siteName: "Popular Poet",
      locale: ogLocale,
      alternateLocale,
      type: "website",
      ...(input.ogImages?.length ? { images: input.ogImages } : {}),
    },
    twitter: {
      card: input.ogImages?.length ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(input.ogImages?.length ? { images: input.ogImages.map((i) => i.url) } : {}),
    },
    robots: { index: true, follow: true },
    other: { ...GEO_OTHER },
    category: "entertainment",
  };
}
