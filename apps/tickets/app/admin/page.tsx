import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { formatPlDateTime } from "@/lib/format";
import { deleteEvent } from "@/app/actions/admin-events";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";

type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  visibility?: string;
  total_tickets: number;
  listing_kind?: string;
  sold: number;
  paidOrders: number;
};

function splitEventsByTime(rows: AdminEventRow[]): { upcoming: AdminEventRow[]; past: AdminEventRow[] } {
  const now = Date.now();
  const upcoming: AdminEventRow[] = [];
  const past: AdminEventRow[] = [];

  for (const row of rows) {
    const t = new Date(row.starts_at).getTime();
    if (Number.isNaN(t) || t >= now) upcoming.push(row);
    else past.push(row);
  }

  upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  past.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return { upcoming, past };
}

function AdminEventsTable({ rows, emptyMessage }: { rows: AdminEventRow[]; emptyMessage: string }) {
  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-poet-gold/10 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-poet-gold/15">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-4 py-3">Тип</th>
            <th className="px-4 py-3">Название</th>
            <th className="px-4 py-3">Дата</th>
            <th className="px-4 py-3">Билеты</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-poet-gold/10">
          {rows.map((ev) => {
            const listingKind = ev.listing_kind ?? "performance";
            return (
              <tr key={ev.id} className="bg-zinc-950/40">
                <td className="px-4 py-3 text-zinc-400">
                  {listingKind === "trial" ? "пробный" : "спектакль / шоу"}
                </td>
                <td className="px-4 py-3 text-white">{ev.title}</td>
                <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{formatPlDateTime(ev.starts_at)}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {ev.sold}/{ev.total_tickets}
                </td>
                <td className="px-4 py-3">
                  {ev.visibility === "published" ? (
                    <span className="text-poet-gold-bright">опубликовано</span>
                  ) : ev.visibility === "unlisted" ? (
                    <span className="text-amber-200/90">только ссылка</span>
                  ) : (
                    <span className="text-zinc-500">не активен</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                    <Link href={`/admin/events/${ev.id}/edit`} className="text-poet-gold hover:text-poet-gold-bright">
                      Изменить
                    </Link>
                    <AdminDeleteButton
                      deleteAction={deleteEvent}
                      id={ev.id}
                      title={ev.title}
                      entityLabel="Событие"
                      paidOrders={ev.paidOrders}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminHome() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }
  const { data: events, error } = await supabase
    .from("events")
    .select("id,slug,title,starts_at,visibility,total_tickets,listing_kind")
    .order("starts_at", { ascending: false });

  if (error) {
    return <p className="text-red-400">Ошибка: {error.message}</p>;
  }

  const rows: AdminEventRow[] = await Promise.all(
    (events ?? []).map(async (ev) => {
      const [{ count: sold }, { count: paidOrders }] = await Promise.all([
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", ev.id),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("event_id", ev.id)
          .eq("status", "paid"),
      ]);
      return {
        id: ev.id as string,
        slug: ev.slug as string,
        title: ev.title as string,
        starts_at: ev.starts_at as string,
        visibility: ev.visibility as string | undefined,
        total_tickets: ev.total_tickets as number,
        listing_kind: (ev as { listing_kind?: string }).listing_kind,
        sold: sold ?? 0,
        paidOrders: paidOrders ?? 0,
      };
    }),
  );

  const { upcoming, past } = splitEventsByTime(rows);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-50">События</h1>
          <p className="text-sm text-zinc-500">Публикация, остатки, заказы.</p>
        </div>
        <Link href="/admin/events/new" className="btn-poet poet-shine px-5 py-2 text-sm">
          Создать
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-display text-lg font-semibold text-zinc-100">Будущие</h2>
          <span className="text-xs text-zinc-500">{upcoming.length}</span>
        </div>
        <AdminEventsTable rows={upcoming} emptyMessage="Нет предстоящих событий." />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-display text-lg font-semibold text-zinc-400">Прошедшие</h2>
          <span className="text-xs text-zinc-600">{past.length}</span>
        </div>
        <AdminEventsTable rows={past} emptyMessage="Прошедших событий пока нет." />
      </section>
    </div>
  );
}
