import { describe, expect, it } from "vitest";
import { eventRobotsMeta, eventSitemapTier } from "@/lib/eventSeoPolicy";

describe("eventSeoPolicy", () => {
  it("published past events stay indexable by default", () => {
    const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(eventRobotsMeta(past, "published")).toBeUndefined();
  });

  it("unlisted is noindex", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(eventRobotsMeta(future, "unlisted")).toEqual({ index: false, follow: true });
  });

  it("sitemap tier: future events higher priority than old past", () => {
    const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    const oldPast = new Date(Date.now() - 200 * 86400000).toISOString();
    expect(eventSitemapTier(soon).priority).toBeGreaterThan(eventSitemapTier(oldPast).priority);
  });
});
