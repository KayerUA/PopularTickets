import { describe, expect, it } from "vitest";
import {
  crmCheckoutPresentation,
  crmCheckoutUrl,
  crmReservationExpiresAt,
} from "@/lib/crmCheckout";

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

describe("crmCheckoutPresentation", () => {
  it("treats cabinet packages as Popular Poet abonament", () => {
    expect(crmCheckoutPresentation({
      description: "Abonament - 4 zajecia - Pt 19:00 aktorstwo",
    })).toEqual({ brand: "poet", kind: "package" });
  });

  it("keeps IDEA trial when metadata or a seat hold says so", () => {
    expect(crmCheckoutPresentation({
      description: "Zajecia probne",
      metadata: { brand: "idea", product_kind: "trial", reservation_expires_at: "2026-08-24T17:30:00.000Z" },
    })).toEqual({ brand: "idea", kind: "trial" });
  });

  it("uses explicit Poet trial metadata", () => {
    expect(crmCheckoutPresentation({
      description: "Probnoe",
      metadata: { brand: "poet", product_kind: "trial" },
    })).toEqual({ brand: "poet", kind: "trial" });
  });
});
