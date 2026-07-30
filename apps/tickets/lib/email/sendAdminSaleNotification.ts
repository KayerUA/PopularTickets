import { Resend } from "resend";
import { formatEventDateTime, formatPlnFromGrosze } from "@/lib/format";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { getTelegramOwnerUserIds } from "@/lib/telegram/config";
import { sendTelegramMessage } from "@/lib/telegram/telegramBotApi";

const fromDefault = "PopularTickets <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notifyRecipients(): string[] {
  const raw = process.env.ADMIN_SALE_NOTIFY_EMAIL?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function listingKindLabel(raw: string | null | undefined): string {
  if (raw === "trial") return "пробное";
  if (raw === "special") return "спец";
  return "шоу";
}

type OrderRow = {
  id: string;
  created_at: string;
  buyer_name: string;
  email: string;
  phone: string | null;
  quantity: number;
  amount_grosze: number;
  status: string;
  marketing_email_opt_in?: boolean | null;
  event_id: string;
};

type EventRow = {
  id: string;
  title: string;
  slug: string;
  venue: string;
  starts_at: string;
  total_tickets: number;
  listing_kind?: string | null;
};

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  const supabase = requireServiceSupabase();
  const full = await supabase
    .from("orders")
    .select(
      "id,created_at,buyer_name,email,phone,quantity,amount_grosze,status,marketing_email_opt_in,event_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!full.error && full.data) return full.data as OrderRow;

  if (full.error && /marketing_email_opt_in|PGRST204|schema cache/i.test(full.error.message)) {
    console.warn(
      "[sendAdminSaleNotification] marketing_email_opt_in недоступен — грузим заказ без него",
    );
    const legacy = await supabase
      .from("orders")
      .select("id,created_at,buyer_name,email,phone,quantity,amount_grosze,status,event_id")
      .eq("id", orderId)
      .maybeSingle();
    if (legacy.error || !legacy.data) {
      console.error("[sendAdminSaleNotification] order load", legacy.error ?? full.error);
      return null;
    }
    return { ...(legacy.data as OrderRow), marketing_email_opt_in: null };
  }

  console.error("[sendAdminSaleNotification] order load", full.error);
  return null;
}

async function loadEvent(eventId: string): Promise<EventRow | null> {
  const supabase = requireServiceSupabase();
  const full = await supabase
    .from("events")
    .select("id,title,slug,venue,starts_at,total_tickets,listing_kind")
    .eq("id", eventId)
    .maybeSingle();

  if (!full.error && full.data) return full.data as EventRow;

  if (full.error && /listing_kind|PGRST204|schema cache/i.test(full.error.message)) {
    const legacy = await supabase
      .from("events")
      .select("id,title,slug,venue,starts_at,total_tickets")
      .eq("id", eventId)
      .maybeSingle();
    if (legacy.error || !legacy.data) {
      console.error("[sendAdminSaleNotification] event load", legacy.error ?? full.error);
      return null;
    }
    return { ...(legacy.data as EventRow), listing_kind: null };
  }

  console.error("[sendAdminSaleNotification] event load", full.error);
  return null;
}

export async function sendAdminSaleNotification(params: {
  orderId: string;
  ticketNumbers: string[];
  /**
   * true = P24/bypass retry when tickets already existed.
   * Шлём письмо только если ещё не фиксировали успешную admin-notify для заказа.
   */
  forceRetry?: boolean;
}): Promise<void> {
  const to = notifyRecipients();
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  const from =
    (process.env.RESEND_FROM_EMAIL ?? "").trim() ||
    (process.env.RESEND_FROM ?? "").trim() ||
    fromDefault;

  const supabase = requireServiceSupabase();

  if (params.forceRetry) {
    const { data: already } = await supabase
      .from("payment_callbacks")
      .select("id")
      .eq("order_id", params.orderId)
      .eq("status", "admin_notified")
      .limit(1)
      .maybeSingle();
    if (already) return;
  }

  const order = await loadOrder(params.orderId);
  if (!order) return;

  const event = await loadEvent(order.event_id);
  if (!event) return;

  let sold = 0;
  const { count: soldCount, error: cErr } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", order.event_id);

  if (cErr) {
    console.error("[sendAdminSaleNotification] sold count", cErr);
  } else {
    sold = soldCount ?? 0;
  }

  const total = event.total_tickets as number;
  const remaining = Math.max(0, total - sold);
  const qty = order.quantity as number;
  const eventTitle = event.title as string;
  const kind = listingKindLabel(event.listing_kind);
  const startsAt = formatEventDateTime(event.starts_at as string, "pl");
  const amount = formatPlnFromGrosze(order.amount_grosze as number);
  const appUrl = getPublicAppUrl();
  const adminOrdersUrl = appUrl
    ? `${appUrl}/admin/orders?event=${encodeURIComponent(event.id as string)}`
    : null;

  const ticketList = params.ticketNumbers.length
    ? params.ticketNumbers
    : [`×${qty} (номера после создания)`];

  const qtyLabel =
    qty === 1 ? "1 билет продан" : qty < 5 ? `${qty} билета продано` : `${qty} билетов продано`;

  const subject = `[PopularTickets] ${qtyLabel} · ${kind} · ${eventTitle} · осталось ${remaining}`;

  let emailOk = false;
  let emailSkipReason: string | null = null;

  if (!to.length) {
    emailSkipReason = "ADMIN_SALE_NOTIFY_EMAIL пустой";
    console.warn(`[sendAdminSaleNotification] ${emailSkipReason}`);
  } else if (!key) {
    emailSkipReason = "RESEND_API_KEY пустой";
    console.warn(`[sendAdminSaleNotification] ${emailSkipReason}`);
  } else {
    const rows: [string, string][] = [
      ["Событие", eventTitle],
      ["Тип", kind],
      ["Дата", startsAt],
      ["Место", (event.venue as string) || "—"],
      ["В этом заказе", String(qty)],
      ["Сумма заказа", amount],
      ["Продано всего", `${sold} / ${total}`],
      ["Осталось мест", String(remaining)],
      ["Покупатель", order.buyer_name as string],
      ["Email", order.email as string],
      ["Телефон", ((order.phone as string | null)?.trim() || "—") as string],
      ["Рассылка", order.marketing_email_opt_in ? "да" : "—"],
      ["Билеты", ticketList.join(", ")],
      ["Заказ", order.id as string],
    ];

    const tableHtml = rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#71717a;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;color:#fafafa">${escapeHtml(value)}</td></tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;padding:24px">
<p style="margin:0 0 16px;font-size:18px;font-weight:600">${escapeHtml(qtyLabel)} · ${escapeHtml(kind)}</p>
<table style="border-collapse:collapse;font-size:14px;line-height:1.4">${tableHtml}</table>
${
  adminOrdersUrl
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(adminOrdersUrl)}" style="color:#d4a853">Заказы в админке →</a></p>`
    : ""
}
</body></html>`;

    try {
      const resend = new Resend(key);
      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        emailSkipReason = resendErrorMessage(error);
        console.error("[sendAdminSaleNotification] Resend error", error);
      } else {
        emailOk = true;
      }
    } catch (e) {
      emailSkipReason = e instanceof Error ? e.message : "Resend throw";
      console.error("[sendAdminSaleNotification] Resend throw", e);
    }
  }

  // Telegram владельцам всегда — даже если Resend/env пустые (типичная причина «раньше приходило — потом нет»).
  const ownerIds = getTelegramOwnerUserIds();
  if (ownerIds.size) {
    const tgText = emailOk
      ? [
          "✅ Продажа",
          `${kind}: ${eventTitle}`,
          `📅 ${startsAt}`,
          `💰 ${amount} · ${qty} шт. · осталось ${remaining}`,
          `👤 ${order.buyer_name}`,
          `✉️ ${order.email}`,
          order.phone?.trim() ? `📞 ${order.phone.trim()}` : null,
        ]
      : [
          "⚠️ Продажа — письмо админу НЕ ушло",
          `${kind}: ${eventTitle}`,
          `📅 ${startsAt}`,
          `💰 ${amount} · ${qty} шт. · осталось ${remaining}`,
          `👤 ${order.buyer_name}`,
          `✉️ ${order.email}`,
          order.phone?.trim() ? `📞 ${order.phone.trim()}` : null,
          `Заказ: ${order.id}`,
          emailSkipReason ? `Причина: ${emailSkipReason}` : null,
          "Vercel Production: RESEND_API_KEY + RESEND_FROM_EMAIL + ADMIN_SALE_NOTIFY_EMAIL",
        ];

    await Promise.all(
      [...ownerIds].map(async (chatId) => {
        try {
          await sendTelegramMessage(chatId, tgText.filter(Boolean).join("\n"));
        } catch (telegramError) {
          console.error("[sendAdminSaleNotification] Telegram sale ping", telegramError);
        }
      }),
    );
  }

  if (emailOk) {
    const { error: auditErr } = await supabase.from("payment_callbacks").insert({
      provider: "admin_notify",
      order_id: order.id,
      provider_order_id: null,
      session_id: `admin-notify-${order.id}`,
      status: "admin_notified",
      payload: { ticketNumbers: params.ticketNumbers, listingKind: event.listing_kind ?? null },
    });
    if (auditErr) {
      console.warn("[sendAdminSaleNotification] audit insert skipped:", auditErr.message);
    }
  }
}

function resendErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "ошибка Resend";
}
