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
import { TrialCourseProgram, type TrialCourseProgramContent } from "@/components/TrialCourseProgram";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { resolveApplicablePromoCode } from "@/lib/promoCodes";
import { buildPublicPageMetadata, canonicalPath } from "@/lib/seo";
import { eventLanguageLabel } from "@/lib/eventLanguage";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { resolveAbsoluteAssetUrl } from "@/lib/safePublicUrl";
import { POPULAR_POET_THEATRE_MAPS_URL, POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListJsonLd, buildFaqPageJsonLd } from "@/lib/seo/eventJsonLd";
import { formatPlnFromGrosze } from "@/lib/format";
import {
  fetchTrialHubCourse,
  fetchTrialHubDates,
  fetchTrialHubPhotos,
  isIndexableTrialHubCourseSlug,
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

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { locale, course: courseSlug } = await params;
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

  const heroAbs = resolveAbsoluteAssetUrl(course.heroImageUrl, getPublicAppUrl());
  const ogImages = heroAbs
    ? [{ url: heroAbs, width: 1200, height: 630, alt: course.title }]
    : undefined;
  const indexable = course.visibility === "published" && isIndexableTrialHubCourseSlug(course.slug);

  return buildPublicPageMetadata({
    locale,
    path: `/${TRIAL_HUB_SEGMENT}/${courseSlug}`,
    title: t("metaTitle", { course: course.title }),
    description: t("metaDescription", { course: course.title }),
    ogImages,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
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

  const [dates, photos] = await Promise.all([
    fetchTrialHubDates(supabase, course.id, locale),
    fetchTrialHubPhotos(supabase, course.id),
  ]);
  const { selected, requestedMissing } = selectTrialHubDate(dates, requestedSlug);
  const showRequestedNotice = requestedMissing && selected?.slug !== requestedSlug;
  const promo = selected
    ? await resolveApplicablePromoCode(supabase, promoRaw, { id: selected.id, listingKind: "trial" })
    : null;
  const venue = selected?.venue?.trim() || POPULAR_POET_TRIAL_VENUE_PL;
  const courseHref = poetCourseUrl(locale, course.slug);
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "";
  const pagePath = `/${TRIAL_HUB_SEGMENT}/${course.slug}`;
  const pageUrl = base ? `${base}${canonicalPath(locale, pagePath)}` : "";
  const homeUrl = base ? `${base}${canonicalPath(locale, "/")}` : "";
  const pageHeading = t("heading", { course: course.title });
  const faqPairs = [
    { q: t("faqExperienceQ"), a: t("faqExperienceA") },
    { q: t("faqBookingQ"), a: t("faqBookingA") },
    { q: t("faqLanguageQ"), a: t("faqLanguageA") },
    { q: t("faqAfterQ"), a: t("faqAfterA") },
  ];
  const breadcrumbLd =
    homeUrl && pageUrl
      ? buildBreadcrumbListJsonLd([
          { name: t("breadcrumbHome"), item: homeUrl },
          { name: pageHeading, item: pageUrl },
        ])
      : null;
  const faqLd = buildFaqPageJsonLd(
    faqPairs.map((item) => ({ name: item.q, acceptedAnswer: { text: item.a } })),
  );
  const siblingCourseSlug = course.slug === "improv" ? "acting" : course.slug === "acting" ? "improv" : null;
  const program =
    course.slug === "acting" || course.slug === "improv"
      ? (t.raw(`programs.${course.slug}`) as TrialCourseProgramContent)
      : null;
  const trialPrice = selected ? formatPlnFromGrosze(selected.priceGrosze) : null;

  return (
    <div className="poet-safe-x mx-auto max-w-5xl py-8 sm:py-14">
      {promo && selected ? <PromoVisitTracker promoCodeId={promo.id} eventId={selected.id} /> : null}
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      <JsonLd data={faqLd} />

      <nav className="mb-6 text-sm text-zinc-500" aria-label={t("breadcrumbAria")}>
        <Link href="/" className="text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200">
          {t("breadcrumbHome")}
        </Link>
        <span className="mx-2 text-zinc-600" aria-hidden>/</span>
        <span className="text-zinc-300">{pageHeading}</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-poet-gold/25 bg-poet-surface/50 shadow-gold backdrop-blur-md sm:rounded-3xl">
        <div className="relative sm:overflow-hidden">
          <TrialHubGallery photos={photos} alt={course.title} fallbackSrc={course.heroImageUrl} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] hidden h-16 bg-gradient-to-t from-poet-bg/80 to-transparent sm:block" />
        </div>

        <header className="px-4 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-poet-gold/75">{t("kicker")}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            {pageHeading}
          </h1>
          <p className="mt-4 text-[0.9375rem] font-medium leading-relaxed text-zinc-200 sm:text-base">
            {program?.lead ?? t("evergreenLead", { course: course.title })}
          </p>
          {course.description.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-zinc-400 sm:text-base">
              {course.description}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-zinc-400">{venue}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-zinc-300">
            <span className="rounded-full border border-poet-gold/20 bg-black/25 px-3 py-1.5">{t("heroNoExperience")}</span>
            <span className="rounded-full border border-poet-gold/20 bg-black/25 px-3 py-1.5">{t("heroDuration")}</span>
            {trialPrice ? (
              <span className="rounded-full border border-poet-gold/30 bg-poet-gold/[0.07] px-3 py-1.5 font-semibold text-poet-gold-bright">
                {t("trialPriceLabel")}: {trialPrice}
              </span>
            ) : null}
          </div>
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
          <a
            href="#trial-booking"
            className="btn-poet btn-poet-theatre mt-6 inline-flex min-h-12 w-full items-center justify-center px-6 py-3 text-center text-sm font-semibold no-underline sm:w-auto"
          >
            {t("primaryCta")}
          </a>
        </header>
      </div>

      {showRequestedNotice ? (
        <p className="mt-6 rounded-xl border border-poet-gold/25 bg-poet-gold/[0.06] px-4 py-3 text-sm text-zinc-300">
          {t("requestedDateUnavailable")}
        </p>
      ) : null}

      <section
        id="trial-booking"
        aria-labelledby="trial-booking-heading"
        className="mt-8 scroll-mt-28 rounded-3xl border border-poet-gold/25 bg-gradient-to-br from-black/55 via-poet-surface/35 to-black/35 p-5 shadow-gold-sm sm:p-8"
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-poet-gold/75">{t("bookingKicker")}</p>
        {dates.length === 0 || !selected ? (
          <div className="rounded-2xl border border-dashed border-poet-gold/25 bg-black/25 px-5 py-8 sm:px-8">
            <h2 id="trial-booking-heading" className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">
              {t("chooseDate")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("emptyDates")}</p>
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

      {program ? (
        <TrialCourseProgram
          program={program}
          bookingHref="#trial-booking"
          bookingLabel={t("primaryCta")}
          trialPriceLabel={t("trialPriceLabel")}
          trialPrice={trialPrice}
        />
      ) : null}

      <section className="mt-10 rounded-2xl border border-poet-gold/20 bg-black/20 px-5 py-6 sm:px-7">
        <h2 className="font-display text-lg font-medium text-zinc-100">{t("aboutCourseTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("aboutCourseBody")}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
          <a
            href={courseHref}
            className="inline-flex text-sm text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold"
          >
            {t("courseCta")} ↗
          </a>
          {siblingCourseSlug ? (
            <Link
              href={`/${TRIAL_HUB_SEGMENT}/${siblingCourseSlug}`}
              className="inline-flex text-sm text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-100"
            >
              {t("otherTrialCta")}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="trial-details-heading">
        <h2 id="trial-details-heading" className="font-display text-xl font-semibold text-zinc-100 sm:text-2xl">
          {t("seoTitle")}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {(["seoExperience", "seoFormat", "seoDates"] as const).map((key) => (
            <article key={key} className="rounded-2xl border border-poet-gold/15 bg-poet-surface/20 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-zinc-200">{t(`${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t(`${key}Body`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="trial-faq-heading">
        <h2 id="trial-faq-heading" className="font-display text-xl font-semibold text-zinc-100 sm:text-2xl">
          {t("faqTitle")}
        </h2>
        <dl className="mt-5 divide-y divide-poet-gold/10 rounded-2xl border border-poet-gold/15 bg-black/20 px-5 sm:px-6">
          {faqPairs.map((item) => (
            <div key={item.q} className="py-4">
              <dt className="text-sm font-semibold text-zinc-200">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
