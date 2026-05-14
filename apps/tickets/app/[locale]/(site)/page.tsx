import { getServiceSupabase } from "@/lib/supabase/admin";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import { MarqueeStrip } from "@/components/MarqueeStrip";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { SupabaseQueryErrorPanel } from "@/components/SupabaseQueryErrorPanel";
import type { EventCardProps } from "@/components/EventCard";
import { resolveEventMarketingStatus, sortEventsForMarketing } from "@/lib/eventMarketingStatus";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { buildHomeJsonLd } from "@/lib/seo/eventJsonLd";

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
  const proofItems = [t("proofFast"), t("proofSecure"), t("proofLimited")];
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" locale={locale} />;
  }
  const { data: events, error } = await supabase
    .from("events")
    .select("id,slug,title,venue,starts_at,price_grosze,image_url,total_tickets,listing_kind")
    .eq("is_published", true)
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
        locale,
        status,
      };
    })
  );

  return (
    <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-16">
      <JsonLd data={buildHomeJsonLd(locale)} />
      <div className="animate-fade-up mb-10 overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/45 p-5 shadow-gold-sm backdrop-blur-sm sm:mb-12 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-poet-gold/80 sm:text-xs sm:tracking-[0.35em]">
          {t("brand")}
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:mt-3 sm:text-5xl">
          <span className="text-gradient-gold">{t("title")}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300 sm:mt-4 sm:text-lg">{t("subtitle")}</p>
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
      <MarqueeStrip />
      {list.length ? (
        <div className="space-y-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-500">{t("sectionLabel")}</p>
          <HomeEventsGrid events={list} />
        </div>
      ) : (
        <p className="text-zinc-500">{t("empty")}</p>
      )}
    </div>
  );
}
