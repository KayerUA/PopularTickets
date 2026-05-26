import { routing, type AppLocale } from "@/i18n/routing";
import { canonicalPath } from "@/lib/seo";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import {
  getTelegramBotToken,
  getTelegramDiscoveryNotifyChatIds,
  isTelegramDiscoveryNotifyEnabled,
} from "@/lib/telegram/config";
import { sendTelegramMessage } from "@/lib/telegram/telegramBotApi";

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
};

function absoluteEventUrls(slug: string): string[] {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  if (!base) return [];
  return routing.locales.map((locale) => `${base}${canonicalPath(locale as AppLocale, `/events/${slug}`)}`);
}

function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatEventWhenWarsaw(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { timeZone: "Europe/Warsaw", dateStyle: "long", timeStyle: "short" });
}

/** IndexNow — быстрее для Bing/Yandex; Google по-прежнему опирается на sitemap + crawl. */
async function pingIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY?.trim();
  const host = process.env.INDEXNOW_HOST?.trim() || "www.populartickets.pl";
  if (!key || urls.length === 0) return;

  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: urls.slice(0, 10_000),
      }),
    });
  } catch (e) {
    console.warn("[eventDiscovery] IndexNow failed:", e);
  }
}

/** Webhook для Make/Zapier/n8n → Google Business Profile «Событие», соцсети и т.д. */
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
          ticket_url: urls[0] ?? `${base}/ru/events/${payload.slug}`,
          ticket_urls: urls,
        },
        gbp_hint: {
          topicType: "EVENT",
          title: payload.title,
          startDate: payload.starts_at,
          callToAction: { actionType: "BOOK", url: urls[0] },
        },
      }),
    });
  } catch (e) {
    console.warn("[eventDiscovery] webhook failed:", e);
  }
}

/** Telegram — напоминание админам + ссылки (без Make/Zapier). */
async function notifyTelegramDiscovery(payload: EventDiscoveryPayload, urls: string[]): Promise<void> {
  if (!isTelegramDiscoveryNotifyEnabled() || !getTelegramBotToken()) return;

  const chatIds = getTelegramDiscoveryNotifyChatIds();
  if (!chatIds.length) return;

  const ticketUrl = urls.find((u) => u.includes("/ru/events/")) ?? urls[0];
  if (!ticketUrl) return;

  const pricePln = (payload.price_grosze / 100).toFixed(2);
  const lines = [
    "🎭 <b>Опубликовано на PopularTickets</b>",
    "",
    `<b>${escapeTelegramHtml(payload.title)}</b>`,
    `📅 ${escapeTelegramHtml(formatEventWhenWarsaw(payload.starts_at))}`,
    `📍 ${escapeTelegramHtml(payload.venue)}`,
    `💰 ${pricePln} PLN`,
    payload.maps_url ? `<a href="${payload.maps_url}">Google Maps</a>` : "",
    "",
    `<a href="${ticketUrl}">Страница билетов</a>`,
    "",
    "💡 Добавьте «Событие» в Google Business Profile (Teatr Popular Poet), если ещё не сделано.",
    "🔍 Google Search подхватит Event schema + sitemap автоматически.",
  ].filter(Boolean);

  await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        await sendTelegramMessage(chatId, lines.join("\n"), { parseMode: "HTML" });
      } catch (e) {
        console.warn("[eventDiscovery] telegram notify failed:", chatId, e);
      }
    }),
  );
}

/**
 * Вызывать после publish/update published-события (admin, telegram bot).
 * Не блокирует сохранение — ошибки только в лог.
 */
export async function notifyEventPublished(payload: EventDiscoveryPayload): Promise<void> {
  if (payload.visibility !== "published") return;

  const urls = absoluteEventUrls(payload.slug);
  await Promise.all([pingIndexNow(urls), postDiscoveryWebhook(payload, urls), notifyTelegramDiscovery(payload, urls)]);
}
