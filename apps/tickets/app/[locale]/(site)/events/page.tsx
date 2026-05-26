import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { fetchPublishedPerformanceCards } from "@/lib/fetchPublishedPerformanceCards";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { SupabaseQueryErrorPanel } from "@/components/SupabaseQueryErrorPanel";
import { buildPublicPageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EventsIndex" });
  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  const keywords = tMeta("homeKeywords")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return buildPublicPageMetadata({
    locale,
    path: "/events",
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords,
  });
}

export default async function EventsIndexPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EventsIndex" });

  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant={process.env.NODE_ENV === "production" ? "disconnected" : "setup"} locale={locale} />;
  }

  const { cards, error } = await fetchPublishedPerformanceCards(supabase, locale);
  if (error) {
    return <SupabaseQueryErrorPanel locale={locale} error={error} titleNamespace="EventsIndex" titleKey="loadError" />;
  }

  return (
    <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-16">
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
          <li className="text-zinc-300">{t("breadcrumbAfisha")}</li>
        </ol>
      </nav>

      <header className="animate-fade-up mb-10 overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/45 p-5 shadow-gold-sm backdrop-blur-sm sm:mb-12 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-poet-gold/80 sm:text-xs sm:tracking-[0.35em]">
          PopularTickets
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          <span className="text-gradient-gold">{t("title")}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">{t("subtitle")}</p>
      </header>

      <section className="space-y-6">
        {cards.length ? (
          <>
            <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-500">{t("sectionLabel")}</p>
            <HomeEventsGrid events={cards} />
          </>
        ) : (
          <p className="text-zinc-500">{t("empty")}</p>
        )}
      </section>
    </div>
  );
}
