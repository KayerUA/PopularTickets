import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Link as IntlLink } from "@/i18n/navigation";
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
  const t = await getTranslations("Footer");

  return (
    <footer className="relative z-0 border-t border-poet-gold/15 bg-poet-bg/90">
      <div className="poet-safe-x mx-auto max-w-5xl py-10 text-xs text-zinc-500 sm:py-12">
        <section
          className="relative mb-10 overflow-hidden rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-poet-surface/50 via-poet-bg/40 to-poet-surface/30 px-4 py-5 shadow-[inset_0_1px_0_0_rgba(197,160,89,0.12),0_18px_48px_-24px_rgba(0,0,0,0.65)] sm:px-6 sm:py-7"
          aria-labelledby="footer-social-heading"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-poet-gold/55 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-24 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-poet-gold/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(105deg,transparent,transparent_12px,rgba(197,160,89,0.35)_12px,rgba(197,160,89,0.35)_13px)]"
            aria-hidden
          />
          <div className="relative">
            <h2 id="footer-social-heading" className="font-display text-base text-gradient-gold sm:text-lg">
              {t("socialTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{t("socialLead")}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <a
                href={THEATRE_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-11 items-center gap-3 rounded-2xl border border-poet-gold/30 bg-poet-gold/[0.07] px-4 py-3 text-left text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/12 hover:shadow-[0_0_0_1px_rgba(232,212,139,0.12)] sm:min-h-0 sm:px-5 sm:py-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-poet-gold/25 bg-poet-bg/60 text-poet-gold-bright transition group-hover:border-poet-gold/45 group-hover:text-poet-gold-bright">
                  <InstagramGlyph className="h-5 w-5" />
                </span>
                <span className="min-w-0 leading-snug">{t("instagramCta")}</span>
              </a>
              <a
                href={THEATRE_YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-11 items-center gap-3 rounded-2xl border border-poet-gold/30 bg-poet-gold/[0.07] px-4 py-3 text-left text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/12 hover:shadow-[0_0_0_1px_rgba(232,212,139,0.12)] sm:min-h-0 sm:px-5 sm:py-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-poet-gold/25 bg-poet-bg/60 text-poet-gold-bright transition group-hover:border-poet-gold/45 group-hover:text-poet-gold-bright">
                  <YouTubeGlyph className="h-5 w-5" />
                </span>
                <span className="min-w-0 leading-snug">{t("youtubeCta")}</span>
              </a>
            </div>
            <p className="mt-5 max-w-2xl border-t border-poet-gold/10 pt-4 text-sm leading-relaxed text-zinc-500">{t("youtubeBlurb")}</p>
          </div>
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
            <Link
              href="/check-in"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-600/80 px-4 py-2.5 text-center text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 sm:w-auto sm:min-h-0 sm:py-2"
            >
              {t("staffCheckin")}
            </Link>
            <p className="text-[11px] text-zinc-600 sm:text-right">{t("tagline")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
