import { describe, expect, it } from "vitest";
import { eventEndDateIso, resolveEventEndDateIso } from "@/lib/seo/eventEndDateIso";

describe("eventEndDateIso", () => {
  it("preserves the instant when a start includes a nonzero offset", () => {
    expect(eventEndDateIso("2026-11-15T19:00:00+01:00", 3.5 * 60 * 60 * 1000)).toBe("2026-11-15T22:30:00+01:00");
  });

  it("uses confirmed ends, two-hour trials and omits unknown show duration", () => {
    const starts_at = "2026-11-03T17:00:00Z";
    expect(resolveEventEndDateIso({ starts_at, ends_at: "2026-11-03T20:30:00Z" })).toBe("2026-11-03T20:30:00Z");
    expect(resolveEventEndDateIso({ starts_at, listing_kind: "trial" })).toBe("2026-11-03T19:00:00.000Z");
    expect(resolveEventEndDateIso({ starts_at })).toBeUndefined();
  });
  it("matches +00:00 suffix when startDate uses +00:00", () => {
    const start = "2026-06-13T14:00:00+00:00";
    const end = eventEndDateIso(start);
    expect(end).toBe("2026-06-13T17:00:00+00:00");
  });

  it("keeps Z suffix when startDate uses Z", () => {
    const start = "2026-06-13T14:00:00.000Z";
    const end = eventEndDateIso(start);
    expect(end).toBe("2026-06-13T17:00:00.000Z");
  });
});
