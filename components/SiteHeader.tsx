"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 shrink-0 border-b border-poet-gold/15 bg-poet-bg/80 pt-[max(0px,env(safe-area-inset-top,0px))] backdrop-blur-md supports-[backdrop-filter]:bg-poet-bg/75"
    >
      <div className="poet-safe-x mx-auto flex max-w-5xl flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link
          href="/"
          className="group flex min-w-0 max-w-[min(100%,20rem)] items-center gap-2.5 no-underline text-inherit sm:gap-3"
        >
          <motion.div
            className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11"
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
                sizes="44px"
                priority
              />
            </div>
          </motion.div>
          <div className="min-w-0 leading-tight">
            <span className="font-display block truncate text-base tracking-wide text-gradient-gold sm:text-lg">
              PopularTickets
            </span>
            <span className="block text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-500 sm:text-[10px] sm:tracking-[0.28em]">
              Popular Poet
            </span>
          </div>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:justify-end">
          <nav className="flex flex-1 flex-wrap items-center gap-1 sm:flex-none sm:gap-1">
            <Link
              href="/"
              className="inline-flex min-h-11 min-w-[2.75rem] flex-1 items-center justify-center rounded-xl px-3 text-sm text-zinc-400 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright sm:flex-none sm:min-w-0 sm:justify-start"
            >
              {t("events")}
            </Link>
            <Link
              href="/firma"
              className="inline-flex min-h-11 min-w-[2.75rem] flex-1 items-center justify-center rounded-xl px-3 text-sm text-zinc-400 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright sm:flex-none sm:min-w-0 sm:justify-start"
            >
              {t("company")}
            </Link>
          </nav>
          <LocaleSwitcher />
        </div>
      </div>
    </motion.header>
  );
}
