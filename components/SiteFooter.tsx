import { getTranslations } from "next-intl/server";
import { Link as IntlLink } from "@/i18n/navigation";
import { getRequestAppLocale } from "@/lib/requestLocale";
import { COMPANY, companyAddressOneLine } from "@/lib/company";
import { THEATRE_INSTAGRAM_URL, THEATRE_YOUTUBE_URL } from "@/lib/social";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
      />
    </svg>
  );
}

function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  );
}

export async function SiteFooter() {
  const locale = await getRequestAppLocale();
  const t = await getTranslations({ locale, namespace: "Footer" });

  return (
    <footer className="relative z-0 border-t border-poet-gold/15 bg-poet-bg/90">
      <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-12">
        <section
          aria-labelledby="footer-social-heading"
          className="mb-6 rounded-xl border border-poet-gold/35 bg-zinc-950/45 px-3.5 py-3 shadow-sm shadow-black/20 backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-3.5"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:max-w-[min(100%,28rem)]">
              <h2
                id="footer-social-heading"
                className="font-display text-sm font-semibold tracking-tight text-gradient-gold sm:text-base"
              >
                {t("socialHeading")}
              </h2>
              <p className="mt-1 text-[11px] leading-snug text-zinc-400 sm:text-xs sm:leading-relaxed">{t("socialIntro")}</p>
            </div>
            <div className="flex min-w-0 gap-2 sm:shrink-0">
              <a
                href={THEATRE_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("socialInstagramAria")}
                className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-poet-gold/50 bg-zinc-900/90 px-2.5 py-2 text-left shadow-sm shadow-black/30 transition hover:border-poet-gold/80 hover:bg-poet-gold/[0.08] sm:flex-initial sm:min-w-[10.5rem]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-poet-gold/40 bg-poet-gold/12 text-poet-gold-bright">
                  <InstagramGlyph className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-poet-gold-bright">Instagram</span>
                  <span className="block truncate text-[11px] font-medium text-zinc-100">{t("socialInstagramHandle")}</span>
                </span>
                <span aria-hidden className="shrink-0 text-[10px] text-poet-gold/80 group-hover:text-poet-gold-bright">
                  ↗
                </span>
              </a>
              <a
                href={THEATRE_YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("socialYoutubeAria")}
                className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-poet-gold/50 bg-zinc-900/90 px-2.5 py-2 text-left shadow-sm shadow-black/30 transition hover:border-poet-gold/80 hover:bg-poet-gold/[0.08] sm:flex-initial sm:min-w-[10.5rem]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-poet-gold/40 bg-poet-gold/12 text-poet-gold-bright">
                  <YouTubeGlyph className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-poet-gold-bright">YouTube</span>
                  <span className="block truncate text-[11px] font-medium text-zinc-100">{t("socialYoutubeHandle")}</span>
                </span>
                <span aria-hidden className="shrink-0 text-[10px] text-poet-gold/80 group-hover:text-poet-gold-bright">
                  ↗
                </span>
              </a>
            </div>
          </div>
          <p className="mt-2 border-t border-poet-gold/10 pt-2 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">{t("socialOutro")}</p>
        </section>

        <div className="flex flex-col gap-8 border-t border-poet-gold/15 pt-8 text-xs text-zinc-500 sm:flex-row sm:justify-between sm:gap-10">
          <div className="max-w-xl space-y-3">
            <p className="font-display text-base text-gradient-gold">{COMPANY.productName}</p>
            <p className="leading-relaxed text-zinc-400">
              {t("operator")} <span className="text-zinc-300">{COMPANY.legalNameShort}</span>
            </p>
            <p className="break-words leading-relaxed text-zinc-400">
              NIP {COMPANY.nip} · KRS {COMPANY.krs} · REGON {COMPANY.regon}
            </p>
            <p className="break-words text-zinc-500">{companyAddressOneLine()}</p>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-[13px] text-zinc-400">
              <IntlLink href="/regulamin" className="text-poet-gold/90 hover:text-poet-gold-bright">
                {t("linkTerms")}
              </IntlLink>
              <IntlLink href="/zwroty" className="text-poet-gold/90 hover:text-poet-gold-bright">
                {t("linkReturns")}
              </IntlLink>
              <IntlLink href="/polityka-prywatnosci" className="text-poet-gold/90 hover:text-poet-gold-bright">
                {t("linkPrivacy")}
              </IntlLink>
            </nav>
          </div>
          <div className="flex flex-col gap-4 text-sm text-zinc-400 sm:shrink-0 sm:items-end sm:text-xs">
            <IntlLink
              href="/firma"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-poet-gold/25 px-4 py-2.5 text-center text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/5 sm:w-auto sm:min-h-0 sm:py-2"
            >
              {t("ctaDetails")}
            </IntlLink>
            <p className="text-[11px] text-zinc-600 sm:text-right">{t("tagline")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
