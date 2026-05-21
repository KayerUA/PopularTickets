import { Resend } from "resend";
import { formatEventDateTime, formatPlnFromGrosze } from "@/lib/format";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { requireServiceSupabase } from "@/lib/supabase/admin";

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

export async function sendAdminSaleNotification(params: {
  orderId: string;
  ticketNumbers: string[];
}): Promise<void> {
  const to = notifyRecipients();
  if (!to.length) return;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[sendAdminSaleNotification] RESEND_API_KEY не задан — уведомление не отправлено");
    return;
  }

  const supabase = requireServiceSupabase();

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select(
      "id,created_at,buyer_name,email,phone,quantity,amount_grosze,status,marketing_email_opt_in,event_id",
    )
    .eq("id", params.orderId)
    .maybeSingle();

  if (oErr || !order) {
    console.error("[sendAdminSaleNotification] order load", oErr);
    return;
  }

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("id,title,slug,venue,starts_at,total_tickets")
    .eq("id", order.event_id)
    .maybeSingle();

  if (eErr || !event) {
    console.error("[sendAdminSaleNotification] event load", eErr);
    return;
  }

  const { count: soldCount, error: cErr } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", order.event_id);

  if (cErr) {
    console.error("[sendAdminSaleNotification] sold count", cErr);
    return;
  }

  const sold = soldCount ?? 0;
  const total = event.total_tickets as number;
  const remaining = Math.max(0, total - sold);
  const qty = order.quantity as number;
  const eventTitle = event.title as string;
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

  const subject = `[PopularTickets] ${qtyLabel} · ${eventTitle} · осталось ${remaining}`;

  const rows: [string, string][] = [
    ["Событие", eventTitle],
    ["Дата", startsAt],
    ["Место", (event.venue as string) || "—"],
    ["В этом заказе", String(qty)],
    ["Сумма", `${amount} ×${qty}`],
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
<p style="margin:0 0 16px;font-size:18px;font-weight:600">${escapeHtml(qtyLabel)}</p>
<table style="border-collapse:collapse;font-size:14px;line-height:1.4">${tableHtml}</table>
${
  adminOrdersUrl
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(adminOrdersUrl)}" style="color:#d4a853">Заказы в админке →</a></p>`
    : ""
}
</body></html>`;

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM_EMAIL || fromDefault;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[sendAdminSaleNotification] Resend error", error);
  }
}
