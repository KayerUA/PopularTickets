import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import type { EventCardProps } from "@/components/EventCard";
import { resolveEventMarketingStatus, sortEventsForMarketing, normalizeEventListingKind } from "@/lib/eventMarketingStatus";
import { resolveEventCopy } from "@/lib/contentI18n";
import { eventPriceDetails } from "@/lib/eventPrice";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { buildPublicPageMetadata, canonicalPath } from "@/lib/seo";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListJsonLd, buildEventItemListJsonLd, buildFaqPageJsonLd } from "@/lib/seo/eventJsonLd";
import type { EventItemListEntry } from "@/lib/seo/eventJsonLd";
import {
  intentClusterForSlug,
  intentListingKindFilter,
  nextModeIntentPromoForCluster,
  TICKETS_INTENT_CLUSTER_SLUGS,
  ticketsIntentHreflangUrls,
} from "@/lib/ticketsIntentRoutes";
import type { IntentClusterKey } from "@/lib/ticketsIntentRoutes";
import { intentFaqTranslationKeys } from "@/lib/ticketsIntentFaq";
import { NextModeIntentWidget } from "@/components/NextModeIntentWidget";

const FEATURED_SPECIAL_SLUG = "next-mode-2026-08-15";
const EDITORIAL_DATE = "2026-07-15";
const EDITORIAL_CLUSTERS = ["leisure", "improv", "russian", "afisha"] as const;
const EDITORIAL_SECTION_NUMBERS = [1, 2, 3, 4] as const;

type EditorialCluster = (typeof EDITORIAL_CLUSTERS)[number];

function isEditorialCluster(cluster: IntentClusterKey): cluster is EditorialCluster {
  return (EDITORIAL_CLUSTERS as readonly IntentClusterKey[]).includes(cluster);
}

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; intentSlug: string }>;
}): Promise<Metadata> {
  const { locale, intentSlug } = await params;
  const cluster = intentClusterForSlug(locale, intentSlug);
  if (!cluster) return {};
  const t = await getTranslations({ locale, namespace: "IntentDiscover" });
  return buildPublicPageMetadata({
    locale,
    path: `/${intentSlug}`,
    title: t(`${cluster}MetaTitle`),
    description: t(`${cluster}MetaDescription`),
    ogType: locale === "ru" && isEditorialCluster(cluster) ? "article" : "website",
    hreflangAlternateUrls: ticketsIntentHreflangUrls(locale, intentSlug),
  });
}

export default async function IntentDiscoverPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; intentSlug: string }>;
}) {
  const { locale, intentSlug } = await params;
  if (!routing.locales.includes(locale)) notFound();
  const cluster = intentClusterForSlug(locale, intentSlug);
  if (!cluster) notFound();

  const t = await getTranslations({ locale, namespace: "IntentDiscover" });
  const listingFilter = intentListingKindFilter(cluster);
  const includeNextMode = locale === "ru" && listingFilter !== "trial";
  const nextModePromo = includeNextMode ? nextModeIntentPromoForCluster(cluster) : null;
  const editorialCluster = locale === "ru" && isEditorialCluster(cluster) ? cluster : null;
  const supabase = getServiceSupabase();
  let list: EventCardProps[] = [];
  let jsonLdEntries: EventItemListEntry[] = [];
  if (supabase) {
    let query = supabase
      .from("events")
      .select("id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,day_of_event_price_grosze,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind,event_language,visibility")
      .order("starts_at", { ascending: true });

    if (includeNextMode) {
      query = query.in("visibility", ["published", "unlisted"]).in("listing_kind", ["performance", "special"]);
    } else {
      query = query.eq("visibility", "published");
    }

    if (!includeNextMode && listingFilter !== "all") {
      query = query.eq("listing_kind", listingFilter);
    }

    const { data: events, error } = await query;

    let rows = events;
    if (error?.code === "42703") {
      let fallbackQuery = supabase
        .from("events")
        .select("id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,day_of_event_price_grosze,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind,visibility")
        .order("starts_at", { ascending: true });
      if (includeNextMode) {
        fallbackQuery = fallbackQuery
          .in("visibility", ["published", "unlisted"])
          .in("listing_kind", ["performance", "special"]);
      } else {
        fallbackQuery = fallbackQuery.eq("visibility", "published");
      }
      if (!includeNextMode && listingFilter !== "all") {
        fallbackQuery = fallbackQuery.eq("listing_kind", listingFilter);
      }
      const fallback = await fallbackQuery;
      rows = (fallback.data ?? []).map((ev) => ({
        ...ev,
        event_language: null,
      }));
    } else {
      rows = events ?? [];
    }

    rows = rows.filter((ev) => {
      if (!includeNextMode) return true;
      const slug = ev.slug as string;
      const visibility = String((ev as { visibility?: unknown }).visibility ?? "");
      const kind = normalizeEventListingKind((ev as { listing_kind?: string | null }).listing_kind);
      return (visibility === "published" && kind === "performance") || slug === FEATURED_SPECIAL_SLUG;
    });

    const ids = rows.map((ev) => ev.id as string);
    const soldMap = new Map<string, number>();
    if (ids.length) {
      const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", ids);
      for (const row of ticketRows ?? []) {
        const eid = row.event_id as string;
        soldMap.set(eid, (soldMap.get(eid) ?? 0) + 1);
      }
    }
    const cards: EventCardProps[] = rows.flatMap((ev) => {
      const copy = resolveEventCopy(
        {
          title: ev.title as string,
          description: ev.description as string | undefined,
          title_pl: (ev as { title_pl?: string | null }).title_pl,
          description_pl: (ev as { description_pl?: string | null }).description_pl,
          title_uk: (ev as { title_uk?: string | null }).title_uk,
          description_uk: (ev as { description_uk?: string | null }).description_uk,
        },
        locale,
      );
      if (!copy) return [];
      const totalTickets = ev.total_tickets as number;
      const sold = soldMap.get(ev.id as string) ?? 0;
      const remaining = totalTickets - sold;
      const status = resolveEventMarketingStatus({
        startsAt: ev.starts_at as string,
        remaining,
        totalTickets,
      });
      const soldOut = status === "sold_out" || remaining <= 0;
      jsonLdEntries.push({
        event: {
          title: copy.title,
          description: copy.description ?? "",
          venue: ev.venue as string,
          starts_at: ev.starts_at as string,
          image_url: (ev.image_url as string | null) ?? null,
          price_grosze: ev.price_grosze as number,
          slug: ev.slug as string,
          listing_kind: (ev as { listing_kind?: string | null }).listing_kind,
          event_language: (ev as { event_language?: never }).event_language,
          total_tickets: totalTickets,
        },
        remaining,
        soldOut,
        mapsUrl: null,
      });
      const pricing = eventPriceDetails({
        starts_at: ev.starts_at as string,
        price_grosze: ev.price_grosze as number,
        day_of_event_price_grosze: ev.day_of_event_price_grosze as number | null,
      });
      return [
        {
          slug: ev.slug as string,
          title: copy.title,
          venue: ev.venue as string,
          startsAt: ev.starts_at as string,
          priceGrosze: pricing.effectivePriceGrosze,
          dayOfEventPriceGrosze: pricing.dayOfEventPriceGrosze,
          isEventDayPrice: pricing.isEventDay && pricing.hasDayOfEventIncrease,
          imageUrl: (ev.image_url as string | null) ?? null,
          imageFocalX:
            typeof (ev as { image_focal_x?: unknown }).image_focal_x === "number"
              ? (ev as { image_focal_x: number }).image_focal_x
              : null,
          imageFocalY:
            typeof (ev as { image_focal_y?: unknown }).image_focal_y === "number"
              ? (ev as { image_focal_y: number }).image_focal_y
              : null,
          locale,
          status,
          listingKind: normalizeEventListingKind((ev as { listing_kind?: string | null }).listing_kind),
          eventLanguage: (ev as { event_language?: never }).event_language,
        },
      ];
    });
    list = sortEventsForMarketing(cards);
  }

  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "";
  const homeUrl = base ? `${base}${canonicalPath(locale, "/")}` : "";
  const pageUrl = base ? `${base}${canonicalPath(locale, `/${intentSlug}`)}` : "";
  const breadcrumbLd =
    homeUrl && pageUrl
      ? buildBreadcrumbListJsonLd([
          { name: locale === "pl" ? "Strona główna" : locale === "ru" ? "Главная" : "Головна", item: homeUrl },
          { name: t(`${cluster}H1`), item: pageUrl },
        ])
      : null;

  const faqPairs = intentFaqTranslationKeys(cluster).map(([qk, ak]) => ({
    q: t(qk),
    a: t(ak),
  }));

  const faqLd = buildFaqPageJsonLd(faqPairs.map((p) => ({ name: p.q, acceptedAnswer: { text: p.a } })));
  const eventsListLd = buildEventItemListJsonLd(
    locale,
    t("eventsSectionLabel"),
    pageUrl ? `${pageUrl}#afisha` : undefined,
    jsonLdEntries,
  );
  const answerKey = `${cluster}Answer`;
  const answer = t.has(answerKey) ? t(answerKey) : null;
  const editorialSections = editorialCluster
    ? EDITORIAL_SECTION_NUMBERS.map((number) => ({
        title: t(`${editorialCluster}Section${number}Title`),
        body: t(`${editorialCluster}Section${number}Body`),
      }))
    : [];
  const relatedEditorialPages = editorialCluster
    ? EDITORIAL_CLUSTERS.filter((relatedCluster) => relatedCluster !== editorialCluster).flatMap((relatedCluster) => {
        const slug = TICKETS_INTENT_CLUSTER_SLUGS[relatedCluster].ru;
        return slug ? [{ href: `/${slug}`, label: t(`${relatedCluster}H1`) }] : [];
      })
    : [];
  const editorialArticleLd =
    editorialCluster && pageUrl
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: t(`${editorialCluster}H1`),
          description: t(`${editorialCluster}MetaDescription`),
          inLanguage: "ru-RU",
          datePublished: EDITORIAL_DATE,
          dateModified: EDITORIAL_DATE,
          mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
          author: {
            "@type": "Organization",
            name: t("editorialAuthor"),
            url: base ? `${base}${canonicalPath("ru", "/o-populartickets")}` : undefined,
          },
          publisher: {
            "@type": "Organization",
            name: "PopularTickets",
            url: base ? `${base}${canonicalPath("ru", "/")}` : undefined,
          },
        }
      : null;

  return (
    <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-14">
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      {eventsListLd ? <JsonLd data={eventsListLd} /> : null}
      {faqLd ? <JsonLd data={faqLd} /> : null}
      {editorialArticleLd ? <JsonLd data={editorialArticleLd} /> : null}
      <header className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          <span className="text-gradient-gold">{t(`${cluster}H1`)}</span>
        </h1>
        {answer ? <p className="mt-4 text-base font-semibold leading-relaxed text-zinc-100">{answer}</p> : null}
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-zinc-300">{t(`${cluster}Intro`)}</p>
      </header>

      {nextModePromo ? (
        <NextModeIntentWidget
          eventHref={`/special/${FEATURED_SPECIAL_SLUG}`}
          initialFormat={nextModePromo.initialFormat}
          variant={nextModePromo.variant}
        />
      ) : null}

      {editorialCluster ? (
        <section className="mt-10 max-w-4xl" aria-labelledby="intent-guide-heading">
          <div className="border-l-2 border-poet-gold/35 pl-4 sm:pl-5">
            <h2 id="intent-guide-heading" className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              {t(`${editorialCluster}GuideTitle`)}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-300">
              {t(`${editorialCluster}GuideIntro`)}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              <time dateTime={EDITORIAL_DATE}>{t("editorialUpdated")}</time>
              <span aria-hidden> · </span>
              {t("editorialAuthor")}
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {editorialSections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-poet-gold/15 bg-poet-surface/25 p-4 sm:p-5">
                <h3 className="font-display text-lg font-semibold leading-snug text-zinc-100">{section.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{section.body}</p>
              </section>
            ))}
          </div>

          <nav className="mt-7 rounded-2xl border border-poet-gold/12 bg-black/20 p-4 sm:p-5" aria-label={t("editorialRelatedTitle")}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-poet-gold/75">
              {t("editorialRelatedTitle")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {relatedEditorialPages.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="inline-flex min-h-10 items-center rounded-full border border-poet-gold/20 bg-poet-gold/5 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition hover:border-poet-gold/45 hover:bg-poet-gold/10 hover:text-poet-gold-bright"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      ) : null}

      {faqPairs.length ? (
        <section className="mt-10 max-w-3xl" aria-labelledby="intent-faq-heading">
          <h2 id="intent-faq-heading" className="font-display text-lg font-medium text-zinc-100 sm:text-xl">
            {t("faqTitle")}
          </h2>
          <dl className="mt-5 space-y-5 border-t border-poet-gold/10 pt-5">
            {faqPairs.map((item) => (
              <div key={item.q}>
                <dt className="text-sm font-semibold text-zinc-200">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="mt-10 scroll-mt-24 space-y-6" id="afisha">
        <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-500">{t("eventsSectionLabel")}</p>
        {list.length ? <HomeEventsGrid events={list} /> : <p className="text-zinc-500">{t("eventsEmpty")}</p>}
      </section>
    </div>
  );
}
