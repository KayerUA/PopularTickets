"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { redirect as redirectNext } from "next/navigation";
import { headers } from "next/headers";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import {
  getMerchantId,
  getPosId,
  getP24TrnUrl,
  p24Register,
  signRegister,
  P24RegisterAuthError,
} from "@/lib/p24";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { rateLimit, clientIp } from "@/lib/security";
import { routing, type AppLocale } from "@/i18n/routing";
import { requirePublicAppUrlForP24 } from "@/lib/publicAppUrl";
import { signOrderReceiptToken } from "@/lib/orderReceiptToken";
import { getGiftProduct, giftP24Description, type GiftProductCode } from "@/lib/giftProducts";
import { fulfillPaidGiftOrder } from "@/lib/email/sendGiftOrderEmails";

function p24UiLanguage(locale: AppLocale): string {
  if (locale === "pl") return "pl";
  return "en";
}

async function buildGiftReturnPath(locale: AppLocale, orderId: string): Promise<string> {
  const rt = await signOrderReceiptToken(orderId);
  if (rt) return `/${locale}/podarok/dziekujemy?rt=${encodeURIComponent(rt)}`;
  return `/${locale}/podarok/dziekujemy?order=${encodeURIComponent(orderId)}`;
}

export async function createPendingGiftOrder(
  formData: FormData,
): Promise<void | { p24Url: string }> {
  const h = await headers();
  const ip = clientIp(h);
  const localeRaw = formData.get("locale");
  const localeParsed = z.enum(["pl", "uk", "ru"]).safeParse(localeRaw);
  const locale = (localeParsed.success ? localeParsed.data : routing.defaultLocale) as AppLocale;
  const t = await getTranslations({ locale, namespace: "Errors" });
  const tg = await getTranslations({ locale, namespace: "GiftPage" });

  const Schema = z.object({
    productCode: z.enum(["trial_gift", "pass_4"]),
    buyerName: z.string().trim().min(2).max(120),
    email: z.string().trim().email({ message: tg("emailInvalid") }).max(254),
    phone: z
      .string()
      .trim()
      .min(1, { message: tg("phoneRequired") })
      .max(40)
      .refine((s) => s.replace(/\D/g, "").length >= 7, { message: tg("phoneInvalid") }),
    recipientName: z.string().trim().max(120).optional(),
    giftMessage: z.string().trim().max(500).optional(),
    locale: z.enum(["pl", "uk", "ru"]),
  });

  if (!(await rateLimit(`gift:${ip}`, 15, 60_000))) {
    throw new Error(t("rateLimit"));
  }

  if (formData.get("acceptLegal") !== "on") {
    throw new Error(t("legalNotAccepted"));
  }

  const parsed = Schema.safeParse({
    productCode: formData.get("productCode"),
    buyerName: formData.get("buyerName"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? ""),
    recipientName: String(formData.get("recipientName") ?? "").trim() || undefined,
    giftMessage: String(formData.get("giftMessage") ?? "").trim() || undefined,
    locale,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).filter(Boolean).join(" ");
    throw new Error(msg || t("validation"));
  }

  const product = getGiftProduct(parsed.data.productCode as GiftProductCode);
  if (!product) throw new Error(t("validation"));

  const orderId = randomUUID();
  const supabase = requireServiceSupabase();

  const { error: insErr } = await supabase.from("gift_orders").insert({
    id: orderId,
    product_code: product.code,
    buyer_name: parsed.data.buyerName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    recipient_name: parsed.data.recipientName ?? null,
    gift_message: parsed.data.giftMessage ?? null,
    amount_grosze: product.priceGrosze,
    currency: "PLN",
    status: "pending",
    locale,
    p24_session_id: orderId,
  });

  if (insErr) {
    console.error("[gift checkout] insert", insErr);
    throw new Error(t("orderCreateFailed"));
  }

  if (isCheckoutBypassPayment()) {
    await fulfillPaidGiftOrder(orderId);
    redirectNext(await buildGiftReturnPath(locale, orderId));
  }

  let baseUrl: string;
  try {
    baseUrl = requirePublicAppUrlForP24();
  } catch {
    throw new Error(t("appUrlMissing"));
  }

  try {
    const merchantId = getMerchantId();
    const posId = getPosId();
    const sign = signRegister({
      sessionId: orderId,
      merchantId,
      amount: product.priceGrosze,
      currency: "PLN",
    });

    const token = (
      await p24Register({
        merchantId,
        posId,
        sessionId: orderId,
        amount: product.priceGrosze,
        currency: "PLN",
        description: giftP24Description(product.code, locale),
        email: parsed.data.email,
        country: "PL",
        language: p24UiLanguage(locale),
        encoding: "UTF-8",
        regulationAccept: true,
        urlReturn: `${baseUrl}${await buildGiftReturnPath(locale, orderId)}`,
        urlStatus: `${baseUrl}/api/p24/notify`,
        sign,
      })
    ).token;

    return { p24Url: getP24TrnUrl(token) };
  } catch (e) {
    console.error("[gift checkout] P24", e);
    if (e instanceof P24RegisterAuthError) throw new Error(t("p24AuthFailed"));
    throw new Error(t("p24CheckoutFailed"));
  }
}
