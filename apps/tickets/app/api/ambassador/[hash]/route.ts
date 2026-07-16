import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAmbassadorProfile } from "@/lib/ambassadors";
import { normalizePromoCode } from "@/lib/promoCodes";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/security";
import { getPublicAppUrl } from "@/lib/publicAppUrl";

const ShowIdSchema = z.string().uuid().optional();

export async function GET(req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  if (!(await rateLimit(`ambassador-dashboard:${clientIp(req.headers)}`, 60, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { hash } = await params;
  const parsedShowId = ShowIdSchema.safeParse(req.nextUrl.searchParams.get("show_id") || undefined);
  if (!parsedShowId.success) return NextResponse.json({ error: "Invalid show_id" }, { status: 400 });

  const supabase = requireServiceSupabase();
  const profile = await resolveAmbassadorProfile(supabase, hash);
  if (!profile) return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });

  const code = normalizePromoCode(profile.promoCode);
  const extendedPromo = await supabase
    .from("promo_codes")
    .select("id,event_id,landing_event_id,discount_percent,discount_fixed_grosze,commission_grosze,marketing_materials_url")
    .eq("code", code)
    .maybeSingle();
  let promo = extendedPromo.data as {
    id: string;
    event_id: string | null;
    landing_event_id?: string | null;
    discount_percent?: number | null;
    discount_fixed_grosze?: number | null;
    commission_grosze?: number | null;
    marketing_materials_url?: string | null;
  } | null;
  if (extendedPromo.error?.code === "42703" || extendedPromo.error?.code === "PGRST204") {
    const legacy = await supabase.from("promo_codes").select("id,event_id").eq("code", code).maybeSingle();
    promo = legacy.data;
  }

  const requestedShowId = parsedShowId.data;
  if (requestedShowId && promo?.event_id && requestedShowId !== promo.event_id) {
    return NextResponse.json({ error: "Promo code is not assigned to this show" }, { status: 404 });
  }

  const eventQuery = supabase.from("events").select("id,slug,title,starts_at,listing_kind").limit(1);
  const { data: event } = requestedShowId
    ? await eventQuery.eq("id", requestedShowId).maybeSingle()
    : profile.showSlug
      ? await eventQuery.eq("slug", profile.showSlug).maybeSingle()
      : promo?.landing_event_id || promo?.event_id
        ? await eventQuery.eq("id", promo.landing_event_id ?? promo.event_id).maybeSingle()
        : { data: null };

  let paidOrders: Array<{
    quantity: number;
    ambassador_commission_grosze?: number | null;
  }> = [];
  if (promo?.id) {
    let orderQuery = supabase
      .from("orders")
      .select("quantity,ambassador_commission_grosze")
      .eq("promo_code_id", promo.id)
      .eq("status", "paid");
    if (event?.id) orderQuery = orderQuery.eq("event_id", event.id);
    const extendedOrders = await orderQuery;
    if (extendedOrders.error?.code === "42703" || extendedOrders.error?.code === "PGRST204") {
      let legacyQuery = supabase
        .from("orders")
        .select("quantity")
        .eq("promo_code_id", promo.id)
        .eq("status", "paid");
      if (event?.id) legacyQuery = legacyQuery.eq("event_id", event.id);
      const legacyOrders = await legacyQuery;
      paidOrders = legacyOrders.data ?? [];
    } else {
      paidOrders = extendedOrders.data ?? [];
    }
  }

  const totalTickets = paidOrders.reduce((sum, order) => sum + order.quantity, 0);
  const commissionPerTicketGrosze = promo?.commission_grosze ?? profile.commissionPerTicketGrosze;
  const storedCommissionGrosze = paidOrders.reduce(
    (sum, order) => sum + (order.ambassador_commission_grosze ?? 0),
    0,
  );
  const totalCommissionGrosze = storedCommissionGrosze || totalTickets * commissionPerTicketGrosze;
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  const eventPath = event
    ? `/ru/${event.listing_kind === "special" ? "special" : "events"}/${event.slug}`
    : "/ru";

  return NextResponse.json(
    {
      name: profile.name,
      promo_code: profile.promoCode,
      ambassador_hash: profile.hash,
      show_id: event?.id ?? null,
      discount_pln: (promo?.discount_fixed_grosze ?? profile.discountFixedGrosze) / 100,
      discount_percent: promo?.discount_percent ?? profile.discountPercent ?? null,
      commission_pln: commissionPerTicketGrosze / 100,
      referral_url: `${base}${eventPath}?promo=${encodeURIComponent(profile.promoCode)}`,
      marketing_materials_url: promo?.marketing_materials_url || profile.marketingMaterialsUrl,
      stats: {
        total_tickets: totalTickets,
        total_commission: totalCommissionGrosze / 100,
      },
      show: event
        ? { id: event.id, slug: event.slug, title: event.title, starts_at: event.starts_at }
        : null,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
