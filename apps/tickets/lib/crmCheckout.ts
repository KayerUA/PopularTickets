import crypto from "node:crypto";
import { getP24TrnUrl } from "@/lib/p24";
import type { AppLocale } from "@/i18n/routing";

export const CRM_CHECKOUT_DESCRIPTION_MAX_LENGTH = 252;

export function crmCheckoutUrl(baseUrl: string, orderId: string, locale: AppLocale = "pl"): string {
  return `${baseUrl}/${locale}/crm-checkout/${encodeURIComponent(orderId)}`;
}

export function crmReservationExpiresAt(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).reservation_expires_at;
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** P24's description rendering is inconsistent with non-ASCII characters. */
export function crmP24Description(description: string, invoiceNumber?: string | null): string {
  const ascii = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
  const invoice = invoiceNumber ? ` / FV ${invoiceNumber.replace(/[^\x20-\x7E]/g, "?").trim()}` : "";
  return `PopularCRM: ${ascii}`.slice(0, Math.max(1, CRM_CHECKOUT_DESCRIPTION_MAX_LENGTH - invoice.length)) + invoice;
}

export function crmP24Url(token: string): string {
  return getP24TrnUrl(token);
}

export function webhookAuthorization(payload: string): string | undefined {
  const secret = process.env.CRM_WEBHOOK_SECRET?.trim() || process.env.CRM_CHECKOUT_SECRET?.trim();
  if (!secret) return undefined;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${signature}`;
}

export async function sendCrmPaidWebhook(order: {
  id: string;
  crm_payment_id: string;
  amount_grosze: number;
  currency: string;
  p24_order_id: number | null;
  paid_at: string | null;
  webhook_url: string;
  buyer_email: string;
  buyer_name: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}): Promise<void> {
  const payload = JSON.stringify({
    crm_payment_id: order.crm_payment_id,
    status: "paid",
    amount: order.amount_grosze / 100,
    currency: order.currency,
    tickets_order_id: order.id,
    p24_order_id: order.p24_order_id ? String(order.p24_order_id) : null,
    paid_at: order.paid_at,
    buyer_email: order.buyer_email,
    buyer_name: order.buyer_name,
    description: order.description,
    metadata: order.metadata ?? {},
    checkout_created_at: order.created_at,
  });
  const { requireServiceSupabase } = await import("@/lib/supabase/admin");
  const supabase = requireServiceSupabase();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let statusCode: number | null = null;
    let error: string | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const signature = webhookAuthorization(payload);
      const response = await fetch(order.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CRM-Webhook-Signature": signature ?? "",
          ...(signature ? { Authorization: `Bearer ${process.env.CRM_WEBHOOK_SECRET?.trim() || process.env.CRM_CHECKOUT_SECRET?.trim()}` } : {}),
        },
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      statusCode = response.status;
      if (response.ok) {
        await supabase.from("crm_checkout_webhook_attempts").insert({
          crm_checkout_order_id: order.id, attempt, status_code: statusCode, delivered_at: new Date().toISOString(),
        });
        return;
      }
      error = `HTTP ${response.status}`;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "webhook request failed";
    }
    await supabase.from("crm_checkout_webhook_attempts").insert({
      crm_checkout_order_id: order.id, attempt, status_code: statusCode, error,
    });
  }
  console.error("[crm checkout] CRM webhook delivery failed", order.id);
  throw new Error(`CRM webhook delivery failed for order ${order.id}`);
}
