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
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { eventCoverObjectPosition } from "@/lib/eventCoverFocal";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import { resolveEventCopy } from "@/lib/contentI18n";
import { resolveEventMapsUrl } from "@/lib/mapsUrl";

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
  const copy = resolveEventCopy(event, locale);
  const mapsHref = resolveEventMapsUrl({
    maps_url: event.maps_url,
    description: copy?.description ?? event.description,
    venue: event.venue,
    listing_kind: "special",
  });

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
            <a href="https://www.instagram.com/next.mode.show/" className="rounded-full border border-fuchsia-200/40 bg-zinc-950/75 px-3 py-1.5 text-fuchsia-100 backdrop-blur hover:text-white">Next Mode</a>
            <span className="text-cyan-200">×</span>
            <a href="https://www.instagram.com/popular_poet_theatre/" className="rounded-full border border-cyan-100/30 bg-zinc-950/75 px-3 py-1.5 text-cyan-100 backdrop-blur hover:text-white">Popular Poet</a>
          </div>
        </div>
        <div className="space-y-5 p-4 sm:p-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{copy?.title ?? event.title}</h1>
            <p className="mt-3 text-sm text-zinc-300 sm:text-base">{formatEventDateTime(event.starts_at, locale)} · {language}</p>
            <p className="mt-1 text-sm text-zinc-400 sm:text-base">{event.venue}</p>
            {mapsHref ? <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold">Открыть карту ↗</a> : null}
          </div>

          {copy?.description.trim() ? <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-zinc-300 sm:text-base">{copy.description}</p> : null}

          <div className="rounded-2xl border border-fuchsia-200/25 bg-black/30 px-4 py-3.5">
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
          ) : <p className="rounded-xl border border-poet-gold/20 bg-black/25 px-4 py-3 text-sm text-zinc-300">{status === "past" ? "Продажа билетов завершена." : "Билеты закончились."}</p>}
          {isOpen ? <p className="text-center text-[11px] text-zinc-500">{t("taxExemptionNote")}</p> : null}
        </div>
      </section>
    </div>
  );
}
