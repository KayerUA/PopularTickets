import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orderId: vi.fn(),
  db: { from: vi.fn() },
  notify: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/adminGuard", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ requireServiceSupabase: () => mocks.db }));
vi.mock("@/lib/ratings/server", () => ({ eventRatingOrderId: mocks.orderId }));
vi.mock("@/lib/ratings/sendInvite", () => ({ sendPendingRatingInvites: vi.fn(), sendRatingInviteEmail: vi.fn() }));
vi.mock("@/lib/ratings/notifyTelegram", () => ({ notifyTelegramAboutEventRating: mocks.notify }));
vi.mock("@/lib/security", () => ({ rateLimit: mocks.limit, clientIp: () => "test" }));

import { submitEventRating } from "@/app/actions/ratings";

const order = { id: "993eb835-3ec4-4795-a113-4278d52921a9", event_id: "event", status: "paid", email: " BUYER@example.com " };
const input = { token: "signed-token", score: 4, comment: "  Хороший вечер  ", locale: "ru" as const };

function query(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "ilike"]) chain[method] = vi.fn(() => chain);
  chain.single = chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue(true);
  mocks.orderId.mockResolvedValue(order.id);
});

describe("rating submission", () => {
  it("saves the score and trimmed comment for the paid buyer", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    mocks.db.from
      .mockReturnValueOnce(query({ data: order }))
      .mockReturnValueOnce(query({ data: { title: "Спектакль «Боинг-Боинг»", starts_at: "2020-01-01" } }))
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce({ insert });
    expect(await submitEventRating(input)).toEqual({ saved: true, already: false });
    expect(insert).toHaveBeenCalledWith({ order_id: order.id, event_id: "event", buyer_email: "buyer@example.com", score: 4, comment: "Хороший вечер" });
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it("does not create a second rating for an already rated buyer", async () => {
    mocks.db.from
      .mockReturnValueOnce(query({ data: order }))
      .mockReturnValueOnce(query({ data: { title: "Боинг-Боинг", starts_at: "2020-01-01" } }))
      .mockReturnValueOnce(query({ data: { score: 5 } }));
    expect(await submitEventRating(input)).toEqual({ saved: true, already: true });
    expect(mocks.db.from).toHaveBeenCalledTimes(3);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("rejects unpaid orders without saving", async () => {
    mocks.db.from.mockReturnValueOnce(query({ data: { ...order, status: "pending" } }));
    expect(await submitEventRating(input)).toHaveProperty("error");
    expect(mocks.db.from).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid tokens and out of range scores without database access", async () => {
    mocks.orderId.mockResolvedValue(null);
    expect(await submitEventRating(input)).toHaveProperty("error");
    expect(await submitEventRating({ ...input, score: 6 })).toHaveProperty("error");
    expect(mocks.db.from).not.toHaveBeenCalled();
  });
});
