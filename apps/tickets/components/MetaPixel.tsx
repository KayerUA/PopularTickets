"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { readCookieConsent } from "@/lib/cookieConsent";
import { META_PIXEL_ID, captureUtmFromUrl } from "@/lib/metaPixel";
import { captureOrderAttribution } from "@/lib/orderAttribution";

export const META_PIXEL_READY_EVENT = "meta-pixel-ready";

/** Meta Pixel — ładowany tylko po zgodzie na wszystkie cookie (jak GA4). PageView także przy nawigacji SPA. */
export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);
  const firstView = useRef(true);

  useEffect(() => {
    const sync = () => setAllowed(readCookieConsent() === "all");
    sync();
    window.addEventListener("cookie-consent-changed", sync);
    return () => window.removeEventListener("cookie-consent-changed", sync);
  }, []);

  useEffect(() => {
    captureUtmFromUrl();
    captureOrderAttribution();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!allowed) return;
    if (firstView.current) {
      firstView.current = false; // initial PageView is sent by the init script
      return;
    }
    window.fbq?.("track", "PageView");
  }, [allowed, pathname, searchParams]);

  if (!allowed) return null;
  return (
    <Script id="meta-pixel-init" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');window.dispatchEvent(new Event('${"meta-pixel-ready"}'));`}
    </Script>
  );
}
