"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { DateTime } from "luxon";
import { requireAdmin } from "@/lib/adminGuard";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/security";
import { normalizePromoCode, promoDiscountGrosze, resolveApplicablePromoCode } from "@/lib/promoCodes";

function warsawDatetimeOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = DateTime.fromFormat(value.trim(), "yyyy-LL-dd'T'HH:mm", { zone: "Europe/Warsaw" });
  return date.isValid ? date.toUTC().toISO() : null;
}

const PromoSchema = z.object({
  code: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/, "Код: латиница, цифры, _ или -"),
  partnerName: z.string().trim().min(2).max(120),
  ambassadorHash: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null),
    z.string().min(3).max(80).regex(/^[a-z0-9_-]+$/, "Hash: латиница, цифры, _ или -").nullable(),
  ),
  discountType: z.enum(["percent", "fixed"]),
  discountPercent: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(1).max(99).nullable()),
  discountFixedPln: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().positive().max(10_000).nullable()),
  commissionPln: z.preprocess((v) => (v === "" ? 0 : v), z.coerce.number().min(0).max(10_000)),
  marketingMaterialsUrl: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : null),
    z.string().url().nullable(),
  ),
  scope: z.enum(["all", "special", "event"]),
  eventId: z.string().uuid().optional(),
  landingEventId: z.string().uuid().optional(),
  maxRedemptions: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().positive().nullable()),
  startsAt: z.preprocess(warsawDatetimeOrNull, z.string().datetime().nullable()),
  endsAt: z.preprocess(warsawDatetimeOrNull, z.string().datetime().nullable()),
}).superRefine((value, ctx) => {
  if (value.discountType === "percent" && value.discountPercent === null) {
    ctx.addIssue({ code: "custom", path: ["discountPercent"], message: "Укажите скидку в процентах." });
  }
  if (value.discountType === "fixed" && value.discountFixedPln === null) {
    ctx.addIssue({ code: "custom", path: ["discountFixedPln"], message: "Укажите скидку в PLN." });
  }
});

export type CreatePromoCodeState = { error?: string; ok?: string } | null;

export async function createPromoCode(_prev: CreatePromoCodeState, formData: FormData): Promise<CreatePromoCodeState> {
  try {
    await requireAdmin();
    const parsed = PromoSchema.safeParse({
      code: formData.get("code"),
      partnerName: formData.get("partnerName"),
      ambassadorHash: formData.get("ambassadorHash"),
      discountType: formData.get("discountType"),
      discountPercent: formData.get("discountPercent"),
      discountFixedPln: formData.get("discountFixedPln"),
      commissionPln: formData.get("commissionPln"),
      marketingMaterialsUrl: formData.get("marketingMaterialsUrl"),
      scope: formData.get("scope"),
      eventId: formData.get("eventId") || undefined,
      landingEventId: formData.get("landingEventId") || undefined,
      maxRedemptions: formData.get("maxRedemptions"),
      startsAt: formData.get("startsAt") || null,
      endsAt: formData.get("endsAt") || null,
    });
    if (!parsed.success) return { error: parsed.error.issues.map((issue) => issue.message).join(", ") };
    const v = parsed.data;
    if (v.scope === "event" && !v.eventId) return { error: "Для типа «конкретное событие» выберите событие." };
    if (v.startsAt && v.endsAt && new Date(v.startsAt) >= new Date(v.endsAt)) return { error: "Дата окончания должна быть позже даты начала." };

    const { error } = await requireServiceSupabase().from("promo_codes").insert({
      code: normalizePromoCode(v.code),
      partner_name: v.partnerName,
      ambassador_hash: v.ambassadorHash,
      discount_type: v.discountType,
      discount_percent: v.discountType === "percent" ? v.discountPercent : null,
      discount_fixed_grosze: v.discountType === "fixed" ? Math.round((v.discountFixedPln ?? 0) * 100) : null,
      commission_grosze: Math.round(v.commissionPln * 100),
      marketing_materials_url: v.marketingMaterialsUrl,
      scope: v.scope,
      event_id: v.scope === "event" ? v.eventId : null,
      landing_event_id: v.landingEventId ?? (v.scope === "event" ? v.eventId : null),
      max_redemptions: v.maxRedemptions,
      starts_at: v.startsAt,
      ends_at: v.endsAt,
    });
    if (error) return { error: error.code === "23505" ? "Такой промокод уже существует." : error.message };
    revalidatePath("/admin/promo-codes");
    return { ok: "Промокод создан." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось создать промокод" };
  }
}

export async function previewPromoCode(input: { code: string; eventSlug: string; unitPriceGrosze: number }): Promise<
  {
    code: string;
    discountPercent: number | null;
    discountFixedGrosze: number | null;
    discountPerTicketGrosze: number;
    discountedUnitPriceGrosze: number;
  } | { error: string } | null
> {
  const code = normalizePromoCode(input.code);
  if (!code) return null;
  const h = await headers();
  if (!(await rateLimit(`promo-preview:${clientIp(h)}`, 30, 60_000))) return { error: "Попробуйте через минуту." };
  const supabase = requireServiceSupabase();
  const { data: event } = await supabase
    .from("events")
    .select("id,listing_kind")
    .eq("slug", input.eventSlug)
    .maybeSingle();
  if (!event) return { error: "Событие не найдено." };
  const promo = await resolveApplicablePromoCode(supabase, code, { id: event.id, listingKind: event.listing_kind });
  if (!promo) return { error: "Промокод не действует для этого события." };
  const discountPerTicketGrosze = promoDiscountGrosze(input.unitPriceGrosze, 1, promo);
  return {
    code: promo.code,
    discountPercent: promo.discountPercent,
    discountFixedGrosze: promo.discountFixedGrosze,
    discountPerTicketGrosze,
    discountedUnitPriceGrosze: input.unitPriceGrosze - discountPerTicketGrosze,
  };
}
