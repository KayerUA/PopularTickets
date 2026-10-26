import type { AppLocale } from "@/i18n/routing";
import { poetCanonicalPath } from "@/lib/seoPoet";
import { courseDetails } from "@/lib/courseDetails";
import {
  POET_ADDRESS_COUNTRY,
  POET_ADDRESS_LOCALITY,
  POET_ADDRESS_POSTAL_CODE,
  POET_ADDRESS_STREET,
  POET_GEO_LAT,
  POET_GEO_LNG,
  POET_ORGANIZATION_ALTERNATE_NAMES,
  POET_ORGANIZATION_NAME,
  POET_PUBLIC_PHONE,
  POET_THEATRE_MAPS_URL,
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

  const orgId = `${baseUrl.replace(/\/$/, "")}#organization`;
  const placeId = `${baseUrl.replace(/\/$/, "")}#place`;
  const teacherId = `${baseUrl.replace(/\/$/, "")}#stepan`;

  const postal = {
    "@type": "PostalAddress",
    streetAddress: POET_ADDRESS_STREET,
    postalCode: POET_ADDRESS_POSTAL_CODE,
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
        alternateName: POET_ORGANIZATION_ALTERNATE_NAMES,
        url,
        ...(logoUrl ? { logo: { "@type": "ImageObject", url: logoUrl } } : {}),
        sameAs,
        employee: { "@id": teacherId },
      },
      {
        "@type": "Person",
        "@id": teacherId,
        name: "Степан Баранцов",
        jobTitle: "Режиссёр, педагог актёрского мастерства",
        image: `${baseUrl.replace(/\/$/, "")}/images/teachers/stepan-barantsov.webp`,
        worksFor: { "@id": orgId },
        knowsLanguage: ["ru"],
        sameAs: ["https://ideaactors.pl/ru", "https://t.me/Stefan_stepp"],
      },
      {
        "@type": ["LocalBusiness", "PerformingArtsTheater"],
        "@id": placeId,
        name: POET_ORGANIZATION_NAME,
        alternateName: POET_ORGANIZATION_ALTERNATE_NAMES,
        url,
        parentOrganization: { "@id": orgId },
        address: postal,
        telephone: POET_PUBLIC_PHONE.tel,
        hasMap: POET_THEATRE_MAPS_URL,
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
  courseSlug?: string;
}): Record<string, unknown> {
  const details = input.courseSlug ? courseDetails(input.courseSlug) : null;
  const base = new URL(input.providerUrl).origin;
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage,
    provider: {
      "@type": "Organization",
      "@id": `${base}#organization`,
      name: POET_ORGANIZATION_NAME,
      alternateName: POET_ORGANIZATION_ALTERNATE_NAMES,
      url: input.providerUrl,
    },
    ...(details ? {
      offers: { "@type": "Offer", price: details.pricePerBlock, priceCurrency: "PLN", name: "4 занятия", url: input.url },
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "Onsite", courseWorkload: `PT${details.lessons * 2}H`, instructor: { "@id": `${base}#stepan` }, maximumAttendeeCapacity: details.groupSize, location: { "@id": `${base}#place` } },
    } : {}),
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
