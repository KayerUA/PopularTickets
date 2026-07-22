import { Resend } from "resend";
import { formatPlnFromGrosze } from "@/lib/format";
import type { GiftProductCode } from "@/lib/giftProducts";
import type { AppLocale } from "@/i18n/routing";
import { getTelegramOwnerUserIds } from "@/lib/telegram/config";
import { sendTelegramMessage } from "@/lib/telegram/telegramBotApi";

const fromDefault = "PopularTickets <onboarding@resend.dev>";

function senderAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || process.env.RESEND_FROM?.trim() || fromDefault;
}

function resendErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "неизвестная ошибка Resend";
}

async function notifyTelegramAboutResendError(params: {
  orderId: string;
  recipient: "покупателю" | "администратору";
  error: unknown;
}): Promise<void> {
  const chatIds = getTelegramOwnerUserIds();
  if (!chatIds.size) return;

  const text = [
    "⚠️ Не отправилось письмо Resend",
    `Сертификат: ${params.orderId}`,
    `Получатель: ${params.recipient}`,
    `Причина: ${resendErrorMessage(params.error).slice(0, 500)}`,
  ].join("\n");

  await Promise.all(
    [...chatIds].map(async (chatId) => {
      try {
        await sendTelegramMessage(chatId, text);
      } catch (telegramError) {
        console.error("[sendGiftOrderEmails] Telegram alert", telegramError);
      }
    }),
  );
}

function notifyRecipients(): string[] {
  const raw = process.env.ADMIN_SALE_NOTIFY_EMAIL?.trim();
  if (!raw) return [];
  return raw.split(/[,;]+/).map((e) => e.trim()).filter(Boolean);
}

function productLabel(code: GiftProductCode, locale: AppLocale): string {
  if (code === "pass_4") {
    return locale === "pl"
      ? "Abonament 4 zajęć"
      : locale === "uk"
        ? "Абонемент 4 заняття"
        : "Абонемент 4 занятий";
  }
  return locale === "pl"
    ? "Zajęcia próbne w prezencie"
    : locale === "uk"
      ? "Пробне заняття в подарунок"
      : "Пробное занятие в подарок";
}

export async function sendGiftOrderEmails(params: {
  orderId: string;
  productCode: GiftProductCode;
  buyerName: string;
  email: string;
  phone: string | null;
  recipientName: string | null;
  giftMessage: string | null;
  amountGrosze: number;
  locale: AppLocale;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const product = productLabel(params.productCode, params.locale);
  const amount = formatPlnFromGrosze(params.amountGrosze);

  if (key && process.env.SKIP_ORDER_EMAIL !== "true") {
    const resend = new Resend(key);
    const buyerSubject =
      params.locale === "pl"
        ? "Potwierdzenie zamówienia certyfikatu — Popular Poet"
        : params.locale === "uk"
          ? "Підтвердження замовлення сертифіката — Popular Poet"
          : "Подтверждение заказа сертификата — Popular Poet";

    const buyerBody =
      params.locale === "pl"
        ? `Dziękujemy, ${params.buyerName}!\n\nOtrzymaliśmy płatność za: ${product} (${amount}).\nSkontaktujemy się w ciągu 1–2 dni roboczych, aby przekazać certyfikat${params.recipientName ? ` dla ${params.recipientName}` : ""}.\n\nPopular Poet · PopularTickets`
        : params.locale === "uk"
          ? `Дякуємо, ${params.buyerName}!\n\nМи отримали оплату: ${product} (${amount}).\nЗв’яжемося протягом 1–2 робочих днів, щоб передати сертифікат${params.recipientName ? ` для ${params.recipientName}` : ""}.\n\nPopular Poet · PopularTickets`
          : `Спасибо, ${params.buyerName}!\n\nОплата получена: ${product} (${amount}).\nМы свяжемся в течение 1–2 рабочих дней, чтобы передать сертификат${params.recipientName ? ` для ${params.recipientName}` : ""}.\n\nPopular Poet · PopularTickets`;

    try {
      const { error } = await resend.emails.send({
        from: senderAddress(),
        to: params.email,
        subject: buyerSubject,
        text: buyerBody,
      });
      if (error) {
        console.error("[sendGiftOrderEmails] buyer Resend error", error);
        await notifyTelegramAboutResendError({
          orderId: params.orderId,
          recipient: "покупателю",
          error,
        });
      }
    } catch (e) {
      console.error("[sendGiftOrderEmails] buyer", e);
      await notifyTelegramAboutResendError({
        orderId: params.orderId,
        recipient: "покупателю",
        error: e,
      });
    }
  }

  const adminTo = notifyRecipients();
  if (!key || !adminTo.length) return;

  const resend = new Resend(key);
  const lines = [
    `🎁 Новый сертификат (${params.orderId})`,
    `Продукт: ${product}`,
    `Сумма: ${amount}`,
    `Покупатель: ${params.buyerName}`,
    `Email: ${params.email}`,
    params.phone ? `Телефон: ${params.phone}` : null,
    params.recipientName ? `Получатель: ${params.recipientName}` : null,
    params.giftMessage ? `Пожелание: ${params.giftMessage}` : null,
  ].filter(Boolean);

  try {
    const { error } = await resend.emails.send({
      from: senderAddress(),
      to: adminTo,
      subject: `[Popular Poet] Сертификат · ${amount}`,
      text: lines.join("\n"),
    });
    if (error) {
      console.error("[sendGiftOrderEmails] admin Resend error", error);
      await notifyTelegramAboutResendError({
        orderId: params.orderId,
        recipient: "администратору",
        error,
      });
    }
  } catch (e) {
    console.error("[sendGiftOrderEmails] admin", e);
    await notifyTelegramAboutResendError({
      orderId: params.orderId,
      recipient: "администратору",
      error: e,
    });
  }
}

export async function fulfillPaidGiftOrder(orderId: string, p24OrderId?: number | null): Promise<void> {
  const { requireServiceSupabase } = await import("@/lib/supabase/admin");
  const supabase = requireServiceSupabase();

  const { data: order, error } = await supabase
    .from("gift_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) throw new Error("gift order not found");
  if (order.status === "paid") return;

  const { error: updErr } = await supabase
    .from("gift_orders")
    .update({
      status: "paid",
      ...(p24OrderId != null ? { p24_order_id: p24OrderId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (updErr) throw new Error(updErr.message);

  await sendGiftOrderEmails({
    orderId: order.id,
    productCode: order.product_code as GiftProductCode,
    buyerName: order.buyer_name,
    email: order.email,
    phone: order.phone,
    recipientName: order.recipient_name,
    giftMessage: order.gift_message,
    amountGrosze: order.amount_grosze,
    locale: order.locale as AppLocale,
  });
}
