import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { DateTime } from "luxon";
import { formatEventDateTime, formatPlnFromGrosze } from "@/lib/format";
import { getServiceSupabase } from "@/lib/supabase/admin";
import type { AppLocale } from "@/i18n/routing";

const NEXT_MODE_SLUG = "next-mode-2026-08-15";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Статистика Next Mode",
  description: "Актуальная статистика продажи билетов Next Mode.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noarchive: true, noimageindex: true },
  },
};

type PaidOrderRow = {
  quantity: number;
  amount_grosze: number;
  promo_code: string | null;
};

type PromoStat = {
  code: string | null;
  orders: number;
  tickets: number;
  revenueGrosze: number;
};

function updatedAtLabel(): string {
  return DateTime.now()
    .setZone("Europe/Warsaw")
    .setLocale("ru")
    .toFormat("dd.LL.yyyy, HH:mm:ss");
}

export default async function NextModeStatsPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (slug !== NEXT_MODE_SLUG) notFound();
  if (locale !== "ru") permanentRedirect(`/ru/special/${NEXT_MODE_SLUG}/stats`);

  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Статистика временно недоступна");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,slug,title,starts_at,venue,total_tickets")
    .eq("slug", NEXT_MODE_SLUG)
    .maybeSingle();
  if (eventError || !event) notFound();

  const [{ count: issuedTickets, error: ticketsError }, { data: orders, error: ordersError }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),
    supabase
      .from("orders")
      .select("quantity,amount_grosze,promo_code")
      .eq("event_id", event.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false }),
  ]);
  if (ticketsError || ordersError) throw new Error("Не удалось загрузить статистику продаж");

  const paidOrders = (orders ?? []) as PaidOrderRow[];
  const sold = issuedTickets ?? 0;
  const capacity = Number(event.total_tickets);
  const remaining = Math.max(0, capacity - sold);
  const paidRevenueGrosze = paidOrders.reduce((sum, order) => sum + order.amount_grosze, 0);
  const orderedTickets = paidOrders.reduce((sum, order) => sum + order.quantity, 0);
  const soldPercent = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;

  const promoStats = new Map<string, PromoStat>();
  for (const order of paidOrders) {
    const normalizedCode = order.promo_code?.trim().toUpperCase() || null;
    const key = normalizedCode ?? "__WITHOUT_PROMO__";
    const current = promoStats.get(key) ?? {
      code: normalizedCode,
      orders: 0,
      tickets: 0,
      revenueGrosze: 0,
    };
    current.orders += 1;
    current.tickets += order.quantity;
    current.revenueGrosze += order.amount_grosze;
    promoStats.set(key, current);
  }

  const breakdown = [...promoStats.values()].sort((a, b) => {
    if (a.code === null) return 1;
    if (b.code === null) return -1;
    return b.tickets - a.tickets || a.code.localeCompare(b.code);
  });

  return (
    <main className="poet-safe-x mx-auto w-full max-w-4xl py-8 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">
            Закрытая статистика · Next Mode
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Продажа билетов
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {formatEventDateTime(event.starts_at as string, "ru")} · {event.venue}
          </p>
        </div>
        <a
          href={`/ru/special/${NEXT_MODE_SLUG}/stats`}
          className="inline-flex min-h-11 items-center rounded-xl border border-violet-300/25 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:border-violet-300/60"
        >
          Обновить данные
        </a>
      </header>

      <section className="mt-7 overflow-hidden rounded-3xl border border-violet-400/25 bg-[#09060f] shadow-[0_24px_70px_-42px_rgba(192,132,252,0.95)]">
        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          {[
            [String(sold), "Билетов продано"],
            [String(remaining), "Билетов осталось"],
            [String(capacity), "Вместимость"],
            [String(paidOrders.length), "Оплаченных заказов"],
          ].map(([value, label]) => (
            <div key={label} className="bg-[#0b0811] px-3 py-5 text-center sm:px-4 sm:py-6">
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-zinc-400">Заполнено</span>
            <strong className="text-white">{soldPercent}%</strong>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-poet-gold transition-[width]"
              style={{ width: `${soldPercent}%` }}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-poet-gold/15 bg-zinc-950/35">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Продажи по промокодам</h2>
            <p className="mt-1 text-xs text-zinc-500">Только оплаченные заказы</p>
          </div>
          <p className="text-sm text-zinc-400">Выручка: {formatPlnFromGrosze(paidRevenueGrosze)}</p>
        </div>

        {breakdown.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Промокод</th>
                  <th className="px-4 py-3 text-right">Заказов</th>
                  <th className="px-4 py-3 text-right">Билетов</th>
                  <th className="px-4 py-3 text-right sm:px-5">Выручка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {breakdown.map((row) => (
                  <tr key={row.code ?? "without-promo"}>
                    <td className="px-4 py-4 sm:px-5">
                      {row.code ? (
                        <code className="font-semibold text-violet-200">{row.code}</code>
                      ) : (
                        <span className="text-zinc-400">Без промокода</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-zinc-300">{row.orders}</td>
                    <td className="px-4 py-4 text-right font-semibold text-white">{row.tickets}</td>
                    <td className="px-4 py-4 text-right text-zinc-300 sm:px-5">
                      {formatPlnFromGrosze(row.revenueGrosze)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">Оплаченных заказов пока нет.</p>
        )}
      </section>

      {orderedTickets !== sold ? (
        <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-100/80">
          Техническая сверка: в оплаченных заказах {orderedTickets} билетов, фактически выпущено {sold}.
        </p>
      ) : null}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
        <span>Обновлено: {updatedAtLabel()} (Варшава)</span>
        <span>Страница не индексируется поисковиками</span>
      </footer>
    </main>
  );
}
