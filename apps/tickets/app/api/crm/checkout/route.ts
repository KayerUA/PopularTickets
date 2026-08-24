import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { requirePublicAppUrlForP24 } from "@/lib/publicAppUrl";
import { getMerchantId, getPosId, p24Register, signRegister } from "@/lib/p24";
import { clientIp, rateLimit } from "@/lib/security";
import { crmCheckoutUrl, crmP24Description } from "@/lib/crmCheckout";

const CheckoutSchema = z.object({
  crm_payment_id: z.string().trim().min(1).max(200),
  amount: z.number().positive().finite().max(1_000_000).refine((value) => Math.round(value * 100) === value * 100, "amount must have at most 2 decimal places"),
  currency: z.literal("PLN"),
  locale: z.enum(["pl", "uk", "ru"]).default("pl"),
  description: z.string().trim().min(1).max(500),
  buyer_email: z.string().trim().email().max(254),
  buyer_name: z.string().trim().min(1).max(160).optional(),
  payer_name: z.string().trim().min(1).max(160).optional(),
  invoice_number: z.string().trim().min(1).max(100).optional(),
  return_url: z.string().url().max(2048),
  webhook_url: z.string().url().max(2048),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRM_CHECKOUT_SECRET?.trim();
  if (!expected) return false;
  const supplied = request.headers.get("x-crm-checkout-secret")
    ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validCrmUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost";
    const allowed = (process.env.CRM_CHECKOUT_ALLOWED_HOSTS?.split(",").map((host) => host.trim()).filter(Boolean) ?? ["popularcrm.vercel.app"]);
    return allowed.includes(url.hostname);
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(`crm-checkout:${clientIp(request.headers)}`, 60, 60_000))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }); }
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation failed", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  if (!validCrmUrl(input.return_url) || !validCrmUrl(input.webhook_url)) {
    return NextResponse.json({ ok: false, error: "return_url and webhook_url must be allowed CRM HTTPS URLs" }, { status: 400 });
  }

  const baseUrl = requirePublicAppUrlForP24();
  const supabase = requireServiceSupabase();
  const amountGrosze = Math.round(input.amount * 100);
  let { data: order, error } = await supabase
    .from("crm_checkout_orders")
    .select("id,crm_payment_id,amount_grosze,currency,status,p24_token")
    .eq("crm_payment_id", input.crm_payment_id)
    .maybeSingle();

  if (error) {
    console.error("[crm checkout] lookup", error);
    return NextResponse.json({ ok: false, error: "order lookup failed" }, { status: 500 });
  }
  if (order && (order.amount_grosze !== amountGrosze || order.currency !== input.currency)) {
    return NextResponse.json({ ok: false, error: "crm_payment_id already exists with different amount" }, { status: 409 });
  }
  if (!order) {
    const id = randomUUID();
    const inserted = await supabase.from("crm_checkout_orders").insert({
      id, crm_payment_id: input.crm_payment_id, amount_grosze: amountGrosze, currency: input.currency,
      description: input.description, buyer_email: input.buyer_email, buyer_name: input.buyer_name ?? null,
      payer_name: input.payer_name ?? input.buyer_name ?? null, invoice_number: input.invoice_number ?? null,
      return_url: input.return_url, webhook_url: input.webhook_url, status: "pending", p24_session_id: id,
      metadata: input.metadata ?? {},
    }).select("id,crm_payment_id,amount_grosze,currency,status,p24_token").single();
    if (inserted.error) {
      const existing = await supabase.from("crm_checkout_orders").select("id,crm_payment_id,amount_grosze,currency,status,p24_token").eq("crm_payment_id", input.crm_payment_id).maybeSingle();
      if (existing.error || !existing.data) return NextResponse.json({ ok: false, error: "order create failed" }, { status: 500 });
      order = existing.data;
    } else order = inserted.data;
  }

  if (!order) return NextResponse.json({ ok: false, error: "order create failed" }, { status: 500 });
  if (order.status === "pending") {
    const refreshed = await supabase
      .from("crm_checkout_orders")
      .update({
        description: input.description,
        buyer_email: input.buyer_email,
        buyer_name: input.buyer_name ?? null,
        payer_name: input.payer_name ?? input.buyer_name ?? null,
        return_url: input.return_url,
        webhook_url: input.webhook_url,
        metadata: input.metadata ?? {},
      })
      .eq("id", order.id);
    if (refreshed.error) {
      console.error("[crm checkout] refresh pending order", refreshed.error);
      return NextResponse.json({ ok: false, error: "order refresh failed" }, { status: 500 });
    }
  }
  if (!order.p24_token && order.status === "pending") {
    try {
      const sign = signRegister({ sessionId: order.id, merchantId: getMerchantId(), amount: order.amount_grosze, currency: order.currency });
      const registered = await p24Register({
        merchantId: getMerchantId(), posId: getPosId(), sessionId: order.id, amount: order.amount_grosze, currency: order.currency,
        description: crmP24Description(input.description, input.invoice_number), email: input.buyer_email,
        client: input.payer_name ?? input.buyer_name, country: "PL", language: input.locale === "pl" ? "pl" : "en", encoding: "UTF-8", regulationAccept: true,
        urlReturn: `${baseUrl}/${input.locale}/crm-checkout/${encodeURIComponent(order.id)}/thanks`, urlStatus: `${baseUrl}/api/p24/notify`, sign,
      });
      const updated = await supabase.from("crm_checkout_orders").update({ p24_token: registered.token }).eq("id", order.id).select("id,crm_payment_id,amount_grosze,currency,status,p24_token").single();
      if (updated.error || !updated.data) throw new Error(updated.error?.message || "could not save P24 token");
      order = updated.data;
    } catch (cause) {
      console.error("[crm checkout] P24 register", cause);
      return NextResponse.json({ ok: false, error: "P24 registration failed" }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true, checkout_url: crmCheckoutUrl(baseUrl, order.id, input.locale), order_id: order.id, crm_payment_id: order.crm_payment_id });
}
