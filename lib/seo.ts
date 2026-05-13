import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { getPublicAppUrl } from "@/lib/publicAppUrl";

const OG_LOCALE: Record<AppLocale, string> = {
  pl: "pl_PL",
  uk: "uk_UA",
  ru: "ru_RU",
};

/** Геопривязка сервиса (Польша / Варшава) для meta other + поисковых сигналов. */
const GEO_OTHER: Record<string, string> = {
  "geo.region": "PL",
  "geo.placename": "Warsaw",
  ICBM: "52.2297, 21.0122",
};

export function getSiteMetadataBase(): URL | undefined {
  const raw = getPublicAppUrl();
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

/** path без локали: "/" или "/events/slug" */
export function canonicalPath(locale: AppLocale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const tail = normalized === "/" ? "" : normalized;
  return `/${locale}${tail}`;
}

function absoluteUrl(locale: AppLocale, path: string): string | undefined {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}${canonicalPath(locale, path)}`;
}

function hreflangLanguages(path: string): Record<string, string> | undefined {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
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

export function truncateMetaDescription(text: string | null | undefined, max = 158): string {
  if (text == null || typeof text !== "string") return "";
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

export type PublicPageMetaInput = {
  locale: AppLocale;
  /** Путь без локали, напр. "/" или "/events/improv" */
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  ogType?: "website" | "article";
  /** Абсолютные URL изображений для OG/Twitter */
  ogImages?: { url: string; width?: number; height?: number; alt?: string }[];
  robots?: Metadata["robots"];
};

/**
 * Единый шаблон SEO: canonical, hreflang, Open Graph, Twitter, geo meta.
 */
export function buildPublicPageMetadata(input: PublicPageMetaInput): Metadata {
  const url = absoluteUrl(input.locale, input.path);
  const languages = hreflangLanguages(input.path);
  const ogLocale = OG_LOCALE[input.locale];
  const alternateLocale = routing.locales.filter((l) => l !== input.locale).map((l) => OG_LOCALE[l]);

  return {
    title: input.title,
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
      siteName: "PopularTickets",
      locale: ogLocale,
      alternateLocale,
      type: input.ogType ?? "website",
      ...(input.ogImages?.length ? { images: input.ogImages } : {}),
    },
    twitter: {
      card: input.ogImages?.length ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(input.ogImages?.length ? { images: input.ogImages.map((i) => i.url) } : {}),
    },
    robots: input.robots ?? { index: true, follow: true },
    other: { ...GEO_OTHER },
  };
}
