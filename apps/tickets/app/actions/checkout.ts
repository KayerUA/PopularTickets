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
  p24RegisterDescription,
  signRegister,
  P24RegisterAuthError,
} from "@/lib/p24";
import { bypassPaymentAndFulfillOrder } from "@/lib/fulfillment";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { redirect as redirectNext } from "next/navigation";
import { headers } from "next/headers";
import { rateLimit, clientIp } from "@/lib/security";
import { routing, type AppLocale } from "@/i18n/routing";
import { requirePublicAppUrlForP24 } from "@/lib/publicAppUrl";
import { buildCheckoutReturnPath } from "@/lib/orderReceiptToken";
import { allowsPublicEventByVisibility } from "@/lib/contentVisibility";
import { effectiveEventPriceGrosze } from "@/lib/eventPrice";
import { normalizePromoCode, promoDiscountGrosze, resolveApplicablePromoCode } from "@/lib/promoCodes";

function p24UiLanguage(locale: AppLocale): string {
  if (locale === "pl") return "pl";
  // Przelewy24: для uk/ru используем английский UI (стабильно для песочницы)
  return "en";
}

export async function createPendingOrder(
  formData: FormData
): Promise<void | { p24Url: string }> {
  const h = await headers();
  const ip = clientIp(h);
  const localeRaw = formData.get("locale");
  const localeParsed = z.enum(["pl", "uk", "ru"]).safeParse(localeRaw);
  const locale = (localeParsed.success ? localeParsed.data : routing.defaultLocale) as AppLocale;
  const t = await getTranslations({ locale, namespace: "Errors" });
  const tc = await getTranslations({ locale, namespace: "CheckoutForm" });

  const CheckoutSchema = z.object({
    eventSlug: z.string().min(1),
    buyerName: z.string().trim().min(2).max(120),
    email: z.string().trim().email({ message: tc("emailInvalid") }).max(254),
    phone: z.string().trim().max(40),
    quantity: z.coerce.number().int().min(1).max(20),
    locale: z.enum(["pl", "uk", "ru"]),
  });

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
    phone: String(formData.get("phone") ?? ""),
    quantity: formData.get("quantity"),
    locale,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).filter(Boolean).join(" ");
    throw new Error(msg || t("validation"));
  }
  const { eventSlug, buyerName, email, phone, quantity } = parsed.data;

  const supabase = requireServiceSupabase();
  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id,slug,price_grosze,day_of_event_price_grosze,total_tickets,visibility,starts_at,listing_kind,discount_periods")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (evErr || !event || !allowsPublicEventByVisibility(String(event.visibility ?? ""))) {
    throw new Error(t("eventNotFound"));
  }
  if (!phone || phone.replace(/\D/g, "").length < 7) {
    throw new Error(!phone ? tc("phoneRequired") : tc("phoneInvalid"));
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
  const baseAmountGrosze = effectiveEventPriceGrosze({
    starts_at: event.starts_at as string,
    price_grosze: event.price_grosze as number,
    day_of_event_price_grosze: event.day_of_event_price_grosze as number | null,
    listing_kind: event.listing_kind as string | null,
    discount_periods: (event as { discount_periods?: unknown }).discount_periods,
  }) * quantity;
  const promo = await resolveApplicablePromoCode(supabase, formData.get("promoCode")?.toString(), {
    id: event.id as string,
    listingKind: event.listing_kind as string | null,
  });
  const promoDiscount = promo ? promoDiscountGrosze(baseAmountGrosze, promo.discountPercent) : 0;
  const amountGrosze = baseAmountGrosze - promoDiscount;

  const marketingEmailOptIn = formData.get("marketingEmailOptIn") === "on";

  const orderInsert = {
    id: orderId,
    event_id: event.id,
    buyer_name: buyerName,
    email,
    phone: phone.trim() || null,
    quantity,
    amount_grosze: amountGrosze,
    currency: "PLN",
    status: "pending",
    p24_session_id: orderId,
    locale: parsed.data.locale,
    marketing_email_opt_in: marketingEmailOptIn,
    promo_code_id: promo?.id ?? null,
    promo_code: promo?.code ?? (normalizePromoCode(formData.get("promoCode")?.toString()) || null),
    promo_discount_grosze: promoDiscount,
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
    redirectNext(await buildCheckoutReturnPath(locale, orderId));
  }

  let baseUrl: string;
  try {
    baseUrl = requirePublicAppUrlForP24();
  } catch {
    throw new Error(t("appUrlMissing"));
  }

  const p24Lang = p24UiLanguage(locale);

  let token: string;
  try {
    const merchantId = getMerchantId();
    const posId = getPosId();
    const sign = signRegister({
      sessionId: orderId,
      merchantId,
      amount: amountGrosze,
      currency: "PLN",
    });

    token = (
      await p24Register({
        merchantId,
        posId,
        sessionId: orderId,
        amount: amountGrosze,
        currency: "PLN",
        description: p24RegisterDescription(eventSlug, quantity),
        email,
        country: "PL",
        language: p24Lang,
        encoding: "UTF-8",
        regulationAccept: true,
        urlReturn: `${baseUrl}${await buildCheckoutReturnPath(locale, orderId)}`,
        urlStatus: `${baseUrl}/api/p24/notify`,
        sign,
      })
    ).token;
  } catch (e) {
    console.error("[PopularTickets][checkout] P24 unavailable", e);
    if (e instanceof P24RegisterAuthError) {
      throw new Error(t("p24AuthFailed"));
    }
    throw new Error(t("p24CheckoutFailed"));
  }

  /** Внешний хост P24: полный переход через location надёжнее, чем redirect() из action внутри client transition. */
  return { p24Url: getP24TrnUrl(token) };
}
