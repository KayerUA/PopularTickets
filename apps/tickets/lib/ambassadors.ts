import type { SupabaseClient } from "@supabase/supabase-js";

export type AmbassadorProfileSeed = {
  hash: string;
  name: string;
  promoCode: string;
  discountFixedGrosze: number;
  discountPercent?: number | null;
  commissionPerTicketGrosze: number;
  /** Опциональная область действия; в БД соответствует promo_codes.event_id / внешнему show_id. */
  showSlug?: string;
  marketingMaterialsUrl: string | null;
};

type AmbassadorPromoRow = {
  code: string;
  partner_name: string;
  ambassador_hash: string;
  discount_percent: number | null;
  discount_fixed_grosze: number | null;
  commission_grosze: number;
  marketing_materials_url: string | null;
};

const AMBASSADOR_PROFILES: readonly AmbassadorProfileSeed[] = [
  {
    hash: "elvira_mua",
    name: "Elvira",
    promoCode: "Elvira",
    discountFixedGrosze: 1_000,
    commissionPerTicketGrosze: 1_000,
    showSlug: "next-mode-2026-08-15",
    marketingMaterialsUrl: "https://drive.google.com/drive/folders/1rODhCk15OjAD68rcbaKhUeL3BJSYUgoi?usp=sharing",
  },
] as const;

function normalizedPromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function ambassadorProfileByHash(hash: string): AmbassadorProfileSeed | null {
  const normalized = hash.trim().toLowerCase();
  return AMBASSADOR_PROFILES.find((profile) => profile.hash === normalized) ?? null;
}

export function ambassadorProfileByPromoCode(code: string): AmbassadorProfileSeed | null {
  const normalized = normalizedPromoCode(code);
  return AMBASSADOR_PROFILES.find((profile) => normalizedPromoCode(profile.promoCode) === normalized) ?? null;
}

/** Resolves admin-created ambassadors from Supabase, with source config as a deploy-safe fallback. */
export async function resolveAmbassadorProfile(
  supabase: SupabaseClient,
  hash: string,
): Promise<AmbassadorProfileSeed | null> {
  const normalizedHash = hash.trim().toLowerCase();
  if (!normalizedHash) return null;

  const { data, error } = await supabase
    .from("promo_codes")
    .select("code,partner_name,ambassador_hash,discount_percent,discount_fixed_grosze,commission_grosze,marketing_materials_url")
    .eq("ambassador_hash", normalizedHash)
    .eq("is_active", true)
    .maybeSingle();

  if (!error && data) {
    const promo = data as AmbassadorPromoRow;
    return {
      hash: promo.ambassador_hash,
      name: promo.partner_name,
      promoCode: promo.code,
      discountFixedGrosze: promo.discount_fixed_grosze ?? 0,
      discountPercent: promo.discount_percent,
      commissionPerTicketGrosze: promo.commission_grosze,
      marketingMaterialsUrl: promo.marketing_materials_url,
    };
  }

  return ambassadorProfileByHash(normalizedHash);
}
