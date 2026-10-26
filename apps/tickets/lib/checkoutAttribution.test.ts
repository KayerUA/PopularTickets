import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), rpc: vi.fn(), p24Register: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/security", () => ({ rateLimit: async () => true, clientIp: () => "test" }));
vi.mock("@/lib/supabase/admin", () => ({ requireServiceSupabase: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/lib/checkoutBypass", () => ({ isCheckoutBypassPayment: () => false }));
vi.mock("@/lib/fulfillment", () => ({ bypassPaymentAndFulfillOrder: vi.fn() }));
vi.mock("@/lib/promoCodes", () => ({ resolveApplicablePromoCode: async () => null, normalizePromoCode: () => "", promoDiscountGrosze: () => 0 }));
vi.mock("@/lib/eventPrice", () => ({ effectiveEventPriceGrosze: () => 5000 }));
vi.mock("@/lib/publicAppUrl", () => ({ requirePublicAppUrlForP24: () => "https://www.populartickets.pl" }));
vi.mock("@/lib/orderReceiptToken", () => ({ buildCheckoutReturnPath: async () => "/ru/checkout/return?rt=signed" }));
vi.mock("@/lib/p24", () => ({
  getMerchantId: () => 1, getPosId: () => 1, getP24TrnUrl: () => "https://payment.example/token",
  p24Register: mocks.p24Register, p24RegisterDescription: () => "ticket", signRegister: () => "signature",
  P24RegisterAuthError: class extends Error {},
}));

import { createPendingOrder } from "@/app/actions/checkout";
import { captureAttributionTouch, updateOrderAttribution } from "./orderAttribution";

function form(attribution?: string) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ eventSlug: "show", buyerName: "Test Buyer", email: "buyer@example.com", phone: "123456789", quantity: "2", locale: "ru", acceptLegal: "on" })) data.set(key, value);
  if (attribution !== undefined) data.set("attribution", attribution);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.p24Register.mockResolvedValue({ token: "token" });
  mocks.from.mockImplementation((table: string) => {
    if (table === "orders") return { insert: mocks.insert };
    if (table === "tickets") return { select: () => ({ eq: async () => ({ count: 0, error: null }) }) };
    if (table === "events") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "event", slug: "show", visibility: "published", starts_at: "2099-01-01", total_tickets: 100, listing_kind: "performance" }, error: null }) }) }) };
    throw new Error(`Unexpected table ${table}`);
  });
});

describe("checkout attribution persistence", () => {
  it("saves the captured source with the pending order before registering payment", async () => {
    const attribution = updateOrderAttribution(null, captureAttributionTouch("https://www.populartickets.pl/ru/events/show?utm_source=instagram&utm_medium=paid_social", "")!);
    expect(await createPendingOrder(form(JSON.stringify(attribution)))).toEqual({ p24Url: "https://payment.example/token" });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", quantity: 2, attribution }));
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.p24Register.mock.invocationCallOrder[0]);
  });

  it.each([undefined, "not-json"])("allows a checkout without valid browser attribution (%s)", async (input) => {
    await expect(createPendingOrder(form(input))).resolves.toHaveProperty("p24Url");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ attribution: null }));
  });
});
