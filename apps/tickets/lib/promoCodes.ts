import type { SupabaseClient } from "@supabase/supabase-js";
import { ambassadorProfileByPromoCode } from "@/lib/ambassadors";

export type PromoScope = "all" | "special" | "event";

export type ApplicablePromo = {
  id: string;
  code: string;
  partnerName: string;
  discountPercent: number | null;
  discountFixedGrosze: number | null;
  commissionPerTicketGrosze: number;
};

type PromoCodeRow = {
  id: string;
  code: string;
  partner_name: string;
  discount_percent: number | null;
  discount_type?: string | null;
  discount_fixed_grosze?: number | null;
  commission_grosze?: number | null;
  scope: string;
  event_id: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
};

export function normalizePromoCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function promoDiscountGrosze(
  unitPriceGrosze: number,
  quantity: number,
  promo: Pick<ApplicablePromo, "discountPercent" | "discountFixedGrosze">,
): number {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const perTicket = promo.discountFixedGrosze !== null
    ? promo.discountFixedGrosze
    : Math.round(unitPriceGrosze * ((promo.discountPercent ?? 0) / 100));
  return Math.min(unitPriceGrosze * safeQuantity, Math.max(0, perTicket) * safeQuantity);
}

export async function resolveApplicablePromoCode(
  supabase: SupabaseClient,
  rawCode: string | null | undefined,
  event: { id: string; listingKind: string | null | undefined },
): Promise<ApplicablePromo | null> {
  const code = normalizePromoCode(rawCode);
  if (!code) return null;

  const extended = await supabase
    .from("promo_codes")
    .select("id,code,partner_name,discount_percent,discount_type,discount_fixed_grosze,commission_grosze,scope,event_id,is_active,starts_at,ends_at,max_redemptions")
    .eq("code", code)
    .maybeSingle();
  let data = extended.data as PromoCodeRow | null;
  let error = extended.error;
  if (error?.code === "42703" || error?.code === "PGRST204") {
    const legacy = await supabase
      .from("promo_codes")
      .select("id,code,partner_name,discount_percent,scope,event_id,is_active,starts_at,ends_at,max_redemptions")
      .eq("code", code)
      .maybeSingle();
    data = legacy.data as PromoCodeRow | null;
    error = legacy.error;
  }
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

  const ambassador = ambassadorProfileByPromoCode(code);
  const usesFixedDiscount = data.discount_type === "fixed" || Boolean(ambassador);

  return {
    id: data.id,
    code: normalizePromoCode(data.code),
    partnerName: data.partner_name,
    discountPercent: usesFixedDiscount ? null : data.discount_percent,
    discountFixedGrosze: usesFixedDiscount
      ? (data.discount_fixed_grosze ?? ambassador?.discountFixedGrosze ?? null)
      : null,
    commissionPerTicketGrosze: data.commission_grosze ?? ambassador?.commissionPerTicketGrosze ?? 0,
  };
}
