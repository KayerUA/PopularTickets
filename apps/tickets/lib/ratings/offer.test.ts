import { describe, expect, it } from "vitest";
import {
  formatOfferZloty,
  promoFromPublicQuery,
  ratingOfferHref,
  newsletterOfferHref,
  ratingOfferPrices,
  shouldShowRatingOffer,
  shortOfferVenue,
  shortRatingEventTitle,
} from "./offer";

describe("rating Boeing offer", () => {
  it("turns 100 zł into 70 zł with a 30 zł promo", () => {
    expect(ratingOfferPrices(10_000, 3_000)).toEqual({ regularGrosze: 10_000, saleGrosze: 7_000 });
    expect(formatOfferZloty(7_000)).toBe("70 zł");
  });

  it("hides the banner on the advertised show itself and after it starts", () => {
    const offer = {
      currentEventId: "other",
      offerEventId: "boeing",
      startsAt: "2026-10-04T17:00:00.000Z",
      saleGrosze: 7_000,
      now: Date.parse("2026-09-21T10:00:00.000Z"),
    };
    expect(shouldShowRatingOffer(offer)).toBe(true);
    expect(shouldShowRatingOffer({ ...offer, currentEventId: "boeing" })).toBe(false);
    expect(shouldShowRatingOffer({ ...offer, now: Date.parse("2026-10-04T17:00:00.000Z") })).toBe(false);
  });

  it("keeps the public link free of the promo code", () => {
    expect(ratingOfferHref("spektakl-boing-boing-scena-kocjana-2026-10-04")).toBe(
      "/events/spektakl-boing-boing-scena-kocjana-2026-10-04?gift=audience",
    );
    expect(
      promoFromPublicQuery({
        slug: "spektakl-boing-boing-scena-kocjana-2026-10-04",
        gift: "audience",
      }),
    ).toBe("RATE70");
    expect(promoFromPublicQuery({ slug: "other-show", gift: "audience" })).toBeUndefined();
    expect(
      promoFromPublicQuery({
        slug: "spektakl-boing-boing-scena-kocjana-2026-10-04",
        gift: "mail",
      }),
    ).toBe("MAIL70");
    expect(newsletterOfferHref("spektakl-boing-boing-scena-kocjana-2026-10-04")).toBe(
      "/events/spektakl-boing-boing-scena-kocjana-2026-10-04?gift=mail",
    );
    expect(shortOfferVenue("Bemowskie Centrum Kultury — Scena Kocjana, ul. Kocjana 3")).toBe("Scena Kocjana");
  });

  it("shortens event titles for email buttons", () => {
    expect(shortRatingEventTitle("Спектакль «Труффальдино из Бергамо» — театр «Популярный поэт» в Варшаве")).toBe(
      "Труффальдино из Бергамо",
    );
    expect(shortRatingEventTitle("Фарсовая комедия «Боинг-Боинг» — театр «Популярный поэт»")).toBe("Боинг-Боинг");
    expect(shortRatingEventTitle("Пробное занятие: Импровизация в Варшаве")).toBe(
      "Пробное занятие: Импровизация в Варшаве",
    );
  });
});
