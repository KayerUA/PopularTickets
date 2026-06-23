import { describe, expect, it } from "vitest";
import { formatEventDateTime, formatEventDateTimeParts } from "@/lib/format";
import { parseStartsAtFromAdminForm, toDatetimeLocalValueWarsaw } from "@/lib/warsawEventDatetime";

describe("warsawEventDatetime", () => {
  it("keeps 8 May 2026 21:00 in Warsaw through admin form round-trip and PL display", () => {
    const local = "2026-05-08T21:00";
    const isoUtc = parseStartsAtFromAdminForm(local);
    expect(toDatetimeLocalValueWarsaw(isoUtc)).toBe(local);

    const shownPl = formatEventDateTime(isoUtc, "pl");
    expect(shownPl).toMatch(/2026/);
    expect(shownPl).toMatch(/21:00/);
    expect(shownPl.toLowerCase()).toMatch(/maja/);
    expect(shownPl).toMatch(/\b8\b/);
  });

  it("splits weekday for prominent display", () => {
    const isoUtc = parseStartsAtFromAdminForm("2026-06-26T19:00");
    const parts = formatEventDateTimeParts(isoUtc, "ru");
    expect(parts).not.toBeNull();
    expect(parts!.weekday.toLowerCase()).toMatch(/пятниц/);
    expect(parts!.date).toMatch(/2026/);
    expect(parts!.date.toLowerCase()).toMatch(/июн/);
    expect(parts!.time).toMatch(/19:00/);
  });
});
