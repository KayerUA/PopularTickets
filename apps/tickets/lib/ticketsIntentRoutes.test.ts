import { describe, expect, it } from "vitest";
import { intentListingKindFilter } from "@/lib/ticketsIntentRoutes";

describe("intentListingKindFilter", () => {
  it("keeps event intent pages focused on performances", () => {
    expect(intentListingKindFilter("leisure")).toBe("performance");
    expect(intentListingKindFilter("improv")).toBe("performance");
    expect(intentListingKindFilter("theatre")).toBe("performance");
  });

  it("shows trial dates only on the trial lesson intent", () => {
    expect(intentListingKindFilter("trial")).toBe("trial");
  });
});
