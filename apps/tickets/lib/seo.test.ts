import { describe, expect, it } from "vitest";
import { eventOgImageUrl } from "@/lib/seo";

describe("eventOgImageUrl", () => {
  it("uses a static social image for Next Mode so crawlers avoid runtime rendering", () => {
    expect(eventOgImageUrl("next-mode-2026-08-15", "https://www.populartickets.pl/"))
      .toBe("https://www.populartickets.pl/og/next-mode-comedy-2026-08-15-v2.jpg");
  });

  it("keeps dynamic social images for other events", () => {
    expect(eventOgImageUrl("other-event", "https://www.populartickets.pl"))
      .toContain("/api/og/event/other-event?v=");
  });
});
