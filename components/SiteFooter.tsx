import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Link as IntlLink } from "@/i18n/navigation";
import { COMPANY, companyAddressOneLine } from "@/lib/company";
import { THEATRE_INSTAGRAM_URL, THEATRE_YOUTUBE_URL } from "@/lib/social";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="relative z-0 border-t border-poet-gold/15 bg-poet-bg/90">
      <div className="poet-safe-x mx-auto max-w-5xl py-10 text-xs text-zinc-500 sm:py-12">
        <section
          className="mb-10 rounded-2xl border border-poet-gold/20 bg-poet-surface/35 px-4 py-5 shadow-[inset_0_1px_0_0_rgba(197,160,89,0.08)] sm:px-6 sm:py-6"
          aria-labelledby="footer-social-heading"
        >
          <h2 id="footer-social-heading" className="font-display text-base text-gradient-gold sm:text-lg">
            {t("socialTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{t("socialLead")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <a
              href={THEATRE_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-poet-gold/35 bg-poet-gold/10 px-5 py-2.5 text-center text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/55 hover:bg-poet-gold/15 sm:min-h-0 sm:py-2"
            >
              {t("instagramCta")}
            </a>
            <a
              href={THEATRE_YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-poet-gold/35 bg-poet-gold/10 px-5 py-2.5 text-center text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/55 hover:bg-poet-gold/15 sm:min-h-0 sm:py-2"
            >
              {t("youtubeCta")}
            </a>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500">{t("youtubeBlurb")}</p>
        </section>

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
            <IntlLink
              href="/firma"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-poet-gold/25 px-4 py-2.5 text-center text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/5 sm:w-auto sm:min-h-0 sm:py-2"
            >
              {t("ctaDetails")}
            </IntlLink>
            <Link
              href="/admin/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-600/80 px-4 py-2.5 text-center text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 sm:w-auto sm:min-h-0 sm:py-2"
            >
              {t("staffLogin")}
            </Link>
            <p className="text-[11px] text-zinc-600 sm:text-right">{t("tagline")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
