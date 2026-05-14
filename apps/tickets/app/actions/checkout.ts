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
import { redirect as redirectNext } from "next/navigation";
import { redirect as redirectIntl } from "@/i18n/navigation";
import { headers } from "next/headers";
import { rateLimit, clientIp } from "@/lib/security";
import { routing, type AppLocale } from "@/i18n/routing";
import { requirePublicAppUrlForP24 } from "@/lib/publicAppUrl";
import { buildCheckoutReturnPath } from "@/lib/orderReceiptToken";

const CheckoutSchema = z.object({
  eventSlug: z.string().min(1),
  buyerName: z.string().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(20),
  locale: z.enum(["pl", "uk", "ru"]),
});

function p24UiLanguage(locale: AppLocale): string {
  if (locale === "pl") return "pl";
  // Przelewy24: для uk/ru используем английский UI (стабильно для песочницы)
  return "en";
}

export async function createPendingOrder(formData: FormData) {
  const h = await headers();
  const ip = clientIp(h);
  const localeRaw = formData.get("locale");
  const localeParsed = z.enum(["pl", "uk", "ru"]).safeParse(localeRaw);
  const locale = (localeParsed.success ? localeParsed.data : routing.defaultLocale) as AppLocale;
  const t = await getTranslations({ locale, namespace: "Errors" });

  if (!(await rateLimit(`order:${ip}`, 25, 60_000))) {
    throw new Error(t("rateLimit"));
  }

  if (formData.get("acceptLegal") !== "on") {
    throw new Error(t("legalNotAccepted"));
  }

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
    .select("id,slug,title,price_grosze,total_tickets,is_published,starts_at")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (evErr || !event || !event.is_published) {
    throw new Error(t("eventNotFound"));
  }

  const startMs = new Date(event.starts_at as string).getTime();
  if (!Number.isNaN(startMs) && startMs < Date.now()) {
    throw new Error(t("eventEnded"));
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

  const orderId = crypto.randomUUID();
  const amountGrosze = event.price_grosze * quantity;

  const marketingEmailOptIn = formData.get("marketingEmailOptIn") === "on";

  const orderInsert = {
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
    locale: parsed.data.locale,
    marketing_email_opt_in: marketingEmailOptIn,
  };

  let { error: insErr } = await supabase.from("orders").insert(orderInsert);

  if (insErr && insErr.code === "PGRST204" && /marketing_email_opt_in/i.test(insErr.message ?? "")) {
    const { marketing_email_opt_in: _marketingEmailOptIn, ...legacyOrderInsert } = orderInsert;
    console.warn(
      "[PopularTickets][checkout] orders.marketing_email_opt_in is missing in Supabase schema cache; creating order without marketing opt-in"
    );
    const retry = await supabase.from("orders").insert(legacyOrderInsert);
    insErr = retry.error;
  }

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
    redirectIntl({
      href: `/checkout/return?order=${encodeURIComponent(orderId)}`,
      locale,
    });
  }

  let baseUrl: string;
  try {
    baseUrl = requirePublicAppUrlForP24();
  } catch {
    throw new Error(t("appUrlMissing"));
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
    urlReturn: `${baseUrl}${await buildCheckoutReturnPath(locale, orderId)}`,
    urlStatus: `${baseUrl}/api/p24/notify`,
    sign,
  });

  redirectNext(getP24TrnUrl(token));
}
