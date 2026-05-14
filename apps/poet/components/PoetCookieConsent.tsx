"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ticketsPrivacyPolicy } from "@/lib/ticketsSite";
import type { AppLocale } from "@/i18n/routing";

const STORAGE_KEY = "poet_cookie_consent_v1";

type ConsentValue = "essential" | "all";

function readStored(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "essential" || raw === "all") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStored(v: ConsentValue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

export function PoetCookieConsent() {
  const t = useTranslations("CookieConsent");
  const locale = useLocale() as AppLocale;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readStored() === null);
  }, []);

  if (!visible) return null;

  const privacyHref = ticketsPrivacyPolicy(locale);

  const dismiss = (v: ConsentValue) => {
    writeStored(v);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("ariaLabel")}
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-poet-gold/20 bg-poet-bg/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-poet-bg/90"
    >
      <div className="poet-safe-x mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="min-w-0 text-xs leading-relaxed text-zinc-400 sm:text-sm">
          {t.rich("body", {
            privacy: (chunks) =>
              privacyHref !== "#" ? (
                <a
                  href={privacyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-poet-gold underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold-bright"
                >
                  {chunks}
                </a>
              ) : (
                <span className="text-zinc-300">{chunks}</span>
              ),
          })}
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => dismiss("essential")}
            className="rounded-full border border-zinc-600/80 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white sm:px-4 sm:text-sm"
          >
            {t("essentialOnly")}
          </button>
          <button
            type="button"
            onClick={() => dismiss("all")}
            className="rounded-full border border-poet-gold/40 bg-poet-gold/10 px-3 py-2 text-xs font-medium text-poet-gold-bright transition hover:border-poet-gold/60 hover:bg-poet-gold/15 sm:px-4 sm:text-sm"
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
