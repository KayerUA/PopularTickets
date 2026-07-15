import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { DateTime } from "luxon";
import { ambassadorProfileByHash, resolveAmbassadorProfile } from "@/lib/ambassadors";
import { normalizePromoCode } from "@/lib/promoCodes";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { formatPlnFromGrosze } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";
import { AmbassadorCopyButton } from "@/components/AmbassadorCopyButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }): Promise<Metadata> {
  const { hash } = await params;
  const profile = ambassadorProfileByHash(hash);
  return {
    title: profile ? `${profile.name} — кабинет амбассадора` : "Кабинет амбассадора",
    description: "Персональная статистика амбассадора PopularTickets.",
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noarchive: true } },
  };
}

type PromoRow = {
  id: string;
  code: string;
  event_id: string | null;
  ambassador_hash?: string | null;
  discount_fixed_grosze?: number | null;
  discount_percent?: number | null;
  commission_grosze?: number | null;
  marketing_materials_url?: string | null;
};

type PaidOrderRow = {
  quantity: number;
  amount_grosze: number;
  promo_discount_grosze: number;
  ambassador_commission_grosze?: number | null;
};

export default async function AmbassadorPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; hash: string }>;
}) {
  const { locale, hash } = await params;
  if (locale !== "ru") permanentRedirect(`/ru/ambassador/${encodeURIComponent(hash)}`);

  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Кабинет временно недоступен");

  const profile = await resolveAmbassadorProfile(supabase, hash);
  if (!profile) notFound();

  const code = normalizePromoCode(profile.promoCode);
  const extendedPromo = await supabase
    .from("promo_codes")
    .select("id,code,event_id,ambassador_hash,discount_percent,discount_fixed_grosze,commission_grosze,marketing_materials_url")
    .eq("code", code)
    .maybeSingle();

  let promo = extendedPromo.data as PromoRow | null;
  if (extendedPromo.error?.code === "42703" || extendedPromo.error?.code === "PGRST204") {
    const legacyPromo = await supabase
      .from("promo_codes")
      .select("id,code,event_id")
      .eq("code", code)
      .maybeSingle();
    promo = legacyPromo.data as PromoRow | null;
  }

  const eventQuery = supabase
    .from("events")
    .select("id,slug,title,starts_at,listing_kind")
    .limit(1);
  const { data: event } = profile.showSlug
    ? await eventQuery.eq("slug", profile.showSlug).maybeSingle()
    : promo?.event_id
      ? await eventQuery.eq("id", promo.event_id).maybeSingle()
      : { data: null };

  let paidOrders: PaidOrderRow[] = [];
  let visits = 0;
  if (promo?.id) {
    const [extendedOrders, visitResult] = await Promise.all([
      supabase
        .from("orders")
        .select("quantity,amount_grosze,promo_discount_grosze,ambassador_commission_grosze")
        .eq("promo_code_id", promo.id)
        .eq("status", "paid"),
      supabase
        .from("promo_code_visits")
        .select("id", { count: "exact", head: true })
        .eq("promo_code_id", promo.id),
    ]);
    visits = visitResult.count ?? 0;
    if (extendedOrders.error?.code === "42703" || extendedOrders.error?.code === "PGRST204") {
      const legacyOrders = await supabase
        .from("orders")
        .select("quantity,amount_grosze,promo_discount_grosze")
        .eq("promo_code_id", promo.id)
        .eq("status", "paid");
      paidOrders = (legacyOrders.data ?? []) as PaidOrderRow[];
    } else {
      paidOrders = (extendedOrders.data ?? []) as PaidOrderRow[];
    }
  }

  const ticketsSold = paidOrders.reduce((sum, order) => sum + order.quantity, 0);
  const paidRevenueGrosze = paidOrders.reduce((sum, order) => sum + order.amount_grosze, 0);
  const buyerSavingsGrosze = paidOrders.reduce((sum, order) => sum + order.promo_discount_grosze, 0);
  const commissionPerTicketGrosze = promo?.commission_grosze ?? profile.commissionPerTicketGrosze;
  const storedCommissionGrosze = paidOrders.reduce(
    (sum, order) => sum + (order.ambassador_commission_grosze ?? 0),
    0,
  );
  const totalCommissionGrosze = storedCommissionGrosze || ticketsSold * commissionPerTicketGrosze;
  const discountFixedGrosze = promo?.discount_fixed_grosze ?? profile.discountFixedGrosze;
  const discountPercent = promo?.discount_percent ?? profile.discountPercent ?? null;
  const buyerDiscountLabel = discountFixedGrosze > 0
    ? formatPlnFromGrosze(discountFixedGrosze)
    : `${discountPercent ?? 0}%`;
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  const eventPath = event
    ? `/ru/${event.listing_kind === "special" ? "special" : "events"}/${event.slug}`
    : "/ru";
  const referralUrl = `${base}${eventPath}?promo=${encodeURIComponent(profile.promoCode)}`;
  const materialsUrl = promo?.marketing_materials_url || profile.marketingMaterialsUrl;
  const eventDate = event?.starts_at
    ? DateTime.fromISO(event.starts_at, { setZone: true }).setZone("Europe/Warsaw")
    : null;
  const payoutDate = eventDate?.plus({ days: 1 }).setLocale("ru").toFormat("dd.LL.yyyy") ?? null;

  return (
    <div className="poet-safe-x mx-auto w-full max-w-3xl py-8 sm:py-14">
      <header className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300">P!MPRO × Next Mode</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Привет, {profile.name}!
        </h1>
        <p className="mt-2 text-sm text-zinc-400">Персональный кабинет амбассадора</p>
      </header>

      <section className="mt-7 overflow-hidden rounded-3xl border border-violet-400/30 bg-[#09060f] shadow-[0_24px_70px_-42px_rgba(192,132,252,0.95)]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(217,70,239,0.2),transparent_38%)] p-5 text-center sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Твой промокод</p>
          <p className="mt-3 break-all font-mono text-3xl font-bold tracking-[0.12em] text-fuchsia-300 sm:text-4xl">
            {profile.promoCode}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            Покупатель экономит <strong className="text-white">{buyerDiscountLabel}</strong> с каждого билета.
            Ты получаешь <strong className="text-white">{formatPlnFromGrosze(commissionPerTicketGrosze)}</strong> за каждый оплаченный билет.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <AmbassadorCopyButton value={profile.promoCode} label="Скопировать код" />
            <AmbassadorCopyButton value={referralUrl} label="Скопировать ссылку" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          {[
            [String(ticketsSold), "Билетов продано"],
            [formatPlnFromGrosze(totalCommissionGrosze), "Твоя комиссия"],
            [String(visits), "Переходов"],
            [formatPlnFromGrosze(buyerSavingsGrosze), "Сэкономили зрители"],
          ].map(([value, label]) => (
            <div key={label} className="bg-[#0b0811] px-3 py-5 text-center sm:px-4">
              <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-poet-gold/15 bg-poet-surface/25 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-poet-gold/70">Твоя ссылка</p>
          <a href={referralUrl} className="mt-3 block break-all text-sm leading-relaxed text-poet-gold-bright underline decoration-poet-gold/35 underline-offset-4">
            {referralUrl}
          </a>
          {event ? <p className="mt-3 text-xs text-zinc-500">Событие: {event.title}</p> : null}
        </section>

        <section className="rounded-2xl border border-poet-gold/15 bg-poet-surface/25 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-poet-gold/70">Материалы</p>
          {materialsUrl ? (
            <a
              href={materialsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-poet-gold/25 bg-poet-gold/5 px-4 py-2.5 text-sm font-semibold text-poet-gold-bright transition hover:border-poet-gold/55 hover:bg-poet-gold/10"
            >
              Фото, видео и тексты ↗
            </a>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">Маркетинговые материалы скоро появятся здесь.</p>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/5 px-4 py-4 text-center sm:px-5">
        <p className="text-sm text-emerald-100">
          {payoutDate ? `Выплата — после сверки оплаченных билетов, ориентировочно ${payoutDate}.` : "Выплата — после сверки оплаченных билетов."}
        </p>
        <p className="mt-1.5 text-xs text-zinc-500">
          В статистике учитываются только оплаченные заказы. Выручка по коду: {formatPlnFromGrosze(paidRevenueGrosze)}.
        </p>
      </section>
    </div>
  );
}
