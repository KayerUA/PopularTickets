import type { AppLocale } from "@/i18n/routing";
import { canonicalPath } from "@/lib/seo";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { COMPANY } from "@/lib/company";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";
import { THEATRE_INSTAGRAM_URL, THEATRE_TELEGRAM_URL, THEATRE_YOUTUBE_URL } from "@/lib/social";

type EventRow = {
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  image_url: string | null;
  price_grosze: number;
  slug: string;
};

const EVENT_LANG: Record<AppLocale, string> = {
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
};

/**
 * Schema.org Event для страницы события (Google Rich Results / GEO).
 */
export function buildEventJsonLd(
  event: EventRow,
  locale: AppLocale,
  opts: { remaining: number; soldOut: boolean }
): object {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  const path = `/events/${event.slug}`;
  const eventUrl = base ? `${base}${canonicalPath(locale, path)}` : undefined;
  const availability = opts.soldOut || opts.remaining <= 0 ? "https://schema.org/SoldOut" : "https://schema.org/InStock";

  const images: string[] = [];
  if (event.image_url) {
    if (event.image_url.startsWith("http://") || event.image_url.startsWith("https://")) {
      images.push(event.image_url);
    } else if (base) {
      images.push(new URL(event.image_url, base).toString());
    }
  }

  const rawDesc = typeof event.description === "string" ? event.description : "";
  const desc = rawDesc.replace(/\s+/g, " ").trim().slice(0, 2000);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: desc || event.title,
    startDate: event.starts_at,
    inLanguage: EVENT_LANG[locale],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    ...(images.length ? { image: images } : {}),
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        addressCountry: "PL",
        streetAddress: event.venue,
      },
    },
    ...(eventUrl
      ? {
          url: eventUrl,
          organizer: {
            "@type": "Organization",
            name: "Popular Poet",
            url: POPULAR_POET_SITE_URL.replace(/\/$/, ""),
          },
          offers: {
            "@type": "Offer",
            url: eventUrl,
            price: (event.price_grosze / 100).toFixed(2),
            priceCurrency: "PLN",
            availability,
            validFrom: new Date().toISOString().slice(0, 10),
            validThrough: event.starts_at,
          },
        }
      : {}),
  };
}

export function buildBreadcrumbListJsonLd(items: { name: string; item: string }[]): object {
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

export function buildFaqPageJsonLd(mainEntity: { name: string; acceptedAnswer: { text: string } }[]): object {
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

/** JSON-LD @graph: WebSite + PopularTickets + оператор (KRS/NIP). */
export function buildHomeJsonLd(locale: AppLocale): object {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  const siteUrl = base ? `${base}${canonicalPath(locale, "/")}` : undefined;
  const orgUrl = base ? `${base}${canonicalPath(locale, "/firma")}` : undefined;
  const poet = POPULAR_POET_SITE_URL.replace(/\/$/, "");
  const sameAs = [poet, THEATRE_INSTAGRAM_URL, THEATRE_YOUTUBE_URL, THEATRE_TELEGRAM_URL].filter(Boolean);

  const sellerId = orgUrl ? `${orgUrl}#operator` : undefined;
  const brandId = siteUrl ? `${siteUrl}#brand` : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "PopularTickets",
        url: siteUrl,
        inLanguage: EVENT_LANG[locale],
        description:
          locale === "pl"
            ? "Oficjalna kasa biletowa Popular Poet w Warszawie — bilety online na show improwizowane, spektakle i wydarzenia sceniczne."
            : locale === "ru"
              ? "Официальная билетная касса Popular Poet в Варшаве — онлайн-билеты на шоу импровизации, спектакли и сценические события."
              : "Офіційна квиткова каса Popular Poet у Варшаві — онлайн-квитки на імпровізаційні шоу, вистави та сценічні події.",
        ...(brandId ? { publisher: { "@id": brandId } } : {}),
      },
      {
        "@type": "Organization",
        ...(brandId ? { "@id": brandId } : {}),
        name: "PopularTickets",
        url: siteUrl,
        description:
          locale === "pl"
            ? "Oficjalna kasa biletowa Popular Poet — sprzedaż biletów elektronicznych z QR na e-mail, płatności Przelewy24."
            : locale === "ru"
              ? "Официальная билетная касса Popular Poet — электронные билеты с QR на e-mail, оплата Przelewy24."
              : "Офіційна квиткова каса Popular Poet — електронні квитки з QR на e-mail, оплата Przelewy24.",
        parentOrganization: sellerId ? { "@id": sellerId } : undefined,
        sameAs,
      },
      {
        "@type": "Organization",
        "@id": sellerId,
        name: COMPANY.legalNameShort,
        legalName: COMPANY.legalName,
        url: orgUrl,
        taxID: COMPANY.nip,
        identifier: [
          {
            "@type": "PropertyValue",
            name: "KRS",
            value: COMPANY.krs,
          },
          {
            "@type": "PropertyValue",
            name: "REGON",
            value: COMPANY.regon,
          },
        ],
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY.address.street,
          postalCode: COMPANY.address.postalCode,
          addressLocality: COMPANY.address.city,
          addressRegion: COMPANY.address.voivodeship,
          addressCountry: "PL",
        },
      },
    ],
  };
}
