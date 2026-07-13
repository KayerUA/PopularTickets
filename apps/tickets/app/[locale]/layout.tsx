import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { CookieConsent } from "@/components/CookieConsent";
import { DocumentLangSync } from "@/components/DocumentLangSync";
import { routing, type AppLocale } from "@/i18n/routing";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
      <DocumentLangSync />
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>
      {children}
      <CookieConsent />
    </NextIntlClientProvider>
  );
}
