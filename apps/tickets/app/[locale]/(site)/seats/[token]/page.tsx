import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seatingOrderId, loadSeatMap } from "@/lib/seating/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { PaidSeatSelection } from "@/components/PaidSeatSelection";
import { seatingText, seatLabel } from "@/lib/seating/i18n";
import { loadOrderReceiptState } from "@/lib/checkoutReceipt";
import { ticketQrDataUrl } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf } from "@/lib/renderTicketLayoutPdf";
import { emailTicketPdfLayoutStrings } from "@/lib/email/ticketEmailI18n";
import { formatEventDateTime } from "@/lib/format";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wybór miejsc — PopularTickets", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function SeatSelectionPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale: raw, token } = await params;
  if (raw !== "pl" && raw !== "uk" && raw !== "ru") notFound();
  const locale = raw;
  const t = seatingText[locale];
  const id = await seatingOrderId(token);
  if (!id) return <p className="p-8 text-amber-200">{t.invalid}</p>;
  const db = requireServiceSupabase();
  const { data: order } = await db.from("orders").select("id,event_id,quantity,status").eq("id", id).maybeSingle();
  if (!order || order.status !== "paid") return <p className="p-8 text-amber-200">{t.invalid}</p>;
  const [{ data: event }, { data: tickets, error: te }] = await Promise.all([
    db.from("events").select("title,starts_at").eq("id", order.event_id).single(),
    db.from("tickets").select("seat_id").eq("order_id", id),
  ]);
  if (!event || te || !tickets) notFound();
  const assigned = tickets.length === order.quantity && tickets.every(t => t.seat_id);
  const map = await loadSeatMap(order.event_id);
  if (!map) return <p className="p-8 text-amber-200">{t.unavailable}</p>;
  const receipt = assigned ? await loadOrderReceiptState(db, id) : null;
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
    <h1 className="text-2xl font-semibold text-poet-gold-bright">{event.title}</h1>
    <p className="text-zinc-400">{formatEventDateTime(event.starts_at, locale)}</p>
    {assigned ? <>
      <p className="text-emerald-300">{t.saved}</p>
      {receipt?.kind === "paid" && <ul className="space-y-3">{await Promise.all(receipt.receipt.tickets.map(async ticket => {
        const pdf = await renderTicketLayoutPdf({ qrPngDataUrl: await ticketQrDataUrl(ticket.id), eventTitle: receipt.receipt.eventTitle,
          venue: receipt.receipt.venue, dateTimeLabel: formatEventDateTime(receipt.receipt.startsAt, locale),
          ticketNumber: ticket.ticket_number, ticketId: ticket.id, seatLabel: seatLabel(ticket.seat_id, locale), ...emailTicketPdfLayoutStrings(locale) });
        return <li key={ticket.id} className="rounded-xl border border-poet-gold/20 p-4 text-zinc-200">
          <p>{ticket.ticket_number} · {seatLabel(ticket.seat_id, locale)}</p>
          <a className="text-poet-gold underline" download={`bilet-${ticket.ticket_number}.pdf`} href={`data:application/pdf;base64,${pdf.toString("base64")}`}>{t.download}</a>
        </li>;
      }))}</ul>}
    </> : Date.parse(event.starts_at) <= Date.now() ? <p>{t.invalid}</p> : <>
      <p className="text-zinc-300">{t.paid}</p>
      <PaidSeatSelection map={map} quantity={order.quantity} locale={locale} token={token} />
    </>}
  </main>;
}
