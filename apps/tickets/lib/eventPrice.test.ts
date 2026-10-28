import { describe, expect, it } from "vitest";
import { effectiveEventPriceGrosze, eventPriceDetails } from "@/lib/eventPrice";

const event = {
  starts_at: "2026-06-08T17:00:00.000Z",
  price_grosze: 5000,
  day_of_event_price_grosze: 7000,
};

describe("effectiveEventPriceGrosze", () => {
  it("switches a performance from 80 to 100 PLN at Warsaw midnight after November 27", () => {
    const taxi = { starts_at: "2026-12-11T18:00:00Z", price_grosze: 10000, listing_kind: "performance",
      discount_periods: [{ name: "1 пул", until: "2026-11-27", percent: 20 }] };
    expect(effectiveEventPriceGrosze(taxi, new Date("2026-11-27T22:59:59.999Z"))).toBe(8000);
    expect(effectiveEventPriceGrosze(taxi, new Date("2026-11-27T23:00:00Z"))).toBe(10000);
    expect(effectiveEventPriceGrosze(taxi, new Date("2026-12-11T17:00:00Z"))).toBe(10000);
    expect(eventPriceDetails(taxi, new Date("2026-11-01T12:00:00Z"))).toMatchObject({ effectivePriceGrosze: 8000, regularPriceGrosze: 10000 });
  });

  it("keeps trial prices independent of performance discount periods", () => {
    expect(effectiveEventPriceGrosze({ ...event, listing_kind: "trial", discount_periods: [{ name: "1 пул", until: "2026-11-27", percent: 20 }] }, new Date("2026-10-28T12:00:00Z"))).toBe(5000);
  });
  it("uses the regular price before the event day in Warsaw", () => {
    expect(effectiveEventPriceGrosze(event, new Date("2026-06-07T21:59:59.000Z"))).toBe(5000);
  });

  it("uses the special price from midnight on the event day in Warsaw", () => {
    expect(effectiveEventPriceGrosze(event, new Date("2026-06-07T22:00:00.000Z"))).toBe(7000);
  });

  it("uses the regular price when no special price is configured", () => {
    expect(effectiveEventPriceGrosze({ ...event, day_of_event_price_grosze: null })).toBe(5000);
  });

  it("does not use the special price after the event day", () => {
    expect(effectiveEventPriceGrosze(event, new Date("2026-06-08T22:00:00.000Z"))).toBe(5000);
  });

  it("exposes pricing details for customer messaging", () => {
    expect(eventPriceDetails(event, new Date("2026-06-07T12:00:00.000Z"))).toMatchObject({
      effectivePriceGrosze: 5000,
      regularPriceGrosze: 5000,
      dayOfEventPriceGrosze: 7000,
      hasDayOfEventIncrease: true,
      isEventDay: false,
    });
  });

  it("applies the active special discount through the end of its Warsaw date", () => {
    const special = {
      ...event,
      listing_kind: "special",
      discount_periods: [
        { name: "Super Early Bird", until: "2026-06-07", percent: 15 },
        { name: "Early Bird", until: "2026-06-14", percent: 10 },
      ],
    };
    const details = eventPriceDetails(special, new Date("2026-06-07T21:59:00.000Z"));
    expect(details.effectivePriceGrosze).toBe(4250);
    expect(details.activeDiscount).toMatchObject({ name: "Super Early Bird", percent: 15 });
    expect(effectiveEventPriceGrosze(special, new Date("2026-06-07T22:00:00.000Z"))).toBe(4500);
  });
});
