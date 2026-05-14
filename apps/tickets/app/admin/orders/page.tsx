import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { formatPlnFromGrosze, formatPlDateTime } from "@/lib/format";

type Search = { event?: string };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const eventFilter = typeof sp.event === "string" ? sp.event : undefined;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }
  const { data: events } = await supabase
    .from("events")
    .select("id,title,slug")
    .order("starts_at", { ascending: false });

  let query = supabase
    .from("orders")
    .select(
      "id,created_at,buyer_name,email,phone,quantity,status,amount_grosze,marketing_email_opt_in,event_id,events(id,title,slug),tickets(id,ticket_number,used_at)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (eventFilter) {
    query = query.eq("event_id", eventFilter);
  }

  const { data: orders, error } = await query;

  if (error) {
    return <p className="text-red-400">Ошибка: {error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-50">Заказы</h1>
          <p className="text-sm text-zinc-500">Статусы, билеты, check-in.</p>
        </div>
        {eventFilter ? (
          <Link
            href={`/api/admin/export?eventId=${encodeURIComponent(eventFilter)}`}
            className="rounded-full border border-poet-gold/25 px-4 py-2 text-sm text-white hover:border-poet-gold/50"
          >
            Экспорт CSV
          </Link>
        ) : (
          <span className="text-xs text-zinc-500">Выберите событие для экспорта</span>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="text-zinc-400">
          Событие
          <select
            name="event"
            defaultValue={eventFilter ?? ""}
            className="rounded-full border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          >
            <option value="">Все</option>
            {(events ?? []).map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full border border-poet-gold/25 px-4 py-2 text-sm text-white hover:border-poet-gold/50"
        >
          Применить
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-poet-gold/15">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-3">Создан</th>
              <th className="px-3 py-3">Событие</th>
              <th className="px-3 py-3">Покупатель</th>
              <th className="px-3 py-3">Рассылка</th>
              <th className="px-3 py-3">Сумма</th>
              <th className="px-3 py-3">Статус</th>
              <th className="px-3 py-3">Билеты / вход</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-poet-gold/10">
            {(orders ?? []).map((o) => {
              const rawEv = o.events as unknown;
              const ev = (Array.isArray(rawEv) ? rawEv[0] : rawEv) as
                | { title: string; slug: string; id: string }
                | null
                | undefined;
              const tickets = (o.tickets ?? []) as {
                id: string;
                ticket_number: string;
                used_at: string | null;
              }[];
              const used = tickets.filter((t) => t.used_at).length;
              return (
                <tr key={o.id} className="bg-zinc-950/40 align-top">
                  <td className="px-3 py-3 text-zinc-400 whitespace-nowrap">
                    {formatPlDateTime(o.created_at)}
                  </td>
                  <td className="px-3 py-3 text-white">{ev?.title ?? "—"}</td>
                  <td className="px-3 py-3 text-zinc-300">
                    <div>{o.buyer_name}</div>
                    <div className="text-xs text-zinc-500">{o.email}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-400 whitespace-nowrap">
                    {(o as { marketing_email_opt_in?: boolean }).marketing_email_opt_in ? "да" : "—"}
                  </td>
                  <td className="px-3 py-3 text-zinc-300 whitespace-nowrap">
                    {formatPlnFromGrosze(o.amount_grosze)} ×{o.quantity}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        o.status === "paid"
                          ? "text-poet-gold-bright"
                          : o.status === "pending"
                            ? "text-amber-300"
                            : "text-zinc-500"
                      }
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-400">
                    {tickets.length ? (
                      <div className="space-y-1">
                        <div>
                          check-in: {used}/{tickets.length}
                        </div>
                        <ul className="font-mono text-[11px] text-zinc-500">
                          {tickets.map((t) => (
                            <li key={t.id}>
                              {t.ticket_number} {t.used_at ? "✓" : "—"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
