import { describe, expect, it } from "vitest";
import { nextModeIntentPromoForCluster } from "@/lib/ticketsIntentRoutes";

describe("nextModeIntentPromoForCluster", () => {
  it("starts intent pages with a format relevant to their search intent", () => {
    expect(nextModeIntentPromoForCluster("leisure")).toEqual({
      variant: "general",
      initialFormat: "options",
    });
    expect(nextModeIntentPromoForCluster("improv")).toEqual({
      variant: "improv",
      initialFormat: "infection",
    });
    expect(nextModeIntentPromoForCluster("theatre")).toEqual({
      variant: "theatre",
      initialFormat: "court",
    });
  });

  it("does not advertise a ticketed show on the trial lesson intent", () => {
    expect(nextModeIntentPromoForCluster("trial")).toBeNull();
  });
});
