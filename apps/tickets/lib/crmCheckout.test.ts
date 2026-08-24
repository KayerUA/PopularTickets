import { describe, expect, it } from "vitest";
import { crmCheckoutUrl, crmReservationExpiresAt } from "@/lib/crmCheckout";

describe("crmCheckoutUrl", () => {
  it("keeps Polish as the backwards-compatible default", () => {
    expect(crmCheckoutUrl("https://www.populartickets.pl", "order 1"))
      .toBe("https://www.populartickets.pl/pl/crm-checkout/order%201");
  });

  it.each(["ru", "uk"] as const)("builds the checkout in %s", (locale) => {
    expect(crmCheckoutUrl("https://www.populartickets.pl", "order-1", locale))
      .toBe(`https://www.populartickets.pl/${locale}/crm-checkout/order-1`);
  });
});

describe("crmReservationExpiresAt", () => {
  it("returns a valid reservation expiry from metadata", () => {
    expect(crmReservationExpiresAt({ reservation_expires_at: "2026-08-24T17:30:00.000Z" }))
      .toBe("2026-08-24T17:30:00.000Z");
  });

  it.each([null, [], {}, { reservation_expires_at: "not-a-date" }])(
    "rejects invalid metadata %#",
    (metadata) => expect(crmReservationExpiresAt(metadata)).toBeNull(),
  );
});
