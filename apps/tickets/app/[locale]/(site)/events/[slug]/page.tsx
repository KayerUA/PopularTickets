import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { fetchPublishedEventBySlug } from "@/lib/supabase/fetchPublishedEventBySlug";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { SupabaseQueryErrorPanel } from "@/components/SupabaseQueryErrorPanel";
import { formatPlnFromGrosze, formatEventDateTime, formatEventDateShortForTitle } from "@/lib/format";
import { splitTheatreTicketGrossGrosze } from "@/lib/plVatTheatreTicket";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { EventMobileStickyCta } from "@/components/EventMobileStickyCta";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { resolveEventMapsUrl } from "@/lib/mapsUrl";
import { resolveEventMarketingStatus, normalizeEventListingKind } from "@/lib/eventMarketingStatus";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { buildPublicPageMetadata, truncateMetaDescription, canonicalPath, hreflangLanguagesForPublishedEvent } from "@/lib/seo";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { JsonLd } from "@/components/JsonLd";
import { buildEventJsonLd, buildBreadcrumbListJsonLd, buildFaqPageJsonLd } from "@/lib/seo/eventJsonLd";
import { COMPANY } from "@/lib/company";
import { eventCoverObjectPosition } from "@/lib/eventCoverFocal";
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { Link } from "@/i18n/navigation";
import { resolveEventCopy } from "@/lib/contentI18n";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";
import { eventLanguageLabel, normalizeEventLanguage } from "@/lib/eventLanguage";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import { isRenderableImageSrc, resolveAbsoluteAssetUrl } from "@/lib/safePublicUrl";
import { legacyEventRedirectPath } from "@/lib/legacyEventRedirects";
import { fetchRelatedEvents } from "@/lib/fetchRelatedEvents";
import { eventContextLinks } from "@/lib/eventContextLinks";
import { RelatedEventsSection } from "@/components/RelatedEventsSection";
import { eventRobotsMeta } from "@/lib/eventSeoPolicy";

/** Server Actions + ISR: закэшированная страница после деплоя даёт «Server Action … was not found». */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = getServiceSupabase();
  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  if (!supabase) {
    return buildPublicPageMetadata({
      locale,
      path: `/events/${slug}`,
      title: tMeta("homeTitle"),
      description: tMeta("homeDescription"),
    });
  }
  const { data: event } = await fetchPublishedEventBySlug(supabase, slug);
  if (!event) {
    return buildPublicPageMetadata({
      locale,
      path: `/events/${slug}`,
      title: tMeta("homeTitle"),
      description: tMeta("homeDescription"),
    });
  }
  const copy = resolveEventCopy(event, locale);
  if (!copy) {
    return buildPublicPageMetadata({
      locale,
      path: `/events/${slug}`,
      title: tMeta("homeTitle"),
      description: tMeta("homeDescription"),
    });
  }
  const short = formatEventDateShortForTitle(event.starts_at);
  const eventLanguage = normalizeEventLanguage(event.event_language);
  const title = `${copy.title} — ${tMeta("eventListingLine")}, ${short}`;
  const desc = `${tMeta("eventDescriptionBuy")} ${formatEventDateTime(event.starts_at, locale)}. ${event.venue}. ${eventLanguageLabel(eventLanguage, locale)}. ${truncateMetaDescription(copy.description)}`;
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  let ogImages: { url: string; width: number; height: number; alt: string }[] | undefined;
  const ogImageAbs = resolveAbsoluteAssetUrl(event.image_url, base);
  if (ogImageAbs) {
    ogImages = [{ url: ogImageAbs, width: 1200, height: 630, alt: copy.title }];
  }
  const keywords = [
    ...tMeta("homeKeywords")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    copy.title,
    event.venue,
  ];
  const robots = eventRobotsMeta(event.starts_at, event.visibility);
  return buildPublicPageMetadata({
    locale,
    path: `/events/${slug}`,
    title,
    description: desc,
    keywords: [...new Set(keywords)].slice(0, 24),
    ogType: "article",
    ogImages,
    robots,
    hreflangAlternateUrls: hreflangLanguagesForPublishedEvent(`/events/${slug}`),
  });
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}) {
  const { slug, locale } = await params;
  const legacyRedirect = legacyEventRedirectPath(locale, slug);
  if (legacyRedirect) permanentRedirect(legacyRedirect);

  const t = await getTranslations({ locale, namespace: "EventPage" });
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="disconnected" locale={locale} />;
  }

  const { data: event, error } = await fetchPublishedEventBySlug(supabase, slug);

  if (error) {
    return <SupabaseQueryErrorPanel locale={locale} error={error} titleNamespace="EventPage" titleKey="loadQueryError" />;
  }
  if (!event) notFound();
  const copy = resolveEventCopy(event, locale);
  if (!copy) notFound();

  const { count: sold, error: cErr } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  if (cErr) {
    return <div className="poet-safe-x p-6 text-red-400 sm:p-8">{t("loadRemainingError")}</div>;
  }

  const remaining = event.total_tickets - (sold ?? 0);
  const marketingStatus = resolveEventMarketingStatus({
    startsAt: event.starts_at,
    remaining,
    totalTickets: event.total_tickets,
  });
  const listingKind = normalizeEventListingKind(event.listing_kind);
  const mapsHref = resolveEventMapsUrl({
    maps_url: event.maps_url,
    description: copy.description,
    venue: event.venue,
    listing_kind: listingKind,
  });
  const whenStr = formatEventDateTime(event.starts_at, locale);
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "";
  const homePath = canonicalPath(locale, "/");
  const homeUrl = base ? `${base}${homePath}` : "";
  const eventsPath = canonicalPath(locale, "/events");
  const eventsUrl = base ? `${base}${eventsPath}` : "";
  const eventUrlAbs = base ? `${base}${canonicalPath(locale, `/events/${slug}`)}` : "";
  const breadcrumbLd =
    homeUrl && eventsUrl && eventUrlAbs
      ? buildBreadcrumbListJsonLd([
          { name: t("breadcrumbHome"), item: homeUrl },
          { name: t("breadcrumbAfisha"), item: eventsUrl },
          { name: copy.title, item: eventUrlAbs },
        ])
      : null;

  const soldOut = remaining <= 0 || marketingStatus === "sold_out";
  const ticketVat = splitTheatreTicketGrossGrosze(event.price_grosze);
  const hasDayOfEventIncrease =
    typeof event.day_of_event_price_grosze === "number" &&
    event.day_of_event_price_grosze > event.regular_price_grosze;
  const isEventDayPrice =
    hasDayOfEventIncrease && event.price_grosze === event.day_of_event_price_grosze;
  const isTrialEvent = listingKind === "trial";
  const eventLanguage = normalizeEventLanguage(event.event_language);
  const poetLessonsUrl = `${POPULAR_POET_SITE_URL.replace(/\/+$/, "")}/${locale}#schedule`;
  const isPast = marketingStatus === "past";

  const faqPairs = [
    ["faqQ1", "faqA1"],
    ["faqQ2", "faqA2"],
    ["faqQ3", "faqA3"],
    ["faqQ4", "faqA4"],
  ] as const;
  const faqLd = buildFaqPageJsonLd(
    faqPairs.map(([qk, ak]) => ({
      name: t(qk),
      acceptedAnswer: { text: t(ak) },
    })),
  );

  const showCheckout = !isPast && remaining > 0;
  const contextLinks = eventContextLinks(locale, {
    listingKind,
    title: copy.title,
    description: copy.description,
  });
  const relatedEvents = await fetchRelatedEvents(supabase, {
    locale,
    excludeSlug: slug,
    listingKind,
    title: copy.title,
    description: copy.description,
  });

  return (
    <div
      className={`poet-safe-x mx-auto max-w-3xl py-8 sm:py-14${showCheckout ? " pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-14" : ""}`}
    >
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      <JsonLd data={faqLd} />
      <nav className="mb-6 text-sm text-zinc-500" aria-label={t("breadcrumbAria")}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className="text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-200">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden className="text-zinc-600">
            /
          </li>
          <li>
            <Link
              href="/events"
              className="text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-200"
            >
              {t("breadcrumbAfisha")}
            </Link>
          </li>
          <li aria-hidden className="text-zinc-600">
            /
          </li>
          <li className="max-w-[min(100%,28rem)] truncate text-zinc-300" title={copy.title}>
            {copy.title}
          </li>
        </ol>
      </nav>
      <JsonLd
        data={buildEventJsonLd(
          {
            title: copy.title,
            description: copy.description,
            venue: event.venue,
            starts_at: event.starts_at,
            image_url: event.image_url,
            price_grosze: event.price_grosze,
            slug: event.slug,
            listing_kind: event.listing_kind,
            event_language: eventLanguage,
            total_tickets: event.total_tickets,
          },
          locale,
          { remaining, soldOut, mapsUrl: mapsHref }
        )}
      />
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-poet-gold/25 bg-poet-surface/50 shadow-gold backdrop-blur-md sm:rounded-3xl">
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
          {event.image_url ? (
            <MediaCoverBlurred
              src={event.image_url}
              alt=""
              sizes="(max-width:768px) 100vw, 896px"
              priority
              unoptimized={!isOptimizableEventImage(event.image_url)}
              coverObjectPosition={eventCoverObjectPosition(event.image_focal_x, event.image_focal_y)}
              frameClassName="absolute inset-0"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-poet-gold-dim/35 via-poet-bg to-zinc-950" />
          )}
          <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-poet-bg via-poet-bg/20 to-transparent" />
        </div>
        <div className="space-y-4 p-4 sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              <span className="text-gradient-gold [overflow-wrap:anywhere]">{copy.title}</span>
            </h1>
            {marketingStatus ? (
              <div className="mt-3">
                <EventStatusBadge status={marketingStatus} listingKind={listingKind} />
              </div>
            ) : null}
            <p className="mt-2 break-words text-sm text-zinc-400 sm:text-base">{whenStr}</p>
            <p className="mt-1 text-sm font-medium text-poet-gold-bright/90 sm:text-base">
              {t("languageLabel")}: {eventLanguageLabel(eventLanguage, locale)}
            </p>
            <p className="break-words text-sm text-zinc-400 sm:text-base">{event.venue}</p>
            {mapsHref ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-poet-gold-bright underline decoration-poet-gold/35 underline-offset-2 transition hover:text-poet-gold hover:decoration-poet-gold/60"
                >
                  {t("openInMaps")}
                  <span aria-hidden className="text-xs opacity-80">
                    ↗
                  </span>
                </a>
                <span className="text-zinc-600" aria-hidden>
                  ·
                </span>
                {isPast ? (
                  <Link
                    href="/events"
                    className="text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-200"
                  >
                    {t("skipToAfisha")}
                  </Link>
                ) : (
                  <a
                    href="#event-checkout"
                    className="text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-200"
                  >
                    {t("skipToCheckout")}
                  </a>
                )}
              </p>
            ) : isPast ? (
              <p className="mt-2">
                <Link
                  href="/events"
                  className="text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-200"
                >
                  {t("skipToAfisha")}
                </Link>
              </p>
            ) : (
              <p className="mt-2">
                <a
                  href="#event-checkout"
                  className="text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-200"
                >
                  {t("skipToCheckout")}
                </a>
              </p>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-zinc-300 sm:text-base">
            {copy.description}
          </p>
          {isTrialEvent ? (
            <aside className="rounded-xl border border-poet-gold/20 bg-black/25 px-4 py-4">
              <p className="text-sm font-medium text-zinc-100">{t("trialReturnTitle")}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{t("trialReturnBody")}</p>
              <a
                href={poetLessonsUrl}
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-poet-gold/35 px-4 py-2 text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/55 hover:bg-poet-gold/10"
              >
                {t("trialReturnCta")}
              </a>
            </aside>
          ) : null}
          <div className="flex flex-col gap-4 border-t border-poet-gold/15 pt-5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6 sm:pt-6">
            <div className="min-w-0 sm:max-w-md">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("priceLabel")}</p>
              <p className="text-xl font-semibold text-poet-gold-bright">{formatPlnFromGrosze(event.price_grosze)}</p>
              {hasDayOfEventIncrease ? (
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-poet-gold/85">
                  {isEventDayPrice
                    ? t("eventDayPriceActive")
                    : t("bookEarlyPrice", { price: formatPlnFromGrosze(event.day_of_event_price_grosze!) })}
                </p>
              ) : null}
              <details className="mt-2 group">
                <summary className="cursor-pointer list-none text-xs font-medium text-poet-gold/85 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="underline decoration-poet-gold/30 underline-offset-2 group-open:text-poet-gold-bright">
                    {t("priceDetailsSummary")}
                  </span>
                </summary>
                <dl className="mt-2 space-y-0.5 border-t border-poet-gold/10 pt-2 text-xs text-zinc-400">
                  <div className="flex gap-4">
                    <dt>{t("bruttoLabel")}</dt>
                    <dd className="text-zinc-400">{formatPlnFromGrosze(ticketVat.grossGrosze)}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt>{t("nettoLabel")}</dt>
                    <dd className="text-zinc-400">{formatPlnFromGrosze(ticketVat.netGrosze)}</dd>
                  </div>
                  <div className="flex gap-4">
                    <dt>{t("vatLabel")}</dt>
                    <dd className="text-zinc-400">{formatPlnFromGrosze(ticketVat.vatGrosze)}</dd>
                  </div>
                </dl>
                <p className="mt-2 max-w-md text-[11px] leading-relaxed text-zinc-500">{t("vatLegalNote")}</p>
              </details>
            </div>
            {!isPast ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("remainingLabel")}</p>
                <p className="text-xl font-semibold text-zinc-100">{remaining}</p>
              </div>
            ) : null}
          </div>

          {isPast ? (
            <div className="mt-4 space-y-3 rounded-xl border border-poet-gold/15 bg-black/20 px-4 py-4">
              <p className="font-medium text-poet-gold-bright/95">{t("eventEndedTitle")}</p>
              <p className="text-sm leading-relaxed text-zinc-400">{t("archiveCheckoutHint")}</p>
              <Link
                href="/events"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-poet-gold/35 px-4 py-2 text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/55 hover:bg-poet-gold/10"
              >
                {t("eventEndedCta")}
              </Link>
            </div>
          ) : remaining > 0 ? (
            <section id="event-checkout" className="scroll-mt-28 sm:scroll-mt-32">
              <aside className="mt-5 rounded-xl border border-poet-gold/15 bg-black/20 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400 sm:px-4 sm:text-xs">
                {t(
                  isCheckoutBypassPayment() ? "prePurchaseNoteBypass" : "prePurchaseNote",
                  { seller: COMPANY.legalNameShort, nip: COMPANY.nip }
                )}
              </aside>
              <EventCheckoutForm
                eventSlug={event.slug}
                remaining={remaining}
                locale={locale}
                unitPriceGrosze={event.price_grosze}
                bypassPayment={isCheckoutBypassPayment()}
              />
            </section>
          ) : (
            <p className="mt-4 text-poet-gold-bright/90">{t("soldOut")}</p>
          )}
        </div>
      </div>

      <section className="mt-10 max-w-3xl" aria-labelledby="event-faq-heading">
        <h2 id="event-faq-heading" className="font-display text-lg font-medium text-zinc-100 sm:text-xl">
          {t("faqTitle")}
        </h2>
        <dl className="mt-5 space-y-5 border-t border-poet-gold/10 pt-5">
          {faqPairs.map(([qk, ak]) => (
            <div key={qk}>
              <dt className="text-sm font-semibold text-zinc-200">{t(qk)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{t(ak)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <RelatedEventsSection
        locale={locale}
        related={relatedEvents}
        ticketsIntentPath={contextLinks.ticketsIntentPath}
        poetHubUrl={contextLinks.poetHubUrl}
      />

      {showCheckout ? (
        <EventMobileStickyCta
          priceGrosze={event.price_grosze}
          remaining={remaining}
          bypassPayment={isCheckoutBypassPayment()}
          mapsHref={mapsHref ?? undefined}
        />
      ) : null}
    </div>
  );
}
