import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalArticle } from "@/components/LegalArticle";
import { legalDocBlocks } from "@/lib/legalSections";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("zwrotyTitle"),
    description: t("zwrotyDescription"),
  };
}

export default async function ZwrotyPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const tBack = await getTranslations({ locale, namespace: "Legal" });
  const tb = await getTranslations({ locale, namespace: "LegalReturns" });
  const blocks = legalDocBlocks(tb, 7);

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
