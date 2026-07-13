import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { fetchPublishedEventBySlug } from "@/lib/supabase/fetchPublishedEventBySlug";
import { normalizeEventListingKind, resolveEventMarketingStatus } from "@/lib/eventMarketingStatus";
import { eventPriceDetails } from "@/lib/eventPrice";
import { formatEventDateTime, formatPlnFromGrosze } from "@/lib/format";
import { eventLanguageLabel, normalizeEventLanguage } from "@/lib/eventLanguage";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { SpecialDiscountCountdown } from "@/components/SpecialDiscountCountdown";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { buildPublicPageMetadata } from "@/lib/seo";
import { resolveApplicablePromoCode } from "@/lib/promoCodes";
import { PromoVisitTracker } from "@/components/PromoVisitTracker";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = getServiceSupabase();
  const { data: event } = supabase ? await fetchPublishedEventBySlug(supabase, slug) : { data: null };
  const title = event?.title ?? "Билеты";
  return buildPublicPageMetadata({
    locale,
    path: `/special/${slug}`,
    title,
    description: title,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  });
}

export default async function SpecialEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
  searchParams: Promise<{ promo?: string }>;
}) {
  const { locale, slug } = await params;
  const { promo: promoRaw } = await searchParams;
  const supabase = getServiceSupabase();
  if (!supabase) notFound();
  const { data: event } = await fetchPublishedEventBySlug(supabase, slug);
  if (!event || normalizeEventListingKind(event.listing_kind) !== "special") notFound();

  const { count: sold } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);
  const remaining = event.total_tickets - (sold ?? 0);
  const status = resolveEventMarketingStatus({
    startsAt: event.starts_at,
    remaining,
    totalTickets: event.total_tickets,
  });
  const price = eventPriceDetails({
    starts_at: event.starts_at,
    price_grosze: event.price_grosze,
    day_of_event_price_grosze: event.day_of_event_price_grosze,
    listing_kind: event.listing_kind,
    discount_periods: event.discount_periods,
  });
  const t = await getTranslations({ locale, namespace: "CheckoutForm" });
  const isOpen = status !== "past" && remaining > 0;
  const language = eventLanguageLabel(normalizeEventLanguage(event.event_language), locale);
  const promo = await resolveApplicablePromoCode(supabase, promoRaw, { id: event.id, listingKind: event.listing_kind });

  return (
    <main className="poet-safe-x relative mx-auto flex min-h-dvh w-full max-w-xl items-start py-7 sm:items-center sm:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-8 h-56 w-56 rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="absolute -right-16 bottom-8 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>
      <section className="w-full rounded-3xl border border-fuchsia-300/35 bg-[#140b22]/85 p-5 shadow-[0_0_60px_rgba(192,38,211,0.16)] backdrop-blur-md sm:p-8">
        {promo ? <PromoVisitTracker promoCodeId={promo.id} eventId={event.id} /> : null}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
          <a href="https://www.instagram.com/next.mode.show/" className="text-fuchsia-200 hover:text-white">Next Mode</a>
          <span className="text-cyan-200">×</span>
          <a href="https://www.instagram.com/popular_poet_theatre/" className="text-cyan-100 hover:text-white">Popular Poet</a>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{event.title}</h1>
        <p className="mt-3 text-sm text-zinc-300">
          {formatEventDateTime(event.starts_at, locale)} · {event.venue} · {language}
        </p>

        <div className="mt-5 rounded-2xl border border-fuchsia-200/25 bg-black/30 px-4 py-3.5">
          {price.activeDiscount ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-200">−{price.activeDiscount.percent}%</p>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="text-3xl font-semibold text-fuchsia-100">{formatPlnFromGrosze(price.effectivePriceGrosze)}</span>
                <span className="text-base text-zinc-500 line-through">{formatPlnFromGrosze(price.regularPriceGrosze)}</span>
              </div>
              <SpecialDiscountCountdown name={price.activeDiscount.name} expiresAt={price.activeDiscount.expiresAt} />
            </>
          ) : (
            <span className="text-3xl font-semibold text-fuchsia-100">{formatPlnFromGrosze(price.effectivePriceGrosze)}</span>
          )}
        </div>

        {isOpen ? (
          <EventCheckoutForm
            eventSlug={event.slug}
            remaining={remaining}
            locale={locale}
            unitPriceGrosze={price.effectivePriceGrosze}
            bypassPayment={isCheckoutBypassPayment()}
            compact
            initialPromoCode={promo?.code}
            initialPromoDiscountPercent={promo?.discountPercent}
          />
        ) : (
          <p className="mt-6 rounded-xl border border-poet-gold/20 bg-black/25 px-4 py-3 text-sm text-zinc-300">
            {status === "past" ? "Продажа билетов завершена." : "Билеты закончились."}
          </p>
        )}
        {isOpen ? <p className="mt-3 text-center text-[11px] text-zinc-500">{t("taxExemptionNote")}</p> : null}
      </section>
    </main>
  );
}
