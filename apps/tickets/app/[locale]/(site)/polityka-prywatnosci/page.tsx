import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalArticle } from "@/components/LegalArticle";
import { legalDocBlocks } from "@/lib/legalSections";
import type { AppLocale } from "@/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return buildPublicPageMetadata({
    locale,
    path: "/polityka-prywatnosci",
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  });
}

export default async function PolitykaPrywatnosciPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const tBack = await getTranslations({ locale, namespace: "Legal" });
  const tb = await getTranslations({ locale, namespace: "LegalPrivacy" });
  const blocks = legalDocBlocks(tb, 8);

  return (
    <LegalArticle
      backLabel={tBack("backHome")}
      title={tb("title")}
      updatedLabel={tb("updated")}
      disclaimer={tb("disclaimer")}
      blocks={blocks}
    />
  );
}
