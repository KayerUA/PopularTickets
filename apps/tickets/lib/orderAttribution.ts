export const ORDER_ATTRIBUTION_KEY = "pt_order_attribution_v1";
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type AttributionTouch = {
  captured_at: string;
  source: string;
  medium: string | null;
  landing_path: string;
  referrer: string | null;
  utm: Partial<Record<(typeof UTM_KEYS)[number], string>>;
  fbclid: string | null;
};

export type OrderAttribution = {
  version: 1;
  first_touch: AttributionTouch;
  last_non_direct_touch: AttributionTouch | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) || null;
}

function httpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 8192) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function landingPath(value: unknown): string {
  const path = text(value, 512)?.split(/[?#]/, 1)[0];
  if (!path?.startsWith("/") || path.startsWith("//")) return "/";
  // Receipt and rating paths can contain buyer access tokens.
  return path.replace(/(\/(?:rate|checkout|admin))(?:\/.*)?$/, "$1");
}

function source(utmSource: string | undefined, referrer: string | null, fbclid: string | null): string {
  if (utmSource) return utmSource.toLowerCase();
  const host = referrer ? httpUrl(referrer)?.hostname.replace(/^www\./, "") : null;
  if (host === "instagram.com" || host?.endsWith(".instagram.com")) return "instagram";
  if (host === "facebook.com" || host?.endsWith(".facebook.com")) return "facebook";
  if (host === "t.me" || host === "telegram.org" || host?.endsWith(".telegram.org")) return "telegram";
  if (host) return host;
  // A Meta click id alone does not identify Instagram or a paid campaign.
  return fbclid ? "meta" : "direct";
}

function sanitizeTouch(value: unknown, now: number): AttributionTouch | null {
  const raw = record(value);
  if (!raw || typeof raw.captured_at !== "string") return null;
  const timestamp = Date.parse(raw.captured_at);
  if (!Number.isFinite(timestamp) || timestamp > now + 300_000 || now - timestamp > ATTRIBUTION_TTL_MS) return null;
  const utm: AttributionTouch["utm"] = {};
  const rawUtm = record(raw.utm);
  for (const key of UTM_KEYS) {
    const v = text(rawUtm?.[key], 120);
    if (v) utm[key] = v;
  }
  const referrer = httpUrl(raw.referrer)?.origin ?? null;
  const fbclid = text(raw.fbclid, 512);
  const detectedSource = source(utm.utm_source, referrer, fbclid);
  return {
    captured_at: new Date(timestamp).toISOString(),
    source: detectedSource === "direct" && Object.keys(utm).length
      ? "unknown"
      : detectedSource,
    medium: utm.utm_medium ?? (referrer ? "referral" : null),
    landing_path: landingPath(raw.landing_path),
    referrer,
    utm,
    fbclid,
  };
}

export function parseOrderAttribution(value: unknown, now = Date.now()): OrderAttribution | null {
  try {
    if (typeof value !== "string" || value.length > 12_000) return null;
    const raw = record(JSON.parse(value));
    if (raw?.version !== 1) return null;
    const first = sanitizeTouch(raw.first_touch, now);
    if (!first) return null;
    const last = sanitizeTouch(raw.last_non_direct_touch, now);
    return {
      version: 1,
      first_touch: first,
      last_non_direct_touch: last && last.source !== "direct" && last.captured_at >= first.captured_at ? last : null,
    };
  } catch {
    return null;
  }
}

export function captureAttributionTouch(href: string, referringUrl: string, now = Date.now()): AttributionTouch | null {
  const url = httpUrl(href);
  if (!url) return null;
  if (/\/(?:checkout|seats|rate|admin|api)(?:\/|$)/.test(url.pathname)) return null;
  const referring = httpUrl(referringUrl);
  const paymentReferrer = referring?.hostname === "przelewy24.pl" || referring?.hostname.endsWith(".przelewy24.pl");
  const referrer = referring && referring.origin !== url.origin && !paymentReferrer ? referring.origin : null;
  const utm: AttributionTouch["utm"] = {};
  for (const key of UTM_KEYS) {
    const v = text(url.searchParams.get(key), 120);
    if (v) utm[key] = v;
  }
  return sanitizeTouch({ captured_at: new Date(now).toISOString(), landing_path: url.pathname, utm, referrer, fbclid: url.searchParams.get("fbclid") }, now);
}

export function updateOrderAttribution(previous: OrderAttribution | null, touch: AttributionTouch): OrderAttribution {
  return {
    version: 1,
    first_touch: previous?.first_touch ?? touch,
    last_non_direct_touch: touch.source === "direct" ? previous?.last_non_direct_touch ?? null : touch,
  };
}

let memory: OrderAttribution | null = null;
let lastHref: string | null = null;

export function captureOrderAttribution(): OrderAttribution | null {
  if (typeof window === "undefined") return null;
  let previous = memory ? parseOrderAttribution(JSON.stringify(memory)) : null;
  try {
    previous = parseOrderAttribution(window.localStorage.getItem(ORDER_ATTRIBUTION_KEY)) ?? previous;
  } catch { /* Storage can be disabled in private browsers. */ }
  const href = window.location.href;
  if (href === lastHref && previous) return previous;
  const touch = captureAttributionTouch(href, lastHref === null ? document.referrer : "");
  if (!touch) return previous;
  memory = updateOrderAttribution(previous, touch);
  lastHref = href;
  try {
    window.localStorage.setItem(ORDER_ATTRIBUTION_KEY, JSON.stringify(memory));
  } catch { /* The current document still keeps attribution in memory. */ }
  return memory;
}

export function attachOrderAttribution(formData: FormData): void {
  const attribution = captureOrderAttribution();
  if (attribution) formData.set("attribution", JSON.stringify(attribution));
}

export function preserveAttributionQuery(destination: string, params: Record<string, string | string[] | undefined>): string {
  const url = new URL(destination, "https://www.populartickets.pl");
  for (const key of [...UTM_KEYS, "fbclid"]) {
    const raw = params[key];
    const value = text(Array.isArray(raw) ? raw[0] : raw, key === "fbclid" ? 512 : 120);
    if (value) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
