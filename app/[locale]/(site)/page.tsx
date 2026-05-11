import { getServiceSupabase } from "@/lib/supabase/admin";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import { MarqueeStrip } from "@/components/MarqueeStrip";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import type { EventCardProps } from "@/components/EventCard";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    openGraph: { siteName: "PopularTickets" },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" locale={locale} />;
  }
  const { data: events, error } = await supabase
    .from("events")
    .select("slug,title,venue,starts_at,price_grosze,image_url")
    .eq("is_published", true)
    .order("starts_at", { ascending: true });

  if (error) {
    return (
      <div className="poet-safe-x mx-auto max-w-5xl py-12 text-red-400 sm:py-16">
        {t("loadError")}
      </div>
    );
  }

  const list: EventCardProps[] =
    events?.map((ev) => ({
      slug: ev.slug,
      title: ev.title,
      venue: ev.venue,
      startsAt: ev.starts_at,
      priceGrosze: ev.price_grosze,
      imageUrl: ev.image_url,
      locale,
    })) ?? [];

  return (
    <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-16">
      <div className="animate-fade-up mb-10 max-w-2xl sm:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-poet-gold/80 sm:text-xs sm:tracking-[0.35em]">
          {t("brand")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:mt-3 sm:text-5xl">
          <span className="text-gradient-gold">{t("title")}</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-400 sm:mt-4 sm:text-lg">{t("subtitle")}</p>
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
