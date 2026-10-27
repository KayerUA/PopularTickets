import { describe, expect, it } from "vitest";
import { ticketsIntentRedirect } from "@/lib/intentRedirects";
import { legacyEventRedirectPath } from "@/lib/legacyEventRedirects";

describe("consolidated public routes", () => {
  it("takes informational trial pages directly to the matching Poet locale", () => {
    expect(ticketsIntentRedirect("uk", "probne-zanyattya-varshava")).toBe("https://www.popularpoet.pl/uk/probne-zanyattya-varshava");
  });
  it("resolves the removed trial to its booking hub", () => {
    expect(legacyEventRedirectPath("pl", "improvizatsiya-probnoe-zanyatie-varshave-2026-07-29")).toBe("/pl/probnoe/improv");
  });
  it("keeps unknown events unresolved instead of substituting another performance", () => {
    expect(legacyEventRedirectPath("ru", "unknown-performance")).toBeNull();
  });
});
