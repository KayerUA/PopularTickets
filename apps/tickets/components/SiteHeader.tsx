"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";
import type { AppLocale } from "@/i18n/routing";

const navLinkClass =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2 py-1.5 text-[0.7rem] leading-snug text-zinc-300 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright min-h-8 sm:min-h-10 sm:rounded-xl sm:px-3 sm:text-sm";

const navLinkGoldClass = `${navLinkClass} font-medium text-poet-gold/95 hover:text-poet-gold-bright`;

export function SiteHeader() {
  const t = useTranslations("Nav");
  const locale = useLocale() as AppLocale;
  const poetBase = POPULAR_POET_SITE_URL.replace(/\/+$/, "");
  const poetHomeUrl = `${poetBase}/${locale}`;

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 shrink-0 border-b border-poet-gold/15 bg-poet-bg/80 pt-[max(0px,env(safe-area-inset-top,0px))] backdrop-blur-md supports-[backdrop-filter]:bg-poet-bg/75"
    >
      <div className="poet-safe-x mx-auto flex max-w-5xl flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:max-w-[min(100%,22rem)] sm:justify-start sm:gap-3">
          <Link
            href="/"
            className="group flex min-w-0 flex-1 items-center gap-2 no-underline text-inherit sm:flex-initial sm:gap-2.5"
          >
            <motion.div
              className="relative h-8 w-8 shrink-0 sm:h-10 sm:w-10 md:h-11 md:w-11"
              whileHover={{ scale: 1.06, rotate: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              <div className="animate-float-slow absolute inset-0">
                <Image
                  src="/brand/popular-poet-logo.png"
                  alt="Popular Poet"
                  fill
                  className="object-contain drop-shadow-[0_0_14px_rgba(197,160,89,0.45)]"
                  sizes="(max-width:640px) 32px, 40px"
                  priority
                />
              </div>
            </motion.div>
            <div className="min-w-0 leading-tight">
              <span className="font-display block truncate text-xs tracking-wide text-gradient-gold sm:text-base md:text-lg">
                PopularTickets
              </span>
              <span className="block text-[8px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:text-[10px] sm:tracking-[0.28em]">
                Popular Poet
              </span>
            </div>
          </Link>
          <div className="shrink-0 sm:hidden">
            <LocaleSwitcher compact />
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:justify-end">
          <nav
            className="flex min-h-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-hidden py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-initial sm:flex-wrap sm:gap-1 sm:overflow-visible sm:py-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Main"
          >
            <a
              href={poetHomeUrl}
              className={navLinkGoldClass}
              rel="noopener noreferrer"
              title={t("theatreAria")}
            >
              {t("theatre")}
            </a>
            <Link href="/#afisha" className={navLinkClass}>
              {t("events")}
            </Link>
            <Link href="/firma" className={navLinkClass}>
              {t("company")}
            </Link>
          </nav>
          <div className="hidden shrink-0 sm:block">
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
