import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { formatPlDateTime } from "@/lib/format";

export default async function AdminHome() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }
  const { data: events, error } = await supabase
    .from("events")
    .select("id,slug,title,starts_at,is_published,total_tickets")
    .order("starts_at", { ascending: false });

  if (error) {
    return <p className="text-red-400">Ошибка: {error.message}</p>;
  }

  const rows = await Promise.all(
    (events ?? []).map(async (ev) => {
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ev.id);
      return { ...ev, sold: count ?? 0 };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-50">События</h1>
          <p className="text-sm text-zinc-500">Публикация, остатки, заказы.</p>
        </div>
        <Link
          href="/admin/events/new"
          className="btn-poet poet-shine px-5 py-2 text-sm"
        >
          Создать
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-poet-gold/15">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Билеты</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-poet-gold/10">
            {rows.map((ev) => (
              <tr key={ev.id} className="bg-zinc-950/40">
                <td className="px-4 py-3 text-white">{ev.title}</td>
                <td className="px-4 py-3 text-zinc-400">{formatPlDateTime(ev.starts_at)}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {ev.sold}/{ev.total_tickets}
                </td>
                <td className="px-4 py-3">
                  {ev.is_published ? (
                    <span className="text-poet-gold-bright">опубликовано</span>
                  ) : (
                    <span className="text-zinc-500">черновик</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/events/${ev.id}/edit`} className="text-poet-gold hover:text-poet-gold-bright">
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
