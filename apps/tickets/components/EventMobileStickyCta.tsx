"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { formatPlnFromGrosze } from "@/lib/format";

const CHECKOUT_FORM_ID = "event-checkout-form";

type Props = {
  priceGrosze: number;
  remaining: number;
  bypassPayment?: boolean;
  mapsHref?: string;
};

/**
 * Mobile/tablet sticky buy bar — portal to document.body (escapes overflow/backdrop ancestors).
 */
export function EventMobileStickyCta({ priceGrosze, remaining, bypassPayment, mapsHref }: Props) {
  const t = useTranslations("CheckoutForm");
  const tEvent = useTranslations("EventPage");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBuy = () => {
    const form = document.getElementById(CHECKOUT_FORM_ID) as HTMLFormElement | null;
    if (!form) {
      document.getElementById("event-checkout")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    document.getElementById("event-checkout")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    form.requestSubmit();
  };

  const bar = (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-poet-gold/30 bg-poet-bg/95 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-poet-bg/90 md:hidden"
      role="region"
      aria-label={tEvent("stickyCtaAria")}
    >
      <div className="poet-safe-x mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{tEvent("priceLabel")}</p>
          <p className="text-lg font-semibold leading-tight text-poet-gold-bright">{formatPlnFromGrosze(priceGrosze)}</p>
          <p className="truncate text-[11px] text-zinc-500">{tEvent("remainingShort", { count: remaining })}</p>
        </div>
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 flex-col items-center justify-center rounded-xl border border-poet-gold/35 bg-zinc-900/85 px-2.5 py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-poet-gold-bright transition hover:border-poet-gold/55 hover:bg-poet-gold/10"
          >
            {tEvent("openInMapsShort")}
            <span aria-hidden className="mt-0.5 text-[10px] opacity-75">
              ↗
            </span>
          </a>
        ) : null}
        <button
          type="button"
          onClick={handleBuy}
          className="btn-poet btn-poet-theatre shrink-0 px-5 py-3.5 text-sm font-semibold tracking-wide"
        >
          {bypassPayment ? t("submitBypass") : t("submitShort")}
        </button>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}

export { CHECKOUT_FORM_ID };
