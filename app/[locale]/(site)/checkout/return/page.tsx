import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

export default async function CheckoutReturnPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CheckoutReturn" });

  return (
    <div className="poet-safe-x mx-auto max-w-lg py-16 text-center sm:py-24">
      <div className="animate-fade-up rounded-2xl border border-poet-gold/25 bg-poet-surface/50 px-5 py-10 shadow-gold-sm backdrop-blur-md sm:rounded-3xl sm:px-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-poet-gold/80">{t("brand")}</p>
        <h1 className="font-display mt-3 text-2xl font-semibold text-zinc-50 sm:mt-4 sm:text-3xl">
          <span className="text-gradient-gold">{t("title")}</span>
        </h1>
        <p className="mt-5 leading-relaxed text-zinc-400">{t("body")}</p>
      </div>
    </div>
  );
}
