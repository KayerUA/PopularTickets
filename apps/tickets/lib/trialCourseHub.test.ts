import { describe, expect, it } from "vitest";
import { isIndexableTrialHubCourseSlug } from "@/lib/trialCourseHub";

describe("isIndexableTrialHubCourseSlug", () => {
  it("allows the two evergreen trial landing pages", () => {
    expect(isIndexableTrialHubCourseSlug("improv")).toBe(true);
    expect(isIndexableTrialHubCourseSlug("acting")).toBe(true);
  });

  it("keeps arbitrary course checkout hubs out of the index", () => {
    expect(isIndexableTrialHubCourseSlug("private-course")).toBe(false);
  });
});
