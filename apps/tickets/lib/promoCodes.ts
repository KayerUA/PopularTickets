import type { SupabaseClient } from "@supabase/supabase-js";

export type PromoScope = "all" | "special" | "event";

export type ApplicablePromo = {
  id: string;
  code: string;
  partnerName: string;
  discountPercent: number;
};

export function normalizePromoCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function promoDiscountGrosze(amountGrosze: number, percent: number): number {
  return Math.round(amountGrosze * (percent / 100));
}

export async function resolveApplicablePromoCode(
  supabase: SupabaseClient,
  rawCode: string | null | undefined,
  event: { id: string; listingKind: string | null | undefined },
): Promise<ApplicablePromo | null> {
  const code = normalizePromoCode(rawCode);
  if (!code) return null;

  const { data, error } = await supabase
    .from("promo_codes")
    .select("id,code,partner_name,discount_percent,scope,event_id,is_active,starts_at,ends_at,max_redemptions")
    .eq("code", code)
    .maybeSingle();
  if (error || !data || !data.is_active) return null;

  const now = Date.now();
  const startsAt = data.starts_at ? new Date(data.starts_at).getTime() : null;
  const endsAt = data.ends_at ? new Date(data.ends_at).getTime() : null;
  if ((startsAt !== null && startsAt > now) || (endsAt !== null && endsAt < now)) return null;

  const scope = data.scope as PromoScope;
  if (scope === "special" && event.listingKind !== "special") return null;
  if (scope === "event" && data.event_id !== event.id) return null;

  if (typeof data.max_redemptions === "number") {
    const { count, error: usageError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", data.id)
      .in("status", ["pending", "paid"]);
    if (usageError || (count ?? 0) >= data.max_redemptions) return null;
  }

  return {
    id: data.id,
    code: normalizePromoCode(data.code),
    partnerName: data.partner_name,
    discountPercent: data.discount_percent,
  };
}
