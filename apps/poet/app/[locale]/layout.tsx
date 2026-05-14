import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { PoetDocumentLangSync } from "@/components/PoetDocumentLangSync";
import { PoetFooter } from "@/components/PoetFooter";
import { PoetHeader } from "@/components/PoetHeader";
import { routing, type AppLocale } from "@/i18n/routing";

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
  return {
    title: { default: t("titleDefault"), template: t("titleTemplate") },
    description: t("description"),
    applicationName: "Popular Poet",
    openGraph: { siteName: "Popular Poet", type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <PoetDocumentLangSync />
      <PoetHeader />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <PoetFooter />
    </NextIntlClientProvider>
  );
}
