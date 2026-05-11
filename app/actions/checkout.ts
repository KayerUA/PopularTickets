"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import {
  getMerchantId,
  getPosId,
  getP24TrnUrl,
  p24Register,
  signRegister,
} from "@/lib/p24";
import { bypassPaymentAndFulfillOrder } from "@/lib/fulfillment";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { rateLimit, clientIp } from "@/lib/security";
import { routing, type AppLocale } from "@/i18n/routing";

const CheckoutSchema = z.object({
  eventSlug: z.string().min(1),
  buyerName: z.string().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(20),
  locale: z.enum(["pl", "uk"]),
});

function appUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL;
  if (!u) throw new Error("APP_URL_MISSING");
  return u.replace(/\/$/, "");
}

function p24UiLanguage(locale: AppLocale): string {
  if (locale === "pl") return "pl";
  return "en";
}

export async function createPendingOrder(formData: FormData) {
  const t = await getTranslations("Errors");
  const h = await headers();
  const ip = clientIp(h);
  if (!rateLimit(`order:${ip}`, 25, 60_000)) {
    throw new Error(t("rateLimit"));
  }

  const localeRaw = formData.get("locale");
  const localeParsed = z.enum(["pl", "uk"]).safeParse(localeRaw);
  const locale = (localeParsed.success ? localeParsed.data : routing.defaultLocale) as AppLocale;

  const parsed = CheckoutSchema.safeParse({
    eventSlug: formData.get("eventSlug"),
    buyerName: formData.get("buyerName"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    quantity: formData.get("quantity"),
    locale,
  });
  if (!parsed.success) {
    throw new Error(t("validation"));
  }
  const { eventSlug, buyerName, email, phone, quantity } = parsed.data;

  const supabase = requireServiceSupabase();
  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id,slug,title,price_grosze,total_tickets,is_published")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (evErr || !event || !event.is_published) {
    throw new Error(t("eventNotFound"));
  }

  const { count: soldCount, error: cntErr } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  if (cntErr) throw new Error(t("ticketCheckFailed"));
  const sold = soldCount ?? 0;
  const remaining = event.total_tickets - sold;
  if (remaining < quantity) {
    throw new Error(t("notEnoughTickets"));
  }

  let baseUrl: string;
  try {
    baseUrl = appUrl();
  } catch {
    throw new Error(t("appUrlMissing"));
  }

  const orderId = crypto.randomUUID();
  const amountGrosze = event.price_grosze * quantity;

  const { error: insErr } = await supabase.from("orders").insert({
    id: orderId,
    event_id: event.id,
    buyer_name: buyerName,
    email,
    phone: phone || null,
    quantity,
    amount_grosze: amountGrosze,
    currency: "PLN",
    status: "pending",
    p24_session_id: orderId,
  });

  if (insErr) {
    console.error(insErr);
    throw new Error(t("orderCreateFailed"));
  }

  if (isCheckoutBypassPayment()) {
    try {
      await bypassPaymentAndFulfillOrder(orderId);
    } catch (e) {
      console.error("bypassPaymentAndFulfillOrder", e);
      throw new Error(t("orderCreateFailed"));
    }
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/events/${eventSlug}`);
    redirect(`/${locale}/checkout/return`);
  }

  const p24Lang = p24UiLanguage(locale);

  const merchantId = getMerchantId();
  const posId = getPosId();
  const sign = signRegister({
    sessionId: orderId,
    merchantId,
    amount: amountGrosze,
    currency: "PLN",
  });

  const { token } = await p24Register({
    merchantId,
    posId,
    sessionId: orderId,
    amount: amountGrosze,
    currency: "PLN",
    description: `${event.title} ×${quantity}`,
    email,
    country: "PL",
    language: p24Lang,
    urlReturn: `${baseUrl}/${locale}/checkout/return`,
    urlStatus: `${baseUrl}/api/p24/notify`,
    sign,
  });

  redirect(getP24TrnUrl(token));
}
