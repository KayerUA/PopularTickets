import { describe, expect, it } from "vitest";
import { eventEndDateIso } from "@/lib/seo/eventEndDateIso";

describe("eventEndDateIso", () => {
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
