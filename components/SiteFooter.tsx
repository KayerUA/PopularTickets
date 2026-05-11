import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { COMPANY, companyAddressOneLine } from "@/lib/company";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="relative z-0 border-t border-poet-gold/15 bg-poet-bg/90">
      <div className="poet-safe-x mx-auto max-w-5xl py-10 text-xs text-zinc-500 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between sm:gap-10">
          <div className="max-w-xl space-y-3">
            <p className="font-display text-base text-gradient-gold">{COMPANY.productName}</p>
            <p className="leading-relaxed text-zinc-400">
              {t("operator")} <span className="text-zinc-300">{COMPANY.legalNameShort}</span>
            </p>
            <p className="break-words leading-relaxed text-zinc-400">
              NIP {COMPANY.nip} · KRS {COMPANY.krs} · REGON {COMPANY.regon}
            </p>
            <p className="break-words text-zinc-500">{companyAddressOneLine()}</p>
          </div>
          <div className="flex flex-col gap-4 text-sm text-zinc-400 sm:shrink-0 sm:items-end">
            <Link
              href="/firma"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-poet-gold/25 px-4 py-2.5 text-center text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/5 sm:w-auto sm:min-h-0 sm:py-2"
            >
              {t("ctaDetails")}
            </Link>
            <p className="text-[11px] text-zinc-600 sm:text-right">{t("tagline")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
