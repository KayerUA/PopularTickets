import { describe, expect, it } from "vitest";
import { canonicalRatingTargets, groupRatingTargetsByEmail, marketingOptInEmails } from "./audience";

const base = {
  status: "paid",
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("rating audience", () => {
  it("excludes anyone who ever opted into marketing", () => {
    const orders = [
      { id: "1", email: "skip@example.com", event_id: "e1", marketing_email_opt_in: true, ...base },
      { id: "2", email: "SKIP@example.com", event_id: "e2", marketing_email_opt_in: false, ...base },
      { id: "3", email: "keep@example.com", event_id: "e1", marketing_email_opt_in: false, ...base },
    ];
    expect([...marketingOptInEmails(orders)]).toEqual(["skip@example.com"]);
    expect(canonicalRatingTargets(orders).map((o) => o.id)).toEqual(["3"]);
    expect(canonicalRatingTargets(orders, { includeMarketingOptIn: true }).map((o) => o.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("keeps one page per person per event", () => {
    const orders = [
      { id: "old", email: "a@x.com", event_id: "show", marketing_email_opt_in: false, status: "paid", created_at: "2026-01-01T00:00:00.000Z" },
      { id: "new", email: "a@x.com", event_id: "show", marketing_email_opt_in: false, status: "paid", created_at: "2026-02-01T00:00:00.000Z" },
      { id: "other", email: "a@x.com", event_id: "trial", marketing_email_opt_in: false, status: "paid", created_at: "2026-02-01T00:00:00.000Z" },
      { id: "pending", email: "b@x.com", event_id: "show", marketing_email_opt_in: false, status: "pending", created_at: "2026-02-01T00:00:00.000Z" },
    ];
    expect(canonicalRatingTargets(orders).map((o) => o.id).sort()).toEqual(["new", "other"]);
    const grouped = groupRatingTargetsByEmail(orders);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].map((o) => o.id).sort()).toEqual(["new", "other"]);
  });
});
