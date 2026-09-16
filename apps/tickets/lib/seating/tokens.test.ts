import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { seatingOrderId, seatingToken } from "./tokens";
const secret = "seat-test-secret-not-a-production-key";
const id = "993eb835-3ec4-4795-a113-4278d52921a9";
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("personal seat-selection tokens", () => {
  it("binds the link to one order, with stable same-day invitation payloads", async () => {
    vi.stubEnv("SEAT_SELECTION_SECRET", secret);
    const token = await seatingToken(id);
    expect(await seatingOrderId(token)).toBe(id);
    expect(await seatingToken(id)).toBe(token);
    expect(await seatingOrderId(`${token.slice(0, -8)}changed!`)).toBeNull();
  });
  it("rejects ordinary receipt tokens, forged order IDs and expired links", async () => {
    vi.stubEnv("SEAT_SELECTION_SECRET", secret);
    const key = new TextEncoder().encode(secret);
    const receipt = await new SignJWT({ oid: id }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key);
    expect(await seatingOrderId(receipt)).toBeNull();
    const invalid = await new SignJWT({ oid: "not-an-order-id" }).setProtectedHeader({ alg: "HS256" }).setAudience("seat-selection").setExpirationTime("7d").sign(key);
    expect(await seatingOrderId(invalid)).toBeNull();
    const token = await seatingToken(id);
    vi.useFakeTimers(); vi.setSystemTime(new Date(Date.now() + 91 * 86_400_000));
    expect(await seatingOrderId(token)).toBeNull();
  });
  it("fails closed without a signing secret", async () => {
    vi.stubEnv("SEAT_SELECTION_SECRET", "");
    await expect(seatingToken(id)).rejects.toThrow("SEAT_SELECTION_SECRET");
    expect(await seatingOrderId("anything")).toBeNull();
  });
});
