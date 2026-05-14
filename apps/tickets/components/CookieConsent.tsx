"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type CookieConsentValue, readCookieConsent, writeCookieConsent } from "@/lib/cookieConsent";

export function CookieConsent() {
  const t = useTranslations("Cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() === null);
  }, []);

  const choose = (value: CookieConsentValue) => {
    writeCookieConsent(value);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: value }));
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 sm:p-4"
    >
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-poet-gold/30 bg-zinc-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-md sm:p-5">
        <h2 id="cookie-consent-title" className="font-display text-base font-semibold text-gradient-gold sm:text-lg">
          {t("title")}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">{t("body")}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          {t.rich("privacyLink", {
            link: (chunks) => (
              <Link href="/polityka-prywatnosci" className="text-poet-gold underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold-bright">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="min-h-10 rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            {t("essentialOnly")}
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="btn-poet poet-shine min-h-10 px-5 py-2 text-sm"
          >
            {t("acceptAll")}
          </button>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">{t("storageNote")}</p>
      </div>
    </div>
  );
}
