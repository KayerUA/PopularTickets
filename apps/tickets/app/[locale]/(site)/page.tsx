import { getServiceSupabase } from "@/lib/supabase/admin";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import { MarqueeStrip } from "@/components/MarqueeStrip";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { SupabaseQueryErrorPanel } from "@/components/SupabaseQueryErrorPanel";
import type { EventCardProps } from "@/components/EventCard";
import { resolveEventMarketingStatus, sortEventsForMarketing, normalizeEventListingKind } from "@/lib/eventMarketingStatus";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { buildHomeJsonLd, buildFaqPageJsonLd } from "@/lib/seo/eventJsonLd";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const keywords = t("homeKeywords")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return buildPublicPageMetadata({
    locale,
    path: "/",
    title: t("homeTitle"),
    description: t("homeDescription"),
    keywords,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  const bypass = isCheckoutBypassPayment();
  const subtitle = bypass ? t("subtitleBypass") : t("subtitleP24");
  const proofItems = [t("proofFast"), bypass ? t("proofSecureBypass") : t("proofSecureP24"), t("proofLimited")];

  const faqPairs = [
    ["faqQ1", "faqA1"],
    ["faqQ2", "faqA2"],
    ["faqQ3", "faqA3"],
    ["faqQ4", "faqA4"],
    ["faqQ5", "faqA5"],
    ["faqQ6", "faqA6"],
  ] as const;
  const faqLd = buildFaqPageJsonLd(
    faqPairs.map(([qk, ak]) => ({
      name: t(qk),
      acceptedAnswer: { text: t(ak) },
    }))
  );

  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" locale={locale} />;
  }
  const { data: events, error } = await supabase
    .from("events")
    .select("id,slug,title,venue,starts_at,price_grosze,image_url,image_focal_x,image_focal_y,total_tickets,listing_kind")
    .eq("visibility", "published")
    .eq("listing_kind", "performance")
    .order("starts_at", { ascending: true });

  if (error) {
    return <SupabaseQueryErrorPanel locale={locale} error={error} titleNamespace="Home" titleKey="loadError" />;
  }

  const rows = events ?? [];
  const ids = rows.map((ev) => ev.id as string);
  const soldMap = new Map<string, number>();
  if (ids.length) {
    const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", ids);
    for (const row of ticketRows ?? []) {
      const eid = row.event_id as string;
      soldMap.set(eid, (soldMap.get(eid) ?? 0) + 1);
    }
  }

  const list: EventCardProps[] = sortEventsForMarketing(
    rows.map((ev) => {
      const totalTickets = ev.total_tickets as number;
      const sold = soldMap.get(ev.id as string) ?? 0;
      const remaining = totalTickets - sold;
      const status = resolveEventMarketingStatus({
        startsAt: ev.starts_at as string,
        remaining,
        totalTickets,
      });
      return {
        slug: ev.slug as string,
        title: ev.title as string,
        venue: ev.venue as string,
        startsAt: ev.starts_at as string,
        priceGrosze: ev.price_grosze as number,
        imageUrl: (ev.image_url as string | null) ?? null,
        imageFocalX: typeof (ev as { image_focal_x?: unknown }).image_focal_x === "number" ? (ev as { image_focal_x: number }).image_focal_x : null,
        imageFocalY: typeof (ev as { image_focal_y?: unknown }).image_focal_y === "number" ? (ev as { image_focal_y: number }).image_focal_y : null,
        locale,
        status,
        listingKind: normalizeEventListingKind((ev as { listing_kind?: string | null }).listing_kind),
      };
    })
  );

  return (
    <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-16">
      <JsonLd data={buildHomeJsonLd(locale)} />
      <JsonLd data={faqLd} />
      <div className="animate-fade-up mb-10 overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/45 p-5 shadow-gold-sm backdrop-blur-sm sm:mb-12 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-poet-gold/80 sm:text-xs sm:tracking-[0.35em]">
          {t("brand")}
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:mt-3 sm:text-5xl">
          <span className="text-gradient-gold">{t("title")}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300 sm:mt-4 sm:text-lg">{subtitle}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {proofItems.map((item) => (
            <li
              key={item}
              className="rounded-full border border-poet-gold/20 bg-black/25 px-3 py-1.5 text-xs font-medium text-zinc-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <section className="mb-10 scroll-mt-24 rounded-2xl border border-poet-gold/12 bg-poet-surface/20 px-4 py-6 sm:mb-12 sm:px-8 sm:py-8" aria-labelledby="home-entity-heading">
        <h2 id="home-entity-heading" className="font-display text-lg font-medium text-zinc-100 sm:text-xl">
          {t("entityTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">{t("entityBody")}</p>
      </section>

      <MarqueeStrip />

      <section id="faq" className="mt-10 scroll-mt-24 sm:mt-12" aria-labelledby="home-faq-heading">
        <h2 id="home-faq-heading" className="font-display text-lg font-medium text-zinc-100 sm:text-xl">
          {t("faqTitle")}
        </h2>
        <dl className="mt-6 max-w-3xl space-y-6 border-t border-poet-gold/10 pt-6">
          {faqPairs.map(([qk, ak]) => (
            <div key={qk}>
              <dt className="text-sm font-semibold text-zinc-200">{t(qk)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{t(ak)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="afisha" className="mt-12 scroll-mt-24 space-y-6 sm:scroll-mt-28">
        {list.length ? (
          <>
            <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-500">{t("sectionLabel")}</p>
            <HomeEventsGrid events={list} />
          </>
        ) : (
          <p className="text-zinc-500">{t("empty")}</p>
        )}
      </section>
    </div>
  );
}
