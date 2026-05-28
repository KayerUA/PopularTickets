import type { AppLocale } from "@/i18n/routing";
import { eventLanguageIso, normalizeEventLanguage } from "@/lib/eventLanguage";
import {
  POET_ADDRESS_COUNTRY,
  POET_ADDRESS_LOCALITY,
  POET_ADDRESS_POSTAL_CODE,
  POET_ADDRESS_STREET,
  POET_GEO_LAT,
  POET_GEO_LNG,
  POET_ORGANIZATION_ALTERNATE_NAMES,
  POET_ORGANIZATION_NAME,
  POET_THEATRE_MAPS_URL,
  poetSameAsUrls,
} from "@/lib/poetEntity";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import { poetCanonicalPath } from "@/lib/seoPoet";
import { getTicketsSiteBase, ticketsEventPage } from "@/lib/ticketsSite";
import { POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";
import { eventEndDateIso } from "@/lib/eventEndDateIso";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";

function stripJsonLdEmptyValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripJsonLdEmptyValues).filter((item) => item !== undefined && item !== null);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, stripJsonLdEmptyValues(entry)] as const)
        .filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")
    );
  }
  return value;
}

function isTheatreVenue(venue: string): boolean {
  const v = venue.toLowerCase();
  return v.includes("domaniewska") && v.includes("37");
}

function buildTrialEventJsonLd(trial: PoetTrialDisplay, locale: AppLocale): Record<string, unknown> | null {
  if (!trial.starts_at) return null;

  const ticketsBase = getTicketsSiteBase();
  const eventUrl = ticketsBase ? ticketsEventPage(locale, trial.slug) : undefined;
  const startsMs = new Date(trial.starts_at).getTime();
  const isPast = !Number.isNaN(startsMs) && startsMs < Date.now();
  const soldOut = trial.status === "sold_out" || trial.remainingTickets <= 0;
  const atTheatre = isTheatreVenue(trial.venue) || trial.venue === POPULAR_POET_TRIAL_VENUE_PL;
  const poetUrl = getPoetSiteUrl()?.replace(/\/$/, "");
  const endDate = eventEndDateIso(trial.starts_at);

  const description = (trial.body ?? trial.title).replace(/\s+/g, " ").trim().slice(0, 2000);

  return stripJsonLdEmptyValues({
    "@type": "Event",
    name: trial.title,
    description: description || trial.title,
    startDate: trial.starts_at,
    endDate,
    inLanguage: eventLanguageIso(normalizeEventLanguage(trial.eventLanguage)),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: isPast
      ? "https://schema.org/EventCompleted"
      : "https://schema.org/EventScheduled",
    ...(eventUrl ? { url: eventUrl } : {}),
    ...(trial.imageUrl ? { image: trial.imageUrl } : {}),
    ...(trial.totalTickets > 0 ? { maximumAttendeeCapacity: trial.totalTickets } : {}),
    performer: {
      "@type": "TheaterGroup",
      name: POET_ORGANIZATION_NAME,
      alternateName: POET_ORGANIZATION_ALTERNATE_NAMES,
      ...(poetUrl ? { url: poetUrl } : {}),
      sameAs: poetSameAsUrls(),
    },
    organizer: {
      "@type": "Organization",
      name: POET_ORGANIZATION_NAME,
      alternateName: POET_ORGANIZATION_ALTERNATE_NAMES,
      ...(poetUrl ? { url: poetUrl } : {}),
    },
    location: {
      "@type": "Place",
      name: "Popular Poet",
      ...(atTheatre ? { hasMap: POET_THEATRE_MAPS_URL } : {}),
      ...(atTheatre
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: POET_GEO_LAT,
              longitude: POET_GEO_LNG,
            },
          }
        : {}),
      address: {
        "@type": "PostalAddress",
        streetAddress: atTheatre ? POET_ADDRESS_STREET : trial.venue,
        addressLocality: POET_ADDRESS_LOCALITY,
        postalCode: POET_ADDRESS_POSTAL_CODE,
        addressCountry: POET_ADDRESS_COUNTRY,
      },
    },
    offers: {
      "@type": "Offer",
      ...(eventUrl ? { url: eventUrl } : {}),
      price: (trial.priceGrosze / 100).toFixed(2),
      priceCurrency: "PLN",
      availability: isPast
        ? "https://schema.org/Discontinued"
        : soldOut
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      validFrom: new Date().toISOString(),
      validThrough: endDate,
      seller: {
        "@type": "Organization",
        name: POET_ORGANIZATION_NAME,
        ...(poetUrl ? { url: poetUrl } : {}),
      },
    },
  }) as Record<string, unknown>;
}

/** ItemList + Event для календаря пробных / intent-хабов на popularpoet.pl */
export function buildPoetTrialItemListJsonLd(input: {
  trials: PoetTrialDisplay[];
  locale: AppLocale;
  listName: string;
  listUrl?: string;
  poetBaseUrl?: string;
}): Record<string, unknown> | null {
  const futureTrials = input.trials.filter((t) => {
    if (!t.starts_at) return false;
    const ms = new Date(t.starts_at).getTime();
    return !Number.isNaN(ms) && ms >= Date.now();
  });

  const itemListElement = futureTrials.flatMap((trial, index) => {
    const event = buildTrialEventJsonLd(trial, input.locale);
    if (!event) return [];
    return [
      {
        "@type": "ListItem",
        position: index + 1,
        item: event,
      },
    ];
  });

  if (!itemListElement.length) return null;

  const poetBase = input.poetBaseUrl?.replace(/\/$/, "");
  const listUrl =
    input.listUrl ??
    (poetBase ? `${poetBase}${poetCanonicalPath(input.locale, "/")}#schedule` : undefined);

  return stripJsonLdEmptyValues({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.listName,
    ...(listUrl ? { url: listUrl } : {}),
    numberOfItems: itemListElement.length,
    itemListElement,
  }) as Record<string, unknown>;
}
