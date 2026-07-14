import { getServiceSupabase } from "@/lib/supabase/admin";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import { MarqueeStrip } from "@/components/MarqueeStrip";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { SupabaseQueryErrorPanel } from "@/components/SupabaseQueryErrorPanel";
import { fetchPublishedPerformanceCards } from "@/lib/fetchPublishedPerformanceCards";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { buildHomeJsonLd, buildFaqPageJsonLd } from "@/lib/seo/eventJsonLd";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { NextModeChoiceWidget } from "@/components/NextModeChoiceWidget";

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
  const homeText = (key: string) => {
    if (bypass && key === "entityBody") return t("entityBodyBypass");
    if (bypass && key === "faqA5") return t("faqA5Bypass");
    return t(key);
  };
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
      acceptedAnswer: { text: homeText(ak) },
    }))
  );

  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant={process.env.NODE_ENV === "production" ? "disconnected" : "setup"} locale={locale} />;
  }

  const { cards: list, error } = await fetchPublishedPerformanceCards(supabase, locale);
  if (error) {
    return <SupabaseQueryErrorPanel locale={locale} error={error} titleNamespace="Home" titleKey="loadError" />;
  }

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

      <NextModeChoiceWidget
        eventHref={`/${locale}/special/next-mode-2026-08-15`}
        imageUrl="/og/next-mode-comedy-2026-08-15-v2.jpg"
      />

      <MarqueeStrip />

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

      <section id="faq" className="mt-14 scroll-mt-24 sm:mt-16" aria-labelledby="home-faq-heading">
        <h2 id="home-faq-heading" className="font-display text-lg font-medium text-zinc-100 sm:text-xl">
          {t("faqTitle")}
        </h2>
        <div className="mt-5 max-w-3xl divide-y divide-poet-gold/10 rounded-2xl border border-poet-gold/12 bg-poet-surface/15">
          {faqPairs.map(([qk, ak]) => (
            <details key={qk} className="group px-4 py-3 sm:px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-zinc-200 marker:hidden">
                <span>{t(qk)}</span>
                <span className="shrink-0 text-poet-gold/80 transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{homeText(ak)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
