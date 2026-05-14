import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";
import type { AppLocale } from "@/i18n/routing";
import { PoetLocaleSwitcher } from "@/components/PoetLocaleSwitcher";

const navLinkClass =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright min-h-9 sm:min-h-10 sm:rounded-xl sm:px-3 sm:text-sm";

export async function PoetHeader() {
  const tickets = getTicketsSiteBase();
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Poet");

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-poet-gold/15 bg-poet-bg/80 pt-[max(0px,env(safe-area-inset-top,0px))] backdrop-blur-md supports-[backdrop-filter]:bg-poet-bg/75">
      <div className="poet-safe-x mx-auto flex max-w-5xl flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:max-w-[min(100%,22rem)] sm:justify-start sm:gap-3">
          <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2 no-underline text-inherit sm:flex-initial sm:gap-2.5">
            <div className="relative h-8 w-8 shrink-0 sm:h-10 sm:w-10 md:h-11 md:w-11">
              <div className="animate-float-slow absolute inset-0">
                <Image
                  src="/brand/popular-poet-logo.png"
                  alt={t("logoAlt")}
                  fill
                  className="object-contain drop-shadow-[0_0_14px_rgba(197,160,89,0.45)]"
                  sizes="(max-width:640px) 32px, 40px"
                  priority
                />
              </div>
            </div>
            <div className="min-w-0 leading-tight">
              <span className="font-display block truncate text-sm tracking-wide text-gradient-gold sm:text-base md:text-lg">
                Popular Poet
              </span>
              <span className="block text-[8px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:text-[10px] sm:tracking-[0.28em]">
                {t("tagline")}
              </span>
            </div>
          </Link>
          <div className="shrink-0 sm:hidden">
            <PoetLocaleSwitcher compact />
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:justify-end">
          <nav
            className="flex min-h-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-hidden py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-initial sm:flex-wrap sm:gap-1 sm:overflow-visible sm:py-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Main"
          >
            <Link href="/#kursy" className={navLinkClass}>
              {t("navCourses")}
            </Link>
            <Link href="/#schedule" className={navLinkClass}>
              {t("navTrials")}
            </Link>
            {tickets ? (
              <>
                <a
                  href={ticketsHome(locale)}
                  title={t("navTicketsTitle")}
                  className={`${navLinkClass} max-w-[9.5rem] truncate sm:max-w-none`}
                >
                  {t("navTickets")}
                </a>
              </>
            ) : (
              <span className="shrink-0 px-2 text-[10px] leading-tight text-amber-200/80 sm:text-[11px]">{t("envMissing")}</span>
            )}
          </nav>
          <div className="hidden shrink-0 sm:block">
            <PoetLocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
