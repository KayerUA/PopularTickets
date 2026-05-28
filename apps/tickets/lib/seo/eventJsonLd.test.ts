import { beforeEach, describe, expect, it } from "vitest";
import { buildEventItemListJsonLd, buildEventJsonLd } from "@/lib/seo/eventJsonLd";

const baseEvent = {
  title: "Комедийное шоу «Популярные импровизаторы»",
  description: "Живая импровизация в Варшаве.",
  venue: "Yo Bar & Pub, Aleja Komisji Edukacji Narodowej 47/U9, 02-797 Warszawa",
  starts_at: "2026-06-06T17:30:00+00:00",
  image_url: "/events/test.png",
  price_grosze: 5000,
  slug: "improv-2026-06-06",
  listing_kind: "performance",
  event_language: "ru_uk" as const,
};

describe("buildEventJsonLd", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.populartickets.pl";
  });

  it("includes Event core fields for Google Events", () => {
    const ld = buildEventJsonLd(baseEvent, "ru", {
      remaining: 49,
      soldOut: false,
      mapsUrl: "https://maps.app.goo.gl/example",
    }) as Record<string, unknown>;

    expect(ld["@type"]).toBe("Event");
    expect(ld.startDate).toBe(baseEvent.starts_at);
    expect(ld.endDate).toBe("2026-06-06T20:30:00+00:00");
    expect(ld.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(ld.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");

    const location = ld.location as Record<string, unknown>;
    expect(location["@type"]).toBe("Place");
    expect(location.hasMap).toBe("https://maps.app.goo.gl/example");
    const address = location.address as Record<string, unknown>;
    expect(address["@type"]).toBe("PostalAddress");
    expect(address.addressCountry).toBe("PL");
    expect(address.postalCode).toBe("02-797");

    const performer = ld.performer as Record<string, unknown>;
    expect(performer["@type"]).toBe("TheaterGroup");
    expect(performer.name).toBe("Popular Poet");

    const organizer = ld.organizer as Record<string, unknown>;
    expect(organizer["@type"]).toBe("Organization");
    expect(organizer.name).toBe("Popular Poet");

    const offers = ld.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.price).toBe("50.00");
    expect(offers.priceCurrency).toBe("PLN");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toContain("/ru/events/improv-2026-06-06");

    const seller = offers.seller as Record<string, unknown>;
    expect(seller["@type"]).toBe("Organization");
    expect(seller.legalName).toBeTruthy();
    expect(seller.taxID).toBeTruthy();
  });

  it("includes maximumAttendeeCapacity when total_tickets set", () => {
    const ld = buildEventJsonLd({ ...baseEvent, total_tickets: 50 }, "ru", {
      remaining: 49,
      soldOut: false,
      mapsUrl: null,
    }) as Record<string, unknown>;
    expect(ld.maximumAttendeeCapacity).toBe(50);
  });

  it("marks sold out availability", () => {
    const ld = buildEventJsonLd(baseEvent, "pl", {
      remaining: 0,
      soldOut: true,
      mapsUrl: null,
    }) as Record<string, unknown>;
    const offers = ld.offers as Record<string, unknown>;
    expect(offers.availability).toBe("https://schema.org/SoldOut");
  });

  it("adds theatre geo for Domaniewska venue", () => {
    const ld = buildEventJsonLd(
      {
        ...baseEvent,
        venue: "Warszawa, ul. Domaniewska 37, lokal 42",
        listing_kind: "trial",
      },
      "ru",
      { remaining: 10, soldOut: false, mapsUrl: null },
    ) as Record<string, unknown>;
    const location = ld.location as Record<string, unknown>;
    const geo = location.geo as Record<string, unknown>;
    expect(geo.latitude).toBeTruthy();
    expect(geo.longitude).toBeTruthy();
  });
});

describe("buildEventItemListJsonLd", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.populartickets.pl";
  });

  it("builds ItemList with nested Event items", () => {
    const ld = buildEventItemListJsonLd(
      "ru",
      "Ближайшие события",
      "https://www.populartickets.pl/ru/probnoe-zanyatie-varshava#afisha",
      [
        {
          event: { ...baseEvent, starts_at: "2026-12-01T18:00:00.000Z" },
          remaining: 10,
          soldOut: false,
          mapsUrl: null,
        },
      ],
    ) as Record<string, unknown>;

    expect(ld?.["@type"]).toBe("ItemList");
    expect(ld?.numberOfItems).toBe(1);
    const items = ld?.itemListElement as Array<Record<string, unknown>>;
    expect(items[0]?.["@type"]).toBe("ListItem");
    const event = items[0]?.item as Record<string, unknown>;
    expect(event["@type"]).toBe("Event");
    expect(event.name).toBe(baseEvent.title);
  });
});
