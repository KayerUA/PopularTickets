import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { PromoCodeForm } from "@/components/PromoCodeForm";
import { formatPlDateTime, formatPlnFromGrosze } from "@/lib/format";

type PromoRow = {
  id: string; code: string; partner_name: string; discount_percent: number; scope: string; event_id: string | null;
  landing_event_id: string | null; is_active: boolean; max_redemptions: number | null; starts_at: string | null; ends_at: string | null;
};

export default async function PromoCodesPage() {
  const supabase = getServiceSupabase();
  if (!supabase) return <SupabaseSetupHint variant="setup" />;
  const [{ data: events, error: eventsError }, { data: promos, error: promosError }, { data: orders, error: ordersError }, { data: visits, error: visitsError }] = await Promise.all([
    supabase.from("events").select("id,title,slug,listing_kind").order("starts_at", { ascending: false }),
    supabase.from("promo_codes").select("id,code,partner_name,discount_percent,scope,event_id,landing_event_id,is_active,max_redemptions,starts_at,ends_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("promo_code_id,status,amount_grosze,promo_discount_grosze").not("promo_code_id", "is", null),
    supabase.from("promo_code_visits").select("promo_code_id"),
  ]);
  const error = eventsError ?? promosError ?? ordersError ?? visitsError;
  if (error) return <p className="text-red-400">{error.message} — выполните <code>supabase/add-promo-codes.sql</code> и обновите schema cache.</p>;

  const eventById = new Map((events ?? []).map((event) => [event.id as string, event]));
  const stats = new Map<string, { visits: number; paidOrders: number; paidRevenue: number; discount: number }>();
  for (const visit of visits ?? []) {
    const id = visit.promo_code_id as string;
    const s = stats.get(id) ?? { visits: 0, paidOrders: 0, paidRevenue: 0, discount: 0 };
    s.visits += 1; stats.set(id, s);
  }
  for (const order of orders ?? []) {
    const id = order.promo_code_id as string;
    const s = stats.get(id) ?? { visits: 0, paidOrders: 0, paidRevenue: 0, discount: 0 };
    if (order.status === "paid") {
      s.paidOrders += 1;
      s.paidRevenue += order.amount_grosze as number;
      s.discount += (order as { promo_discount_grosze?: number }).promo_discount_grosze ?? 0;
    }
    stats.set(id, s);
  }

  return <div className="space-y-8">
    <div><h1 className="font-display text-2xl font-semibold text-zinc-50">Промокоды партнёров</h1><p className="mt-1 text-sm text-zinc-500">Ссылки, применения и оплаченные заказы.</p></div>
    <PromoCodeForm events={(events ?? []).map((event) => ({ id: event.id as string, title: event.title as string, slug: event.slug as string, listingKind: event.listing_kind as string }))} />
    <div className="overflow-x-auto rounded-2xl border border-poet-gold/15"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500"><tr><th className="px-3 py-3">Код / партнёр</th><th className="px-3 py-3">Правило</th><th className="px-3 py-3">Ссылка</th><th className="px-3 py-3">Переходы</th><th className="px-3 py-3">Оплаты</th><th className="px-3 py-3">Выручка</th><th className="px-3 py-3">Период</th></tr></thead><tbody className="divide-y divide-poet-gold/10">{(promos as PromoRow[] ?? []).map((promo) => {
      const s = stats.get(promo.id) ?? { visits: 0, paidOrders: 0, paidRevenue: 0, discount: 0 };
      const landing = promo.landing_event_id ? eventById.get(promo.landing_event_id) as { slug: string; listing_kind: string } | undefined : undefined;
      const href = landing ? `${landing.listing_kind === "special" ? "/ru/special/" : "/ru/events/"}${landing.slug}?promo=${encodeURIComponent(promo.code)}` : null;
      return <tr key={promo.id} className="bg-zinc-950/40 align-top"><td className="px-3 py-3"><code className="font-semibold text-poet-gold-bright">{promo.code}</code><div className="mt-1 text-xs text-zinc-500">{promo.partner_name}</div></td><td className="px-3 py-3 text-zinc-300">−{promo.discount_percent}% · {promo.scope === "all" ? "все" : promo.scope === "special" ? "special" : "одно событие"}{promo.max_redemptions ? <div className="text-xs text-zinc-500">лимит: {promo.max_redemptions}</div> : null}</td><td className="px-3 py-3 text-xs">{href ? <a className="break-all text-poet-gold underline" href={href}>{href}</a> : <span className="text-zinc-600">Выберите событие для ссылки</span>}</td><td className="px-3 py-3 text-zinc-300">{s.visits}</td><td className="px-3 py-3 text-zinc-300">{s.paidOrders}</td><td className="px-3 py-3 text-zinc-300">{formatPlnFromGrosze(s.paidRevenue)}<div className="text-xs text-zinc-500">скидки {formatPlnFromGrosze(s.discount)}</div></td><td className="px-3 py-3 text-xs text-zinc-500">{promo.starts_at ? `с ${formatPlDateTime(promo.starts_at)}` : "сразу"}<br />{promo.ends_at ? `до ${formatPlDateTime(promo.ends_at)}` : "без конца"}</td></tr>;
    })}</tbody></table></div>
  </div>;
}
