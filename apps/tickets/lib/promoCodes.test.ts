import { describe, expect, it } from "vitest";
import { promoDiscountGrosze } from "@/lib/promoCodes";

describe("promoDiscountGrosze", () => {
  it("applies a percentage discount to every ticket", () => {
    expect(promoDiscountGrosze(8_500, 2, { discountPercent: 10, discountFixedGrosze: null })).toBe(1_700);
  });

  it("applies a fixed PLN discount to every ticket", () => {
    expect(promoDiscountGrosze(8_500, 2, { discountPercent: null, discountFixedGrosze: 1_000 })).toBe(2_000);
  });

  it("never discounts below zero", () => {
    expect(promoDiscountGrosze(500, 2, { discountPercent: null, discountFixedGrosze: 1_000 })).toBe(1_000);
  });
});
