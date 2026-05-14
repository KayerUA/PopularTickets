"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { stripLocalePrefixSegments } from "@/lib/localePath";

export function PoetLocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as AppLocale;
  const pathname = stripLocalePrefixSegments(usePathname() ?? "/");
  const router = useRouter();

  return (
    <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
      <div
        className="inline-flex rounded-full border border-poet-gold/20 p-0.5"
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
            className={`min-h-10 min-w-[2.75rem] rounded-full px-3 py-2 text-[0.8125rem] font-semibold uppercase tracking-wide transition active:scale-[0.98] sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1 sm:text-xs ${
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
