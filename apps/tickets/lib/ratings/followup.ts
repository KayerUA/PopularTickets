import type { SupabaseClient } from "@supabase/supabase-js";
import { RATING_BOEING_OFFER_SLUG } from "@/lib/ratings/offer";
import { normalizeBuyerEmail } from "@/lib/ratings/audience";
import { BOEING_NEWSLETTER_CAMPAIGN, campaignSendsOlderThan } from "@/lib/campaigns";
import { sendPendingRatingInvites } from "@/lib/ratings/sendInvite";

const DAY_MS = 20 * 60 * 60 * 1000;

export async function sendRatingFollowupAfterNewsletter(db: SupabaseClient) {
  const { data: event } = await db.from("events").select("id").eq("slug", RATING_BOEING_OFFER_SLUG).maybeSingle();
  const sends = await campaignSendsOlderThan(db, BOEING_NEWSLETTER_CAMPAIGN, DAY_MS);
  if (!sends.length) return { sent: 0, skipped: 0, failures: [] as string[] };

  const emails = [...new Set(sends.map((row) => row.email))];
  let bought = new Set<string>();
  if (event) {
    const { data: orders } = await db
      .from("orders")
      .select("email")
      .eq("event_id", event.id)
      .eq("status", "paid");
    bought = new Set((orders ?? []).map((row) => normalizeBuyerEmail(row.email)));
  }
  const pending = emails.filter((email) => !bought.has(email));
  return sendPendingRatingInvites(db, {
    allowMarketingOptIn: true,
    emails: pending,
  });
}
