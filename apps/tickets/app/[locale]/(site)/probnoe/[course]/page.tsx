import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { TrialDateCheckout } from "@/components/TrialDateCheckout";
import { PromoVisitTracker } from "@/components/PromoVisitTracker";
import { TrialHubGallery } from "@/components/TrialHubGallery";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { resolveApplicablePromoCode } from "@/lib/promoCodes";
import { buildPublicPageMetadata, truncateMetaDescription } from "@/lib/seo";
import { eventLanguageLabel } from "@/lib/eventLanguage";
import { formatEventDateTime } from "@/lib/format";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { resolveAbsoluteAssetUrl } from "@/lib/safePublicUrl";
import { POPULAR_POET_THEATRE_MAPS_URL, POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";
import {
  fetchTrialHubCourse,
  fetchTrialHubDates,
  fetchTrialHubPhotos,
  poetCourseUrl,
  selectTrialHubDate,
  TRIAL_HUB_SEGMENT,
} from "@/lib/trialCourseHub";

/** Страница чекаута: закэшированный ответ ломает Server Actions после деплоя. */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: AppLocale; course: string }>;
  searchParams: Promise<{ d?: string; promo?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale, course: courseSlug } = await params;
  const { d: requestedSlug } = await searchParams;
  const t = await getTranslations({ locale, namespace: "TrialHub" });
  const supabase = getServiceSupabase();
  const course = supabase ? await fetchTrialHubCourse(supabase, courseSlug, locale) : null;
  if (!course) {
    return buildPublicPageMetadata({
      locale,
      path: `/${TRIAL_HUB_SEGMENT}/${courseSlug}`,
      title: t("metaTitleFallback"),
      description: t("metaDescriptionFallback"),
      robots: { index: false, follow: true },
    });
  }

  const dates = supabase ? await fetchTrialHubDates(supabase, course.id, locale) : [];
  const photos = supabase ? await fetchTrialHubPhotos(supabase, course.id) : [];
  const { selected } = selectTrialHubDate(dates, requestedSlug);
  // Для постоянной ссылки без ?d= — стабильный title (удобно шарить в Telegram).
  const title = requestedSlug && selected
    ? t("metaTitleWithDate", { course: course.title, date: formatEventDateTime(selected.startsAt, locale) })
    : t("metaTitle", { course: course.title });

  const coverForOg = photos[0]?.src ?? course.heroImageUrl;
  const heroAbs = resolveAbsoluteAssetUrl(coverForOg, getPublicAppUrl());
  const ogImages = heroAbs
    ? [{ url: heroAbs, width: 1200, height: 630, alt: course.title }]
    : undefined;

  return buildPublicPageMetadata({
    locale,
    path: `/${TRIAL_HUB_SEGMENT}/${courseSlug}`,
    title,
    description: truncateMetaDescription(course.description) || t("metaDescription", { course: course.title }),
    ogImages,
    // Индексируемая посадочная — страница курса на popularpoet.pl; здесь только оплата.
    robots: { index: false, follow: true },
  });
}

export default async function TrialCourseHubPage({ params, searchParams }: PageProps) {
  const { locale, course: courseSlug } = await params;
  const { d: requestedSlug, promo: promoRaw } = await searchParams;
  const t = await getTranslations({ locale, namespace: "TrialHub" });
  const tCheckout = await getTranslations({ locale, namespace: "CheckoutForm" });
  const tEvent = await getTranslations({ locale, namespace: "EventPage" });

  const supabase = getServiceSupabase();
  if (!supabase) return <SupabaseSetupHint variant="disconnected" locale={locale} />;

  const course = await fetchTrialHubCourse(supabase, courseSlug, locale);
  if (!course) notFound();

  const dates = await fetchTrialHubDates(supabase, course.id, locale);
  const photos = await fetchTrialHubPhotos(supabase, course.id);
  const { selected, requestedMissing } = selectTrialHubDate(dates, requestedSlug);
  const showRequestedNotice = requestedMissing && selected?.slug !== requestedSlug;
  const promo = selected
    ? await resolveApplicablePromoCode(supabase, promoRaw, { id: selected.id, listingKind: "trial" })
    : null;
  const venue = selected?.venue?.trim() || POPULAR_POET_TRIAL_VENUE_PL;
  const courseHref = poetCourseUrl(locale, course.slug);

  return (
    <div className="poet-safe-x mx-auto max-w-3xl py-8 sm:py-14">
      {promo && selected ? <PromoVisitTracker promoCodeId={promo.id} eventId={selected.id} /> : null}

      <div className="overflow-hidden rounded-2xl border border-poet-gold/25 bg-poet-surface/50 shadow-gold backdrop-blur-md sm:rounded-3xl">
        <div className="relative overflow-hidden">
          <TrialHubGallery photos={photos} alt={course.title} fallbackSrc={course.heroImageUrl} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-16 bg-gradient-to-t from-poet-bg/80 to-transparent" />
        </div>

        <header className="px-4 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-poet-gold/75">{t("kicker")}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            {t("heading", { course: course.title })}
          </h1>
          {course.description.trim() ? (
            <p className="mt-4 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-zinc-400 sm:text-base">
              {course.description}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-zinc-400">{venue}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <a
              href={POPULAR_POET_THEATRE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold"
            >
              {tEvent("openInMaps")}
            </a>
            {selected ? (
              <span className="text-zinc-500">
                {tEvent("languageLabel")}: {eventLanguageLabel(selected.eventLanguage, locale)}
              </span>
            ) : null}
          </div>
        </header>
      </div>

      {showRequestedNotice ? (
        <p className="mt-6 rounded-xl border border-poet-gold/25 bg-poet-gold/[0.06] px-4 py-3 text-sm text-zinc-300">
          {t("requestedDateUnavailable")}
        </p>
      ) : null}

      <section className="mt-8">
        {dates.length === 0 || !selected ? (
          <div className="rounded-2xl border border-dashed border-poet-gold/25 bg-black/25 px-5 py-8 sm:px-8">
            <p className="text-sm leading-relaxed text-zinc-400">{t("emptyDates")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={courseHref} className="btn-poet btn-poet-theatre inline-flex no-underline">
                {t("courseCta")}
              </a>
              <Link
                href="/events"
                className="btn-poet inline-flex items-center justify-center rounded-xl border border-poet-gold/30 px-5 py-2.5 text-sm text-poet-gold-bright no-underline hover:bg-poet-gold/10"
              >
                {t("afishaCta")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <TrialDateCheckout
              locale={locale}
              dates={dates.map((date) => ({
                slug: date.slug,
                startsAt: date.startsAt,
                priceGrosze: date.priceGrosze,
                remaining: date.remaining,
                soldOut: date.soldOut,
              }))}
              initialSlug={selected.slug}
              bypassPayment={isCheckoutBypassPayment()}
              initialPromoCode={promo?.code}
              initialPromoDiscountPercent={promo?.discountPercent}
              initialPromoDiscountFixedGrosze={promo?.discountFixedGrosze}
            />
            <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{tCheckout("taxExemptionNote")}</p>
          </>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-poet-gold/20 bg-black/20 px-5 py-6 sm:px-7">
        <h2 className="font-display text-lg font-medium text-zinc-100">{t("aboutCourseTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("aboutCourseBody")}</p>
        <a
          href={courseHref}
          className="mt-4 inline-flex text-sm text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold"
        >
          {t("courseCta")} ↗
        </a>
      </section>
    </div>
  );
}
