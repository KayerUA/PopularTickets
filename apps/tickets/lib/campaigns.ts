import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeBuyerEmail } from "@/lib/ratings/audience";

export const BOEING_NEWSLETTER_CAMPAIGN = "boeing-mail70";

function sessionId(campaign: string, email: string) {
  return `campaign:${campaign}:${normalizeBuyerEmail(email)}`;
}

export async function recordCampaignSend(
  db: SupabaseClient,
  campaign: string,
  email: string,
  extra?: Record<string, unknown>,
) {
  const { error } = await db.from("payment_callbacks").insert({
    provider: "campaign",
    order_id: null,
    provider_order_id: null,
    session_id: sessionId(campaign, email),
    status: "sent",
    payload: { campaign, email: normalizeBuyerEmail(email), ...extra },
  });
  if (error) console.error("[campaign send] audit", error.message);
}

export async function campaignAlreadySent(db: SupabaseClient, campaign: string, email: string) {
  const { data } = await db
    .from("payment_callbacks")
    .select("id")
    .eq("provider", "campaign")
    .eq("session_id", sessionId(campaign, email))
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function campaignSendsOlderThan(db: SupabaseClient, campaign: string, olderThanMs: number) {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const { data, error } = await db
    .from("payment_callbacks")
    .select("payload,created_at")
    .eq("provider", "campaign")
    .eq("status", "sent")
    .like("session_id", `campaign:${campaign}:%`)
    .lte("created_at", cutoff)
    .limit(500);
  if (error) {
    console.error("[campaign send] list", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => {
      const payload = row.payload as { campaign?: string; email?: string; locale?: string } | null;
      if (payload?.campaign !== campaign) return null;
      const email = normalizeBuyerEmail(payload.email);
      if (!email.includes("@")) return null;
      return { email, locale: payload.locale, sentAt: row.created_at as string };
    })
    .filter((row): row is { email: string; locale: string | undefined; sentAt: string } => Boolean(row));
}
