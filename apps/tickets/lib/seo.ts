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

/** Путь к дефолтному OG-изображению (1200×630) на public. */
export const DEFAULT_TICKETS_OG_IMAGE_PATH = "/courses/theatre-photo.jpg";

export function defaultTicketsOgImages(base: string | undefined): { url: string; width: number; height: number; alt: string }[] | undefined {
  if (!base) return undefined;
  return [
    {
      url: `${base.replace(/\/$/, "")}${DEFAULT_TICKETS_OG_IMAGE_PATH}`,
      width: 1200,
      height: 630,
      alt: "Popular Poet — theatre and workshops in Warsaw",
    },
  ];
}

/** Hreflang для событий: все локали (resolveEventCopy всегда отдаёт fallback на ru/pl/uk). */
export function hreflangLanguagesForPublishedEvent(path: string): Record<string, string> | undefined {
  return hreflangLanguages(path);
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
  /**
   * Явные hreflang URL (полные), если путь отличается по локалям (напр. /uk/pro-* vs /pl/o-*).
   */
  hreflangAlternateUrls?: Record<string, string>;
};

/**
 * Единый шаблон SEO: canonical, hreflang, Open Graph, Twitter, geo meta.
 */
export function buildPublicPageMetadata(input: PublicPageMetaInput): Metadata {
  const url = absoluteUrl(input.locale, input.path);
  const languages = input.hreflangAlternateUrls ?? hreflangLanguages(input.path);
  const ogLocale = OG_LOCALE[input.locale];
  const alternateLocale = routing.locales.filter((l) => l !== input.locale).map((l) => OG_LOCALE[l]);
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  const ogImages =
    input.ogImages?.length ? input.ogImages : defaultTicketsOgImages(base);

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
      ...(ogImages?.length ? { images: ogImages } : {}),
    },
    twitter: {
      card: ogImages?.length ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(ogImages?.length ? { images: ogImages.map((i) => i.url) } : {}),
    },
    robots: input.robots ?? { index: true, follow: true },
    other: { ...GEO_OTHER },
  };
}
