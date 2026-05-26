import { routing, type AppLocale } from "@/i18n/routing";
import { canonicalPath } from "@/lib/seo";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { resolveAbsoluteAssetUrl } from "@/lib/safePublicUrl";
import { createGoogleBusinessProfileEventPost } from "@/lib/googleBusinessProfile/createEventPost";
import { isGoogleGbpConfigured } from "@/lib/googleBusinessProfile/config";

export type EventDiscoveryPayload = {
  slug: string;
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  price_grosze: number;
  listing_kind: string | null;
  maps_url: string | null;
  visibility: string;
  image_url?: string | null;
};

export type EventDiscoverySource = "telegram" | "admin";

export type EventDiscoveryResult = {
  indexNow: "ok" | "skipped" | "failed";
  gbp: "created" | "skipped" | "failed";
  gbpSearchUrl?: string;
  gbpError?: string;
};

function absoluteEventUrls(slug: string): string[] {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  if (!base) return [];
  return routing.locales.map((locale) => `${base}${canonicalPath(locale as AppLocale, `/events/${slug}`)}`);
}

function primaryTicketUrl(urls: string[]): string {
  return urls.find((u) => u.includes("/ru/events/")) ?? urls[0] ?? "";
}

async function pingIndexNow(urls: string[]): Promise<"ok" | "skipped" | "failed"> {
  const key = process.env.INDEXNOW_KEY?.trim();
  const host = process.env.INDEXNOW_HOST?.trim() || "www.populartickets.pl";
  if (!key || urls.length === 0) return "skipped";

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: urls.slice(0, 10_000),
      }),
    });
    return res.ok || res.status === 202 ? "ok" : "failed";
  } catch (e) {
    console.warn("[eventDiscovery] IndexNow failed:", e);
    return "failed";
  }
}

async function postDiscoveryWebhook(payload: EventDiscoveryPayload, urls: string[]): Promise<void> {
  const hook = process.env.EVENT_DISCOVERY_WEBHOOK_URL?.trim();
  if (!hook) return;

  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "";
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "populartickets",
        type: "event_published",
        at: new Date().toISOString(),
        event: {
          ...payload,
          price_pln: (payload.price_grosze / 100).toFixed(2),
          ticket_url: primaryTicketUrl(urls) || `${base}/ru/events/${payload.slug}`,
          ticket_urls: urls,
        },
      }),
    });
  } catch (e) {
    console.warn("[eventDiscovery] webhook failed:", e);
  }
}

async function publishToGoogleBusinessProfile(
  payload: EventDiscoveryPayload,
  ticketUrl: string,
): Promise<Pick<EventDiscoveryResult, "gbp" | "gbpSearchUrl" | "gbpError">> {
  if (!isGoogleGbpConfigured()) {
    return { gbp: "skipped", gbpError: "not_configured" };
  }

  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "";
  const imageAbs = resolveAbsoluteAssetUrl(payload.image_url, base);

  const result = await createGoogleBusinessProfileEventPost({
    title: payload.title,
    description: payload.description,
    startsAtIso: payload.starts_at,
    ticketUrl,
    imageUrl: imageAbs,
  });

  if (result.ok) {
    return { gbp: "created", gbpSearchUrl: result.searchUrl };
  }
  if (result.error === "not_configured") {
    return { gbp: "skipped", gbpError: result.error };
  }
  return { gbp: "failed", gbpError: result.error };
}

/**
 * После publish: сайт (JSON-LD/sitemap) уже есть; здесь — внешние каналы.
 * Telegram-бот: GBP + IndexNow; без дублирующих «напоминаний» в личку.
 */
export async function runEventDiscovery(
  payload: EventDiscoveryPayload,
  _opts?: { source?: EventDiscoverySource },
): Promise<EventDiscoveryResult> {
  if (payload.visibility !== "published") {
    return { indexNow: "skipped", gbp: "skipped" };
  }

  const urls = absoluteEventUrls(payload.slug);
  const ticketUrl = primaryTicketUrl(urls);
  if (!ticketUrl) {
    return { indexNow: "skipped", gbp: "skipped", gbpError: "no_ticket_url" };
  }

  const [indexNow, gbpPart] = await Promise.all([
    pingIndexNow(urls),
    publishToGoogleBusinessProfile(payload, ticketUrl),
    postDiscoveryWebhook(payload, urls),
  ]);

  return { indexNow, ...gbpPart };
}

/** @deprecated alias */
export const notifyEventPublished = runEventDiscovery;
