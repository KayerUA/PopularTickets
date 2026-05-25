"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { formatPlnFromGrosze } from "@/lib/format";

const CHECKOUT_FORM_ID = "event-checkout-form";
const CHECKOUT_SECTION_ID = "event-checkout";

type Props = {
  priceGrosze: number;
  remaining: number;
  bypassPayment?: boolean;
  mapsHref?: string;
};

/**
 * Mobile/tablet sticky buy bar — portal to document.body.
 * visualViewport sync fixes iOS Safari jump when scrolling back up; hides near checkout form.
 */
export function EventMobileStickyCta({ priceGrosze, remaining, bypassPayment, mapsHref }: Props) {
  const t = useTranslations("CheckoutForm");
  const tEvent = useTranslations("EventPage");
  const [mounted, setMounted] = useState(false);
  const [checkoutInView, setCheckoutInView] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const bar = barRef.current;
    if (!bar) return;

    const syncViewport = () => {
      const vv = window.visualViewport;
      if (!vv) {
        bar.style.bottom = "0px";
        return;
      }
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      bar.style.bottom = `${gap}px`;
    };

    syncViewport();
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("scroll", syncViewport, { passive: true });
    window.addEventListener("orientationchange", syncViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("scroll", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const section = document.getElementById(CHECKOUT_SECTION_ID);
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCheckoutInView(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.12));
      },
      { threshold: [0, 0.12, 0.35, 0.6], rootMargin: "0px 0px -4rem 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [mounted]);

  const handleBuy = () => {
    const form = document.getElementById(CHECKOUT_FORM_ID) as HTMLFormElement | null;
    if (!form) {
      document.getElementById(CHECKOUT_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    document.getElementById(CHECKOUT_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    form.requestSubmit();
  };

  const bar = (
    <div
      ref={barRef}
      className={`event-mobile-sticky-cta fixed inset-x-0 bottom-0 z-[90] border-t border-poet-gold/30 bg-poet-bg shadow-[0_-8px_32px_rgba(0,0,0,0.45)] transition-[transform,opacity] duration-200 ease-out md:hidden ${
        checkoutInView ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
      role="region"
      aria-label={tEvent("stickyCtaAria")}
      aria-hidden={checkoutInView}
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
