import { SeatingAdminForm } from "@/components/SeatingAdminForm";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminGuard";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { loadSeatMap, seatingLink } from "@/lib/seating/server";
import { enableSeating, changeSeatingMode, blockSeat, inviteToChooseSeats } from "@/app/actions/seating";
import { PaidSeatSelection } from "@/components/PaidSeatSelection";
import { CopyTextButton } from "@/components/CopyTextButton";
import { formatPlDateTime } from "@/lib/format";
export default async function AdminSeating({ searchParams }: { searchParams: Promise<{ event?: string; order?: string }> }) {
  await requireAdmin();
  const { event: eventId, order: orderId } = await searchParams;
  const db = requireServiceSupabase();
  const { data: events, error: ee } = await db.from("events").select("id,title,starts_at,venue").gt("starts_at", new Date().toISOString()).order("starts_at");
  if (ee) throw new Error("Не удалось загрузить события");
  const event = events?.find(e => e.id === eventId);
  const map = event ? await loadSeatMap(event.id) : null;
  const { data: orders, error: oe } = event ? await db.from("orders").select("id,buyer_name,email,phone,quantity,locale,seating_attention,seating_invited_at,tickets(seat_id)").eq("event_id", event.id).eq("status", "paid").order("created_at") : { data: null, error: null };
  if (oe) throw new Error("Не удалось загрузить заказы. Проверьте миграцию рассадки.");
  const chosen = orders?.find(o => o.id === orderId);
  return <div className="space-y-6">
    <h1 className="text-2xl font-semibold text-poet-gold-bright">Рассадка · Scena Kocjana</h1>
    <p className="text-sm text-zinc-400">184 основных места. 20 боковых закрыты. Включение сначала даёт приоритет уже оплатившим; новую продажу можно открыть ниже.</p>
    <form className="flex flex-wrap gap-3"><select aria-label="Событие" name="event" defaultValue={eventId ?? ""} className="max-w-full rounded border border-zinc-700 bg-zinc-950 p-3 text-white"><option value="">Выберите событие</option>{events?.map(e => <option key={e.id} value={e.id}>{e.title} · {formatPlDateTime(e.starts_at)}</option>)}</select><button className="btn-poet px-4">Показать</button></form>
    {event && !map && <SeatingAdminForm action={enableSeating} className="space-y-3"><p className="text-zinc-300">{event.venue}</p><input type="hidden" name="eventId" value={event.id} /><button className="btn-poet px-4 py-3">Подключить Scena Kocjana к этому событию</button></SeatingAdminForm>}
    {event && map && <>
      <SeatingAdminForm action={changeSeatingMode} className="flex flex-wrap items-center gap-4"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="mode" value={map.mode === "priority" ? "open" : "priority"} /><p className="text-zinc-300">{map.mode === "priority" ? "Приоритет уже оплатившим. Новая продажа приостановлена." : "Выбор мест открыт для новых покупок."}</p><button className="btn-poet px-4 py-2">{map.mode === "priority" ? "Открыть новую продажу" : "Вернуть приоритет оплатившим"}</button></SeatingAdminForm>
      <p className="text-zinc-400">Без мест: {orders?.filter(o => o.tickets.some(t => !t.seat_id)).length ?? 0} заказов. Неопределённые места оплаченных заказов учитываются в остатке билетов.</p>
      {chosen && chosen.tickets.some(t => !t.seat_id) && <div className="rounded-xl border border-poet-gold/25 p-4"><h2 className="mb-4 text-zinc-200">Назначить места: {chosen.buyer_name} · {chosen.quantity} бил.</h2><PaidSeatSelection key={chosen.id} map={map} quantity={chosen.quantity} locale="ru" orderId={chosen.id} /></div>}
      <div className="space-y-3">{await Promise.all((orders ?? []).map(async o => {
        const unassigned = o.tickets.some(t => !t.seat_id);
        const locale = o.locale === "ru" || o.locale === "uk" ? o.locale : "pl";
        const url = unassigned ? await seatingLink(o.id, locale) : null;
        return <div key={o.id} className="space-y-2 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300">
          <p>{o.buyer_name} · {o.email} · {o.phone} · {o.quantity} бил.</p>
          <p>{unassigned ? "Места не выбраны" : o.tickets.map(t => t.seat_id).join(", ")}</p>
          {o.seating_attention && <p className="text-amber-300">Оплата получена без закреплённых мест — связаться с покупателем; при нехватке мест оформить возврат.</p>}
          {url && <div className="flex flex-wrap items-center gap-4">
            <CopyTextButton text={url} label="Копировать ссылку выбора" copiedLabel="Скопировано" />
            <Link className="text-poet-gold underline" href={`/admin/seating?event=${event.id}&order=${o.id}`}>Назначить вручную</Link>
            <SeatingAdminForm action={inviteToChooseSeats}><input type="hidden" name="orderId" value={o.id} /><button className="text-poet-gold underline">{o.seating_invited_at ? "Отправить приглашение повторно" : "Отправить приглашение на email"}</button></SeatingAdminForm>
            {o.seating_invited_at && <span className="text-zinc-500">Отправлено {formatPlDateTime(o.seating_invited_at)}</span>}
          </div>}
        </div>;
      }))}</div>
      <details className="rounded border border-zinc-700 p-4 text-zinc-300"><summary>Закрыть или открыть отдельное место</summary><SeatingAdminForm action={blockSeat} className="mt-3 flex flex-wrap gap-3"><input type="hidden" name="eventId" value={event.id} /><select name="seatId" aria-label="Место" className="bg-zinc-950 p-2">{map.seats.filter(s => !/1[abcd]$/.test(s.id)).map(s => <option key={s.id} value={s.id}>{s.id} · {s.status}</option>)}</select><select name="blocked" aria-label="Действие" className="bg-zinc-950 p-2"><option value="true">Закрыть</option><option value="false">Открыть</option></select><button className="btn-poet px-4">Сохранить</button></SeatingAdminForm></details>
    </>}
  </div>;
}
