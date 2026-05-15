import type { AppLocale } from "@/i18n/routing";
import { poetCanonicalPath } from "@/lib/seoPoet";
import {
  POET_ADDRESS_COUNTRY,
  POET_ADDRESS_LOCALITY,
  POET_ADDRESS_STREET,
  POET_GEO_LAT,
  POET_GEO_LNG,
  POET_ORGANIZATION_NAME,
  poetSameAsUrls,
} from "@/lib/poetEntity";

function abs(base: string, locale: AppLocale, path: string): string {
  return `${base.replace(/\/$/, "")}${poetCanonicalPath(locale, path)}`;
}

export function buildPoetOrganizationLocalGraph(input: {
  baseUrl: string;
  locale: AppLocale;
  logoUrl?: string;
  ticketsSiteUrl?: string | null;
}): Record<string, unknown> {
  const { baseUrl, locale, logoUrl, ticketsSiteUrl } = input;
  const url = abs(baseUrl, locale, "/");
  const sameAs = [...poetSameAsUrls()];
  if (ticketsSiteUrl) {
    const t = ticketsSiteUrl.replace(/\/$/, "");
    if (!sameAs.includes(t)) sameAs.push(t);
  }

  const orgId = `${url}#organization`;
  const placeId = `${url}#place`;

  const postal = {
    "@type": "PostalAddress",
    streetAddress: POET_ADDRESS_STREET,
    addressLocality: POET_ADDRESS_LOCALITY,
    addressCountry: POET_ADDRESS_COUNTRY,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: POET_ORGANIZATION_NAME,
        url,
        ...(logoUrl ? { logo: { "@type": "ImageObject", url: logoUrl } } : {}),
        sameAs,
      },
      {
        "@type": ["LocalBusiness", "PerformingArtsTheater"],
        "@id": placeId,
        name: POET_ORGANIZATION_NAME,
        url,
        parentOrganization: { "@id": orgId },
        address: postal,
        geo: {
          "@type": "GeoCoordinates",
          latitude: POET_GEO_LAT,
          longitude: POET_GEO_LNG,
        },
        sameAs,
      },
    ],
  };
}

export function buildFaqPageJsonLd(mainEntity: { name: string; acceptedAnswer: { text: string } }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: mainEntity.map((item) => ({
      "@type": "Question",
      name: item.name,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.acceptedAnswer.text,
      },
    })),
  };
}

export function buildBreadcrumbListJsonLd(items: { name: string; item: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

export function buildCourseJsonLd(input: {
  name: string;
  description: string;
  url: string;
  providerUrl: string;
  inLanguage: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage,
    provider: {
      "@type": "Organization",
      name: POET_ORGANIZATION_NAME,
      url: input.providerUrl,
    },
  };
}

export function buildWebPageJsonLd(input: { url: string; name: string; description: string }): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: input.url,
    name: input.name,
    description: input.description,
  };
}
