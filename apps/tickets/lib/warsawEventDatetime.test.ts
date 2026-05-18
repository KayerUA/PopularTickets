import { describe, expect, it } from "vitest";
import { formatEventDateTime } from "@/lib/format";
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
});
