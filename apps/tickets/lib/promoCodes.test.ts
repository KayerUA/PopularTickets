import { describe, expect, it } from "vitest";
import { promoDiscountGrosze, promoScopeAllowsEvent } from "@/lib/promoCodes";

describe("promoDiscountGrosze", () => {
  it("applies a percentage discount to every ticket", () => {
    expect(promoDiscountGrosze(8_500, 2, { discountPercent: 10, discountFixedGrosze: null })).toBe(1_700);
  });

  it("applies a fixed PLN discount to every ticket", () => {
    expect(promoDiscountGrosze(8_500, 2, { discountPercent: null, discountFixedGrosze: 1_000 })).toBe(2_000);
  });

  it("accepts a zero-discount code as an attribution marker", () => {
    expect(promoDiscountGrosze(8_500, 2, { discountPercent: 0, discountFixedGrosze: null })).toBe(0);
  });

  it("never discounts below zero", () => {
    expect(promoDiscountGrosze(500, 2, { discountPercent: null, discountFixedGrosze: 1_000 })).toBe(1_000);
  });
});

describe("promoScopeAllowsEvent", () => {
  const noga = { id: "noga", listingKind: "performance" };
  const other = { id: "other", listingKind: "performance" };

  it("keeps a general code off the show stored in event_id", () => {
    expect(promoScopeAllowsEvent("all", "noga", noga)).toBe(false);
    expect(promoScopeAllowsEvent("all", "noga", other)).toBe(true);
  });

  it("still allows a general code with no bound show", () => {
    expect(promoScopeAllowsEvent("all", null, noga)).toBe(true);
  });

  it("keeps an event code on its own show", () => {
    expect(promoScopeAllowsEvent("event", "noga", noga)).toBe(true);
    expect(promoScopeAllowsEvent("event", "noga", other)).toBe(false);
  });
});
