import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
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
import { buildPublicPageMetadata, truncateMetaDescription } from "@/lib/seo";
import { resolveApplicablePromoCode } from "@/lib/promoCodes";
import { PromoVisitTracker } from "@/components/PromoVisitTracker";
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { eventCoverObjectPosition } from "@/lib/eventCoverFocal";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import { resolveEventCopy } from "@/lib/contentI18n";
import { resolveEventMapsUrl } from "@/lib/mapsUrl";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { resolveAbsoluteAssetUrl } from "@/lib/safePublicUrl";

export const dynamic = "force-dynamic";

const LEGACY_NEXT_MODE_SLUG = "popular-impro-next-mode-2026-08-15";
const NEXT_MODE_SLUG = "next-mode-2026-08-15";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = getServiceSupabase();
  const { data: event } = supabase ? await fetchPublishedEventBySlug(supabase, slug) : { data: null };
  const copy = event ? resolveEventCopy(event, locale) : null;
  const isNextModeEvent = slug === NEXT_MODE_SLUG;
  const title = isNextModeEvent ? "Next Mode Comedy — P!MPRO × Next Mode" : (copy?.title ?? event?.title ?? "Билеты");
  const description = isNextModeEvent
    ? "Интерактивное комедийное шоу P!MPRO × Next Mode в Варшаве: зрители выбирают задания для актёров прямо с телефона."
    : truncateMetaDescription(copy?.description);
  const ogImage = resolveAbsoluteAssetUrl(event?.image_url, getPublicAppUrl());
  return buildPublicPageMetadata({
    locale,
    path: `/special/${slug}`,
    title,
    description: description || title,
    keywords: isNextModeEvent ? ["Next Mode Comedy", "P!MPRO", "импровизация", "комедийное шоу", "Варшава"] : undefined,
    ogType: "article",
    ogImages: ogImage ? [{ url: ogImage, alt: title }] : undefined,
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
  if (slug === LEGACY_NEXT_MODE_SLUG) {
    permanentRedirect(`/${locale}/special/${NEXT_MODE_SLUG}${promoRaw ? `?promo=${encodeURIComponent(promoRaw)}` : ""}`);
  }
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
    price_grosze: event.regular_price_grosze,
    day_of_event_price_grosze: event.day_of_event_price_grosze,
    listing_kind: event.listing_kind,
    discount_periods: event.discount_periods,
  });
  const t = await getTranslations({ locale, namespace: "CheckoutForm" });
  const isOpen = status !== "past" && remaining > 0;
  const language = eventLanguageLabel(normalizeEventLanguage(event.event_language), locale);
  const promo = await resolveApplicablePromoCode(supabase, promoRaw, { id: event.id, listingKind: event.listing_kind });
  const copy = resolveEventCopy(event, locale);
  const mapsHref = resolveEventMapsUrl({
    maps_url: event.maps_url,
    description: copy?.description ?? event.description,
    venue: event.venue,
    listing_kind: "special",
  });
  const collaboration = slug === NEXT_MODE_SLUG
    ? { name: "P!MPRO × Next Mode", tagline: "зрители берут управление" }
    : null;

  return (
    <div className="poet-safe-x relative mx-auto w-full max-w-3xl py-8 sm:py-14">
      <section className="overflow-hidden rounded-2xl border border-poet-gold/25 bg-poet-surface/60 shadow-gold backdrop-blur-md sm:rounded-3xl">
        {promo ? <PromoVisitTracker promoCodeId={promo.id} eventId={event.id} /> : null}
          <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950 sm:aspect-[16/10]">
          {event.image_url ? (
            <MediaCoverBlurred
              src={event.image_url}
              alt=""
              priority
              sizes="(max-width:768px) 100vw, 896px"
              unoptimized={!isOptimizableEventImage(event.image_url)}
              coverObjectPosition={eventCoverObjectPosition(event.image_focal_x, event.image_focal_y)}
              frameClassName="absolute inset-0"
            />
          ) : <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-800/50 via-poet-bg to-cyan-950/50" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-poet-bg via-poet-bg/10 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] sm:left-6 sm:top-6">
            <span className="rounded-full border border-fuchsia-200/40 bg-zinc-950/75 px-3 py-1.5 text-fuchsia-100 backdrop-blur">Next Mode</span>
            <span className="text-cyan-200">×</span>
            <a href="https://www.popularpoet.pl/ru" target="_blank" rel="noopener noreferrer" className="rounded-full border border-cyan-100/30 bg-zinc-950/75 px-3 py-1.5 text-cyan-100 backdrop-blur hover:text-white">Popular Poet</a>
          </div>
        </div>
        <div className="space-y-5 p-4 sm:p-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{copy?.title ?? event.title}</h1>
            {collaboration ? (
              <p className="mt-3 text-sm font-semibold leading-snug sm:text-base">
                <span className="text-cyan-100">{collaboration.name}</span>
                <span className="text-zinc-400"> · </span>
                <span className="text-fuchsia-200">{collaboration.tagline}</span>
              </p>
            ) : null}
            <p className="mt-3 text-sm text-zinc-300 sm:text-base">{formatEventDateTime(event.starts_at, locale)} · {language}</p>
            <p className="mt-1 text-sm text-zinc-400 sm:text-base">{event.venue}</p>
            {mapsHref ? <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold">Открыть карту ↗</a> : null}
          </div>

          {copy?.description.trim() ? (
            <details className="group rounded-2xl border border-zinc-700/60 bg-black/20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-semibold text-zinc-100 marker:hidden hover:text-fuchsia-100 sm:px-5">
                Что будет на шоу?
                <span aria-hidden="true" className="text-lg leading-none text-fuchsia-200 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="whitespace-pre-wrap border-t border-zinc-700/60 px-4 py-4 text-[0.9375rem] leading-relaxed text-zinc-300 sm:px-5 sm:text-base">{copy.description}</p>
            </details>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-fuchsia-200/25 bg-zinc-950/60" aria-label="Как работает интерактив">
            <div className="grid sm:grid-cols-[1.15fr_1fr]">
              <div className="border-b border-fuchsia-200/15 px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200">Next Mode inside</p>
                <p className="mt-2 font-display text-xl font-semibold leading-tight text-zinc-50">Ты выбираешь задание.<br />Мы играем его.</p>
              </div>
              <ol className="grid grid-cols-3 divide-x divide-cyan-100/10 text-center text-xs text-zinc-300">
                <li className="px-2 py-4"><span className="block text-lg text-cyan-200">01</span><span className="mt-1 block">открываешь<br />телефон</span></li>
                <li className="px-2 py-4"><span className="block text-lg text-fuchsia-200">02</span><span className="mt-1 block">выбираешь<br />задание</span></li>
                <li className="px-2 py-4"><span className="block text-lg text-cyan-200">03</span><span className="mt-1 block">смотришь,<br />что будет</span></li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-cyan-100/10 px-4 py-3 text-xs sm:px-5">
              <a href="https://www.instagram.com/next.mode.show/" target="_blank" rel="noopener noreferrer" className="text-fuchsia-200 underline decoration-fuchsia-200/40 underline-offset-2 hover:text-white">@next.mode.show ↗</a>
              <a href="https://www.instagram.com/popular_poet_theatre/" target="_blank" rel="noopener noreferrer" className="text-cyan-100 underline decoration-cyan-100/40 underline-offset-2 hover:text-white">@popular_poet_theatre ↗</a>
            </div>
          </section>

          <div className="rounded-2xl border border-fuchsia-200/25 bg-black/30 px-4 py-3.5">
          {price.activeDiscount ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs text-zinc-400">Базовая цена</p>
                  <span className="mt-1 block text-lg text-zinc-500 line-through">{formatPlnFromGrosze(price.regularPriceGrosze)}</span>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-200">Финальная цена · −{price.activeDiscount.percent}%</p>
                  <span className="mt-1 block text-3xl font-semibold text-fuchsia-100">{formatPlnFromGrosze(price.effectivePriceGrosze)}</span>
                </div>
              </div>
              <SpecialDiscountCountdown name={price.activeDiscount.name} expiresAt={price.activeDiscount.expiresAt} />
            </>
          ) : (
            <><p className="text-xs text-zinc-400">Цена билета</p><span className="mt-1 block text-3xl font-semibold text-fuchsia-100">{formatPlnFromGrosze(price.effectivePriceGrosze)}</span></>
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
              phoneRequired
              initialPromoCode={promo?.code}
              initialPromoDiscountPercent={promo?.discountPercent}
            />
          ) : <p className="rounded-xl border border-poet-gold/20 bg-black/25 px-4 py-3 text-sm text-zinc-300">{status === "past" ? "Продажа билетов завершена." : "Билеты закончились."}</p>}
          {isOpen ? <p className="text-center text-[11px] text-zinc-500">{t("taxExemptionNote")}</p> : null}
        </div>
      </section>
    </div>
  );
}
