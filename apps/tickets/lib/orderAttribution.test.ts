import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ATTRIBUTION_TTL_MS,
  attachOrderAttribution,
  captureAttributionTouch,
  parseOrderAttribution,
  preserveAttributionQuery,
  updateOrderAttribution,
} from "./orderAttribution";

const now = Date.parse("2026-10-26T12:00:00Z");
const instagramUrl = "https://www.populartickets.pl/ru/events/show?utm_source=instagram&utm_medium=paid_social&utm_campaign=noga&utm_content=story&fbclid=click123";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("order attribution", () => {
  it("preserves campaign tags through event redirects without forwarding unrelated query data", () => {
    const destination = preserveAttributionQuery("/ru/probnoe/improv?event=trial&promo=PARTNER15", { utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "show", fbclid: "click123", email: "private@example.com", rt: "secret" });
    const url = new URL(destination, "https://www.populartickets.pl");
    expect(url.searchParams.get("event")).toBe("trial");
    expect(url.searchParams.get("promo")).toBe("PARTNER15");
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("fbclid")).toBe("click123");
    expect(destination).not.toMatch(/private|secret/);
  });
  it("keeps the first source and latest campaign through internal navigation and direct returns", () => {
    const first = captureAttributionTouch(instagramUrl, "https://l.instagram.com/", now)!;
    let state = updateOrderAttribution(null, first);
    const internal = captureAttributionTouch("https://www.populartickets.pl/ru/events/other", instagramUrl, now + 1000)!;
    state = updateOrderAttribution(state, internal);
    expect(state.first_touch.source).toBe("instagram");
    expect(state.last_non_direct_touch?.utm.utm_content).toBe("story");
    const newsletter = captureAttributionTouch("https://www.populartickets.pl/ru/events/show?utm_source=newsletter&utm_medium=email", "", now + 2000)!;
    state = updateOrderAttribution(state, newsletter);
    state = updateOrderAttribution(state, captureAttributionTouch("https://www.populartickets.pl/ru/events/show", "", now + 3000)!);
    expect(state.first_touch).toEqual(first);
    expect(state.last_non_direct_touch?.source).toBe("newsletter");
  });

  it("records external referrals and does not mistake a Meta click id for paid Instagram", () => {
    expect(captureAttributionTouch("https://www.populartickets.pl/ru", "https://l.instagram.com/?secret=private", now)?.source).toBe("instagram");
    expect(captureAttributionTouch("https://www.populartickets.pl/ru?fbclid=abc", "", now)).toMatchObject({ source: "meta", medium: null });
    expect(captureAttributionTouch("https://www.populartickets.pl/ru", "https://instagram.com.attacker.example/", now)?.source).toBe("instagram.com.attacker.example");
    expect(captureAttributionTouch("https://www.populartickets.pl/ru", "", now)?.source).toBe("direct");
  });

  it("strips buyer tokens, query strings, fragments and unexpected client fields before database storage", () => {
    const touch = captureAttributionTouch("https://www.populartickets.pl/ru/events/show?email=private@example.com&utm_source=instagram#private", "https://example.com/private?email=private@example.com", now)!;
    const state = updateOrderAttribution(null, touch);
    const parsed = parseOrderAttribution(JSON.stringify({ ...state, unexpected: "secret", first_touch: { ...touch, landing_path: "/ru/rate/private-token?email=private@example.com", source: "forged", extra: "secret", utm: { utm_source: "Instagram", email: "private@example.com" } } }), now);
    expect(parsed?.first_touch).toMatchObject({ source: "instagram", referrer: "https://example.com", landing_path: "/ru/rate", utm: { utm_source: "Instagram" } });
    expect(JSON.stringify(parsed)).not.toMatch(/private|secret|forged|unexpected/);
  });

  it("does not replace a campaign with payment returns or service-page visits", () => {
    expect(captureAttributionTouch("https://www.populartickets.pl/ru/checkout/return?rt=token", "https://secure.przelewy24.pl/", now)).toBeNull();
    expect(captureAttributionTouch("https://www.populartickets.pl/ru/rate/token", "https://mail.example/", now)).toBeNull();
    const first = captureAttributionTouch(instagramUrl, "", now)!;
    const returned = captureAttributionTouch("https://www.populartickets.pl/ru/events/show", "https://secure.przelewy24.pl/", now + 1000)!;
    expect(updateOrderAttribution(updateOrderAttribution(null, first), returned).last_non_direct_touch?.source).toBe("instagram");
  });

  it("keeps a campaign with missing utm_source as unknown rather than calling it direct", () => {
    const touch = captureAttributionTouch("https://www.populartickets.pl/ru?utm_campaign=show", "", now)!;
    expect(touch.source).toBe("unknown");
    expect(updateOrderAttribution(null, touch).last_non_direct_touch?.utm.utm_campaign).toBe("show");
  });

  it("rejects malformed, oversized, expired and future client data without blocking checkout", () => {
    const state = updateOrderAttribution(null, captureAttributionTouch(instagramUrl, "", now)!);
    expect(parseOrderAttribution(JSON.stringify(state), now)).toEqual(state);
    for (const input of [null, "", "{", "null", "[]", "x".repeat(12001), JSON.stringify({ ...state, version: 2 })]) {
      expect(parseOrderAttribution(input, now)).toBeNull();
    }
    expect(parseOrderAttribution(JSON.stringify(state), now + ATTRIBUTION_TTL_MS + 1)).toBeNull();
    expect(parseOrderAttribution(JSON.stringify(state), now - 300_001)).toBeNull();
  });

  it("attaches attribution to the checkout payload even when browser storage is blocked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubGlobal("document", { referrer: "https://l.instagram.com/" });
    vi.stubGlobal("window", {
      location: { href: instagramUrl },
      localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } },
    });
    const form = new FormData();
    attachOrderAttribution(form);
    expect(parseOrderAttribution(form.get("attribution"), now)?.first_touch).toMatchObject({ source: "instagram", utm: { utm_campaign: "noga" } });
  });
});
