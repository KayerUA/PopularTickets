"use client";

/** Meta Pixel + GA4 e-commerce helpers. Events fire only after the pixel/GA is loaded (consent "all"). */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
  }
}

export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim() || "3861412620678655";

const UTM_KEY = "pt_utm_v1";
const UTM_TTL_MS = 30 * 24 * 3600 * 1000;
export const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type ProductType = "ticket" | "course";

/** Saves UTM params from the current URL (last non-empty touch, 30 days). */
export function captureUtmFromUrl(): void {
  if (typeof window === "undefined") return;
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

export function readStoredUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(UTM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { ts: number; utm: Record<string, string> };
    if (!parsed?.ts || Date.now() - parsed.ts > UTM_TTL_MS) return {};
    return parsed.utm ?? {};
  } catch {
    return {};
  }
}

function fbq(...args: unknown[]): boolean {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  window.fbq(...args);
  return true;
}

function gtagEvent(name: string, params: Record<string, unknown>): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag("event", name, params);
}

type Item = { slug: string; name?: string; valuePln: number; productType: ProductType; quantity?: number };

export function trackViewContent(i: Item): void {
  fbq("track", "ViewContent", {
    content_ids: [i.slug],
    content_name: i.name,
    content_type: "product",
    value: i.valuePln,
    currency: "PLN",
    product_type: i.productType,
    slug: i.slug,
  });
  gtagEvent("view_item", {
    currency: "PLN",
    value: i.valuePln,
    items: [{ item_id: i.slug, item_name: i.name, item_category: i.productType, price: i.valuePln, quantity: 1 }],
  });
}

export function trackInitiateCheckout(i: Item): void {
  const qty = i.quantity ?? 1;
  fbq("track", "InitiateCheckout", {
    content_ids: [i.slug],
    content_type: "product",
    value: i.valuePln * qty,
    currency: "PLN",
    num_items: qty,
    product_type: i.productType,
    slug: i.slug,
    ...readStoredUtm(),
  });
  gtagEvent("begin_checkout", {
    currency: "PLN",
    value: i.valuePln * qty,
    items: [{ item_id: i.slug, item_category: i.productType, price: i.valuePln, quantity: qty }],
  });
}

const SENT_KEY = "pt_purchase_sent_v1";

/** Fires Purchase once per order id. Returns false if the pixel was not ready (will retry on next call). */
export function trackPurchaseOnce(p: Item & { orderId: string; totalPln: number }): boolean {
  if (typeof window === "undefined") return false;
  let sent: string[] = [];
  try {
    sent = JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "[]") as string[];
  } catch {
    sent = [];
  }
  if (sent.includes(p.orderId)) return true;
  const utm = readStoredUtm();
  const ok = fbq(
    "track",
    "Purchase",
    {
      content_ids: [p.slug],
      content_name: p.name,
      content_type: "product",
      value: p.totalPln,
      currency: "PLN",
      num_items: p.quantity ?? 1,
      product_type: p.productType,
      slug: p.slug,
      order_id: p.orderId,
      ...utm,
    },
    { eventID: `purchase_${p.orderId}` }
  );
  if (!ok) return false;
  gtagEvent("purchase", {
    transaction_id: p.orderId,
    currency: "PLN",
    value: p.totalPln,
    product_type: p.productType,
    ...utm,
    items: [{ item_id: p.slug, item_name: p.name, item_category: p.productType, price: p.valuePln, quantity: p.quantity ?? 1 }],
  });
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify([...sent, p.orderId].slice(-50)));
  } catch {
    /* ignore */
  }
  return true;
}
