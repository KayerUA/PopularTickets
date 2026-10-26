"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim() || "3861412620678655";
const CONSENT_KEY = "poet_cookie_consent_v1";
const UTM_KEY = "pt_utm_v1";
const UTM_TTL_MS = 30 * 24 * 3600 * 1000;
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function consentAll(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "all";
  } catch {
    return false;
  }
}

function captureUtm() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM_PARAMS) {
      const v = sp.get(k)?.trim();
      if (v) utm[k] = v.slice(0, 120);
    }
    if (Object.keys(utm).length) window.localStorage.setItem(UTM_KEY, JSON.stringify({ ts: Date.now(), utm }));
  } catch {
    /* ignore */
  }
}

function storedUtm(): Record<string, string> {
  try {
    const p = JSON.parse(window.localStorage.getItem(UTM_KEY) ?? "null") as { ts: number; utm: Record<string, string> } | null;
    if (!p || Date.now() - p.ts > UTM_TTL_MS) return {};
    return p.utm ?? {};
  } catch {
    return {};
  }
}

const ticketsHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_TICKETS_SITE_URL ?? "").host;
  } catch {
    return "";
  }
})();

/**
 * Meta Pixel (po zgodzie "all") + przekazywanie UTM z popularpoet do populartickets:
 * linki do kasy dostają zapisane utm_* (jeśli w linku ich nie ma). UTM nie są danymi osobowymi,
 * więc dokładamy je niezależnie od zgody.
 */
export function PoetMetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    const sync = () => setAllowed(consentAll());
    sync();
    window.addEventListener("cookie-consent-changed", sync);
    return () => window.removeEventListener("cookie-consent-changed", sync);
  }, []);

  useEffect(() => {
    captureUtm();
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href);
      } catch {
        return;
      }
      const isTickets = ticketsHost ? url.host === ticketsHost : /populartickets\./.test(url.host);
      if (!isTickets) return;
      const utm = storedUtm();
      const hasAny = UTM_PARAMS.some((k) => url.searchParams.has(k));
      if (hasAny) return;
      if (Object.keys(utm).length) {
        for (const [k, v] of Object.entries(utm)) url.searchParams.set(k, v);
      } else {
        url.searchParams.set("utm_source", "popularpoet");
        url.searchParams.set("utm_medium", "referral");
      }
      a.href = url.toString();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!allowed) return;
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [allowed, pathname, searchParams]);

  if (!allowed) return null;
  return (
    <Script id="meta-pixel-init" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');window.dispatchEvent(new Event('meta-pixel-ready'));`}
    </Script>
  );
}

/** ViewContent dla strony kursu. */
export function PoetMetaViewContent({ slug, name }: { slug: string; name?: string }) {
  useEffect(() => {
    const fire = () => {
      window.fbq?.("track", "ViewContent", {
        content_ids: [slug],
        content_name: name,
        content_type: "product",
        currency: "PLN",
        product_type: "course",
        slug,
      });
      window.gtag?.("event", "view_item", { items: [{ item_id: slug, item_name: name, item_category: "course" }] });
    };
    if (typeof window.fbq === "function") {
      fire();
      return;
    }
    window.addEventListener("meta-pixel-ready", fire, { once: true });
    return () => window.removeEventListener("meta-pixel-ready", fire);
  }, [slug, name]);
  return null;
}
