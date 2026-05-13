import type { AppLocale } from "@/i18n/routing";
import { canonicalPath } from "@/lib/seo";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
type EventRow = {
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  image_url: string | null;
  price_grosze: number;
  slug: string;
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
    /** Язык страницы события (доп. сигнал для поиска; основной контент — локаль страницы). */
    inLanguage: locale,
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
            name: "PopularTickets / POPULAR POET Sp. z o.o.",
            url: base ? `${base}${canonicalPath(locale, "/firma")}` : undefined,
          },
          offers: {
            "@type": "Offer",
            url: eventUrl,
            price: (event.price_grosze / 100).toFixed(2),
            priceCurrency: "PLN",
            availability,
            validFrom: new Date().toISOString().slice(0, 10),
            /** Билет/оферта до начала события (рекомендуется для Event rich results). */
            validThrough: event.starts_at,
          },
        }
      : {}),
  };
}

/** JSON-LD WebSite + Organization для главной. */
export function buildHomeJsonLd(locale: AppLocale): object {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  const siteUrl = base ? `${base}${canonicalPath(locale, "/")}` : undefined;
  const orgUrl = base ? `${base}${canonicalPath(locale, "/firma")}` : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "PopularTickets",
        url: siteUrl,
        inLanguage: locale,
      },
      {
        "@type": "Organization",
        name: "POPULAR POET Sp. z o.o.",
        legalName: "POPULAR POET SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ",
        url: orgUrl,
        address: {
          "@type": "PostalAddress",
          streetAddress: "ul. FLORIAŃSKA 6/02",
          postalCode: "03-707",
          addressLocality: "Warszawa",
          addressRegion: "MAZOWIECKIE",
          addressCountry: "PL",
        },
      },
    ],
  };
}
