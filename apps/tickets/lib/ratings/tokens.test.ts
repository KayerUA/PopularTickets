import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { eventRatingOrderId, eventRatingPreviewEventId, eventRatingPreviewToken, eventRatingToken } from "./tokens";

const secret = "rating-test-secret-not-a-production-key";
const id = "993eb835-3ec4-4795-a113-4278d52921a9";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("personal event-rating tokens", () => {
  it("binds the link to one order, with stable same-day payloads", async () => {
    vi.stubEnv("EVENT_RATING_SECRET", secret);
    const token = await eventRatingToken(id);
    expect(await eventRatingOrderId(token)).toBe(id);
    expect(await eventRatingToken(id)).toBe(token);
    expect(await eventRatingOrderId(`${token.slice(0, -8)}changed!`)).toBeNull();
  });

  it("rejects seat-selection tokens, forged ids and expired links", async () => {
    vi.stubEnv("EVENT_RATING_SECRET", secret);
    const key = new TextEncoder().encode(secret);
    const seating = await new SignJWT({ oid: id })
      .setProtectedHeader({ alg: "HS256" })
      .setAudience("seat-selection")
      .setExpirationTime("7d")
      .sign(key);
    expect(await eventRatingOrderId(seating)).toBeNull();
    const invalid = await new SignJWT({ oid: "not-an-order-id" })
      .setProtectedHeader({ alg: "HS256" })
      .setAudience("event-rating")
      .setExpirationTime("7d")
      .sign(key);
    expect(await eventRatingOrderId(invalid)).toBeNull();
    const token = await eventRatingToken(id);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 91 * 86_400_000));
    expect(await eventRatingOrderId(token)).toBeNull();
  });

  it("falls back to SEAT_SELECTION_SECRET when EVENT_RATING_SECRET is empty", async () => {
    vi.stubEnv("EVENT_RATING_SECRET", "");
    vi.stubEnv("SEAT_SELECTION_SECRET", secret);
    expect(await eventRatingOrderId(await eventRatingToken(id))).toBe(id);
  });

  it("fails closed without a signing secret", async () => {
    vi.stubEnv("EVENT_RATING_SECRET", "");
    vi.stubEnv("SEAT_SELECTION_SECRET", "");
    vi.stubEnv("ORDER_RECEIPT_SECRET", "");
    await expect(eventRatingToken(id)).rejects.toThrow("EVENT_RATING_SECRET");
    expect(await eventRatingOrderId("anything")).toBeNull();
  });
});

describe("event rating preview tokens", () => {
  it("binds a preview link to one event and rejects order tokens", async () => {
    vi.stubEnv("EVENT_RATING_SECRET", secret);
    const token = await eventRatingPreviewToken(id);
    expect(await eventRatingPreviewEventId(token)).toBe(id);
    expect(await eventRatingOrderId(token)).toBeNull();
    expect(await eventRatingPreviewEventId(await eventRatingToken(id))).toBeNull();
  });
});
