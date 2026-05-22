import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo";
import { getGiftProducts } from "@/lib/giftProducts";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { GiftCertificateForm } from "@/components/GiftCertificateForm";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return buildPublicPageMetadata({
    locale,
    path: "/podarok",
    title: t("giftTitle"),
    description: t("giftDescription"),
  });
}

export default async function GiftPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "GiftPage" });
  const products = getGiftProducts();

  return (
    <div className="poet-safe-x mx-auto max-w-3xl py-8 sm:py-12">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="inline-flex min-h-10 items-center rounded-lg py-1 text-poet-gold hover:text-poet-gold-bright">
          {t("backHome")}
        </Link>
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight sm:mt-6 sm:text-4xl">
        <span className="text-gradient-gold">{t("title")}</span>
      </h1>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-zinc-400">{t("intro")}</p>
      {POPULAR_POET_SITE_URL ? (
        <p className="mt-3 text-sm text-zinc-500">
          {t("theatreLinkPrefix")}{" "}
          <a
            href={POPULAR_POET_SITE_URL}
            className="text-poet-gold underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold-bright"
            target="_blank"
            rel="noopener noreferrer"
          >
            popularpoet.pl
          </a>
        </p>
      ) : null}
      <GiftCertificateForm locale={locale} products={products} bypassPayment={isCheckoutBypassPayment()} />
    </div>
  );
}
