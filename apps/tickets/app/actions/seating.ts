"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { seatingLink, seatingOrderId } from "@/lib/seating/server";
import { SCENA_KOCJANA } from "@/lib/seating/scenaKocjana";
import { seatLabel, seatingText } from "@/lib/seating/i18n";
import { rateLimit, clientIp } from "@/lib/security";
import { sendTicketsEmail } from "@/lib/email/sendTickets";
import { formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

export async function assignSeats(input: { token?: string; orderId?: string; seats: string[]; locale: AppLocale }) {
  const locale = z.enum(["pl", "ru", "uk"]).parse(input.locale);
  const ids = z.array(z.string().max(20)).min(1).max(50).parse(input.seats);
  if (!(await rateLimit(`seat-claim:${clientIp(await headers())}`, 30, 60_000))) return { error: seatingText[locale].unavailable };
  let orderId: string | null;
  if (input.token) orderId = await seatingOrderId(input.token);
  else { await requireAdmin(); orderId = z.string().uuid().parse(input.orderId); }
  if (!orderId) return { error: seatingText[locale].invalid };
  const db = requireServiceSupabase();
  const { data: changed, error } = await db.rpc("pt_assign_paid_seats", { p_order_id: orderId, p_seat_ids: ids });
  if (error) return { error: seatingText[locale].conflict };
  if (!changed) return { saved: true, emailFailed: false };
  let emailFailed = false;
  try {
    const { data: order, error: oe } = await db.from("orders").select("email,event_id,locale").eq("id", orderId).single();
    if (oe || !order) throw new Error("order_missing");
    const [{ data: event, error: ee }, { data: tickets, error: te }] = await Promise.all([
      db.from("events").select("title,venue,starts_at").eq("id", order.event_id).single(),
      db.from("tickets").select("id,ticket_number,seat_id").eq("order_id", orderId).order("ticket_number"),
    ]);
    if (ee || te || !event || !tickets) throw new Error("tickets_missing");
    const emailLocale: AppLocale = order.locale === "uk" || order.locale === "ru" ? order.locale : "pl";
    if (!process.env.RESEND_API_KEY) throw new Error("email_unconfigured");
    await sendTicketsEmail({ to: order.email, eventTitle: event.title, venue: event.venue,
      startsAt: formatEventDateTime(event.starts_at, emailLocale), locale: emailLocale,
      tickets: tickets.map(t => ({ id: t.id, ticketNumber: t.ticket_number, seatLabel: seatLabel(t.seat_id, emailLocale) })),
    });
  } catch (e) { console.error("seating ticket email failed", e); emailFailed = true; }
  revalidatePath("/admin/seating");
  if (input.token) revalidatePath(`/${locale}/seats/${input.token}`);
  return { saved: true, emailFailed };
}

export async function enableSeating(form: FormData) {
  await requireAdmin();
  const eventId = z.string().uuid().parse(form.get("eventId"));
  // Validate link signing configuration before enabling the legacy workflow.
  await seatingLink(eventId, "ru");
  const { error } = await requireServiceSupabase().rpc("pt_enable_seating", {
    p_event_id: eventId,
    p_seats: SCENA_KOCJANA.seats.map(s => ({ ...s, rowIndex: SCENA_KOCJANA.rows.indexOf(s.row as typeof SCENA_KOCJANA.rows[number]) })),
  });
  if (error) throw new Error(error.message.includes("too_many_tickets")
    ? "Оплаченные билеты и незавершённые оплаты превышают 184 места. Сначала проверьте заказы."
    : error.message);
  revalidatePath("/admin/seating");
}
export async function changeSeatingMode(form: FormData) {
  await requireAdmin();
  const { error } = await requireServiceSupabase().rpc("pt_seating_mode", {
    p_event_id: z.string().uuid().parse(form.get("eventId")), p_mode: z.enum(["priority", "open"]).parse(form.get("mode")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/seating");
}
export async function blockSeat(form: FormData) {
  await requireAdmin();
  const { error } = await requireServiceSupabase().rpc("pt_block_seat", {
    p_event_id: z.string().uuid().parse(form.get("eventId")), p_seat_id: z.string().min(1).max(20).parse(form.get("seatId")), p_blocked: form.get("blocked") === "true",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/seating");
}

export async function inviteToChooseSeats(form: FormData) {
  await requireAdmin();
  const orderId = z.string().uuid().parse(form.get("orderId"));
  const db = requireServiceSupabase();
  const { data: o, error } = await db.from("orders").select("id,email,locale,event_id,status,quantity,tickets(seat_id)").eq("id", orderId).single();
  if (error || !o || o.status !== "paid" || o.tickets.every(t => t.seat_id)) throw new Error("Нет оплаченных билетов без мест");
  const [{ data: e }, { data: config }] = await Promise.all([
    db.from("events").select("title,starts_at").eq("id", o.event_id).single(),
    db.from("event_seating").select("event_id").eq("event_id", o.event_id).single(),
  ]);
  if (!e || !config || Date.parse(e.starts_at) <= Date.now()) throw new Error("Рассадка недоступна");
  const locale: AppLocale = o.locale === "ru" || o.locale === "uk" ? o.locale : "pl";
  const url = await seatingLink(o.id, locale);
  const { Resend } = await import("resend");
  const { esc } = await import("@/lib/email/htmlEscape");
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error("Email не настроен");
  const message = locale === "ru" ? "Мы добавили выбор мест в зале. Выберите места для ваших оплаченных билетов по персональной ссылке. Доплачивать не нужно; номера билетов и QR сохраняются. Если нужна помощь, ответьте на это письмо." : locale === "uk" ? "Ми додали вибір місць у залі. Оберіть місця для оплачених квитків за персональним посиланням. Доплачувати не потрібно; номери квитків і QR зберігаються. Якщо потрібна допомога, дайте відповідь на цей лист." : "Dodaliśmy wybór miejsc na sali. Wybierz miejsca dla opłaconych biletów przez osobisty link. Bez dopłaty; numery biletów i kody QR pozostają ważne. Jeśli potrzebujesz pomocy, odpowiedz na tę wiadomość.";
  const { error: sendError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM_EMAIL, to: o.email, subject: `${seatingText[locale].title} — ${e.title}`,
    text: `${e.title}\n${formatEventDateTime(e.starts_at, locale)}\n\n${message}\n\n${url}`,
    html: `<h1>${esc(e.title)}</h1><p>${esc(formatEventDateTime(e.starts_at, locale))}</p><p>${esc(message)}</p><p><a href="${esc(url)}">${esc(seatingText[locale].link)}</a></p>`,
  }, { idempotencyKey: `seat-invite-${orderId}-${new Date().toISOString().slice(0,10)}` });
  if (sendError) throw new Error("Не удалось отправить приглашение");
  const { error: updateError } = await db.from("orders").update({ seating_invited_at: new Date().toISOString() }).eq("id", orderId);
  if (updateError) throw new Error("Письмо отправлено, но отметка отправки не сохранилась");
  revalidatePath("/admin/seating");
}
