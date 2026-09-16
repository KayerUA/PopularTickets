import { describe, expect, it } from "vitest";
import { SCENA_KOCJANA } from "./scenaKocjana";
import { seatLabel } from "./i18n";
describe("Scena Kocjana seating", () => {
  it("has 184 sellable seats and all 20 side seats closed", () => {
    expect(SCENA_KOCJANA.seats.filter(s => !s.blocked)).toHaveLength(184);
    const sides = SCENA_KOCJANA.seats.filter(s => /-1[abcd]$/.test(s.id));
    expect(sides).toHaveLength(20);
    expect(sides.every(s => s.blocked)).toBe(true);
    expect(new Set(SCENA_KOCJANA.seats.map(s => s.id)).size).toBe(204);
  });
  it("preserves the back-row aisle and offset in row VIII", () => {
    const seat = (id: string) => SCENA_KOCJANA.seats.find(s => s.id === id)!;
    expect(seat("XI-7").column - seat("XI-6").column).toBe(4);
    expect(seat("VIII-1").column).toBe(seat("VII-1").column - 1);
    for (const row of SCENA_KOCJANA.rows) {
      const seats = SCENA_KOCJANA.seats.filter(s => s.row === row);
      expect(new Set(seats.map(s => s.column)).size).toBe(seats.length);
    }
  });
  it("labels the ticket in the buyer's language", () => {
    expect(seatLabel("VIII-12", "ru")).toBe("Ряд VIII · Место 12");
    expect(seatLabel("VIII-12", "pl")).toBe("Rząd VIII · Miejsce 12");
    expect(seatLabel(null, "uk")).toBeUndefined();
  });
});
