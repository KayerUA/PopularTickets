import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TicketsFactsBody } from "@/components/TicketsFactsBody";
import type { AppLocale } from "@/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo";
import { ticketsFactsHreflangUrls } from "@/lib/ticketsFactsHreflang";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale === "uk") {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "TicketsFacts" });
  return buildPublicPageMetadata({
    locale,
    path: "/o-populartickets",
    title: t("metaTitle"),
    description: t("metaDescription"),
    hreflangAlternateUrls: ticketsFactsHreflangUrls(),
  });
}

export default async function OPopularTicketsPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  if (locale === "uk") {
    permanentRedirect("/uk/pro-populartickets");
  }
  return <TicketsFactsBody locale={locale} />;
}
