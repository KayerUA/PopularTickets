import { getLocale, getTranslations } from "next-intl/server";
import { THEATRE_INSTAGRAM_URL, THEATRE_TELEGRAM_URL, THEATRE_YOUTUBE_URL } from "@/lib/social";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";
import type { AppLocale } from "@/i18n/routing";

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

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.95 4.54c.16-.63-.48-1.15-1.06-.94L2.5 10.28c-.58.23-.51 1.08.1 1.2l4.98 1 2.12 6.93c.13.42.74.53 1.03.18l2.87-3.7 4.47 3.27c.4.3.97.05 1.06-.45l2.82-13.17ZM17.28 7.2 9.32 13.4l-.22 3.45-1.2-3.92 9.38-5.73Z"
      />
    </svg>
  );
}

const socialLinkClass =
  "group inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-poet-gold/[0.08] text-poet-gold-bright transition hover:bg-poet-gold/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-poet-gold/45 sm:h-auto sm:min-w-[10.75rem] sm:w-auto sm:inline-flex sm:flex-row sm:items-center sm:justify-start sm:gap-2.5 sm:rounded-xl sm:bg-poet-gold/[0.05] sm:px-3.5 sm:py-2.5 sm:hover:bg-poet-gold/[0.09]";

export async function PoetFooter() {
  const tickets = getTicketsSiteBase();
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Poet");

  return (
    <footer className="relative z-0 border-t border-poet-gold/15 bg-poet-bg/90">
      <div className="poet-safe-x mx-auto max-w-5xl py-10 sm:py-12">
        <section className="mb-10 sm:mb-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="min-w-0 max-w-xl">
              <h2 className="font-display text-sm font-semibold tracking-tight text-gradient-gold sm:text-base">{t("footerSocialTitle")}</h2>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">{t("footerSocialIntro")}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:min-w-0 sm:shrink-0 sm:justify-end sm:gap-2.5">
              <a
                href={THEATRE_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("footerInstagramLabel")} @popular_poet_theatre`}
                className={socialLinkClass}
              >
                <InstagramGlyph className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                <span className="hidden min-w-0 flex-col text-left sm:flex">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-poet-gold/90">{t("footerInstagramLabel")}</span>
                  <span className="break-words text-[11px] font-medium leading-snug text-zinc-200">@popular_poet_theatre</span>
                </span>
                <span aria-hidden className="hidden text-[10px] text-poet-gold/60 group-hover:text-poet-gold-bright sm:ml-auto sm:inline">
                  ↗
                </span>
              </a>
              <a
                href={THEATRE_YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("footerYoutubeLabel")} Popular Poet`}
                className={socialLinkClass}
              >
                <YouTubeGlyph className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                <span className="hidden min-w-0 flex-col text-left sm:flex">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-poet-gold/90">{t("footerYoutubeLabel")}</span>
                  <span className="break-words text-[11px] font-medium leading-snug text-zinc-200">Popular Poet</span>
                </span>
                <span aria-hidden className="hidden text-[10px] text-poet-gold/60 group-hover:text-poet-gold-bright sm:ml-auto sm:inline">
                  ↗
                </span>
              </a>
              <a
                href={THEATRE_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("footerTelegramLabel")}: ${t("footerTelegramCommunity")}`}
                className={socialLinkClass}
              >
                <TelegramGlyph className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                <span className="hidden min-w-0 flex-col text-left sm:flex">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-poet-gold/90">{t("footerTelegramLabel")}</span>
                  <span className="break-words text-[11px] font-medium leading-snug text-zinc-200">{t("footerTelegramCommunity")}</span>
                </span>
                <span aria-hidden className="hidden text-[10px] text-poet-gold/60 group-hover:text-poet-gold-bright sm:ml-auto sm:inline">
                  ↗
                </span>
              </a>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-6 border-t border-poet-gold/10 pt-8 text-xs text-zinc-500 sm:flex-row sm:justify-between sm:gap-10">
          <div className="max-w-xl space-y-2">
            <p className="font-display text-base text-gradient-gold">{t("footerSpaceTitle")}</p>
            <p className="leading-relaxed text-zinc-400">
              {t("footerAddressLine1")}
              <br />
              {t("footerAddressLine2")}
            </p>
            {tickets ? (
              <p>
                <a href={ticketsHome(locale)} className="text-poet-gold/90 hover:text-poet-gold-bright">
                  {t("footerTicketsLink")}
                </a>
                {" · "}
                <a href={`${tickets}/${locale}/firma`} className="text-poet-gold/90 hover:text-poet-gold-bright">
                  {t("footerCompanyLink")}
                </a>
              </p>
            ) : (
              <p className="text-zinc-500">{t("footerEnvMissing")}</p>
            )}
          </div>
          <p className="text-[11px] text-zinc-600 sm:text-right sm:shrink-0">{t("footerTagline")}</p>
        </div>
      </div>
    </footer>
  );
}
