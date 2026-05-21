import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import type { EventCardProps } from "@/components/EventCard";
import { resolveEventMarketingStatus, sortEventsForMarketing, normalizeEventListingKind } from "@/lib/eventMarketingStatus";
import { resolveEventCopy } from "@/lib/contentI18n";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { buildPublicPageMetadata, canonicalPath } from "@/lib/seo";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListJsonLd } from "@/lib/seo/eventJsonLd";
import {
  intentClusterForSlug,
  intentListingKindFilter,
  ticketsIntentHreflangUrls,
} from "@/lib/ticketsIntentRoutes";

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
  const supabase = getServiceSupabase();
  let list: EventCardProps[] = [];
  if (supabase) {
    let query = supabase
      .from("events")
      .select("id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind,event_language")
      .eq("visibility", "published")
      .order("starts_at", { ascending: true });

    if (listingFilter !== "all") {
      query = query.eq("listing_kind", listingFilter);
    }

    const { data: events, error } = await query;

    let rows = events;
    if (error?.code === "42703") {
      let fallbackQuery = supabase
        .from("events")
        .select("id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind")
        .eq("visibility", "published")
        .order("starts_at", { ascending: true });
      if (listingFilter !== "all") {
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
      return [
        {
          slug: ev.slug as string,
          title: copy.title,
          venue: ev.venue as string,
          startsAt: ev.starts_at as string,
          priceGrosze: ev.price_grosze as number,
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

  return (
    <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-14">
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      <article className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          <span className="text-gradient-gold">{t(`${cluster}H1`)}</span>
        </h1>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-zinc-300">{t(`${cluster}Intro`)}</p>
      </article>
      <section className="mt-10 scroll-mt-24 space-y-6" id="afisha">
        <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-500">{t("eventsSectionLabel")}</p>
        {list.length ? <HomeEventsGrid events={list} /> : <p className="text-zinc-500">{t("eventsEmpty")}</p>}
      </section>
    </div>
  );
}
