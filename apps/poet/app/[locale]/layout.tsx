import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { PoetDocumentLangSync } from "@/components/PoetDocumentLangSync";
import { PoetCookieConsent } from "@/components/PoetCookieConsent";
import { PoetMetaPixel } from "@/components/PoetMetaPixel";
import { Suspense } from "react";
import { PoetFooter } from "@/components/PoetFooter";
import { PoetHeader } from "@/components/PoetHeader";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildPoetPageMetadata } from "@/lib/seoPoet";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";
import { PoetJsonLd } from "@/components/PoetJsonLd";
import { buildPoetOrganizationLocalGraph } from "@/lib/poetJsonLd";
import { getTicketsSiteBase } from "@/lib/ticketsSite";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "metadata" });
  const keywords = t("keywords")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const base = getPoetSiteUrl();
  const ogImages =
    base && t("ogImagePath")
      ? [
          {
            url: `${base}${t("ogImagePath")}`,
            width: 1200,
            height: 630,
            alt: t("ogImageAlt"),
          },
        ]
      : undefined;

  return buildPoetPageMetadata({
    locale: locale as AppLocale,
    path: "/",
    title: t("titleDefault"),
    description: t("description"),
    keywords,
    ogImages,
  });
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const base = getPoetSiteUrl();

  return (
    <NextIntlClientProvider messages={messages}>
      {base ? <PoetJsonLd data={buildPoetOrganizationLocalGraph({ baseUrl: base, locale: locale as AppLocale, logoUrl: `${base}/brand/popular-poet-logo.png`, ticketsSiteUrl: getTicketsSiteBase() })} /> : null}
      <PoetDocumentLangSync />
      <PoetHeader />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <PoetFooter />
      <PoetCookieConsent />
      <Suspense fallback={null}>
        <PoetMetaPixel />
      </Suspense>
    </NextIntlClientProvider>
  );
}
