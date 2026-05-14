"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { stripLocalePrefixSegments } from "@/lib/localePath";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as AppLocale;
  const pathname = stripLocalePrefixSegments(usePathname() ?? "/");
  const router = useRouter();

  const btnBase = compact
    ? "min-h-8 min-w-[2rem] rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide transition active:scale-[0.98]"
    : "min-h-9 min-w-[2.5rem] rounded-full px-2.5 py-1.5 text-[0.75rem] font-semibold uppercase tracking-wide transition active:scale-[0.98] sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1 sm:text-xs";

  return (
    <div className={`flex shrink-0 items-center text-zinc-500 ${compact ? "gap-1 text-[10px]" : "gap-2 text-xs"}`}>
      <div
        className={`inline-flex rounded-full border border-poet-gold/20 ${compact ? "p-px" : "p-0.5"}`}
        role="radiogroup"
        aria-label={t("label")}
      >
        {routing.locales.map((loc) => (
          <button
            key={loc}
            type="button"
            role="radio"
            aria-checked={loc === locale}
            onClick={() => router.replace(pathname, { locale: loc })}
            className={`${btnBase} ${
              loc === locale
                ? "bg-poet-gold/15 text-poet-gold-bright"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t(loc)}
          </button>
        ))}
      </div>
    </div>
  );
}
