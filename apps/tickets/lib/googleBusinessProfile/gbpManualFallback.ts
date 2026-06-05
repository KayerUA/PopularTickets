import { DateTime } from "luxon";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";

export type GbpManualPostInput = {
  title: string;
  description: string;
  startsAtIso: string;
  ticketUrl: string;
  imageUrl?: string | null;
  venue?: string;
  pricePln?: number;
};

export type GbpManualPost = {
  title: string;
  summary: string;
  startsAtLabel: string;
  ticketUrl: string;
  imageUrl?: string;
  panelUrl: string;
  venue?: string;
  pricePln?: string;
};

function gbpPanelUrl(): string {
  const custom = process.env.GOOGLE_GBP_MANUAL_PANEL_URL?.trim();
  return custom || "https://business.google.com/";
}

function summaryText(title: string, description: string): string {
  const base = `${title.trim()}. ${description.replace(/\s+/g, " ").trim()}`.trim();
  return base.slice(0, 1500);
}

function formatStartsAtWarsaw(startsAtIso: string): string {
  const dt = DateTime.fromISO(startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
  return dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : startsAtIso;
}

export function isGbpManualFallbackEnabled(): boolean {
  return process.env.GOOGLE_GBP_MANUAL_FALLBACK !== "0";
}

export function buildGbpManualPost(input: GbpManualPostInput): GbpManualPost {
  const imageUrl = input.imageUrl?.trim();
  return {
    title: input.title.trim(),
    summary: summaryText(input.title, input.description),
    startsAtLabel: formatStartsAtWarsaw(input.startsAtIso),
    ticketUrl: input.ticketUrl.trim(),
    panelUrl: gbpPanelUrl(),
    venue: input.venue?.trim() || undefined,
    pricePln: input.pricePln != null ? `${input.pricePln} PLN` : undefined,
    ...(imageUrl?.startsWith("https://") ? { imageUrl } : {}),
  };
}

/** Готовый текст для копирования в GBP UI (пока API quota = 0). */
export function formatGbpManualTelegramMessage(post: GbpManualPost): string {
  const lines = [
    "📋 Google Business — вручную (пока нет API-доступа)",
    "",
    `1. Откройте: ${post.panelUrl}`,
    "2. Ваша локация → Добавить → Событие",
    "",
    `📌 Название:\n${post.title}`,
    "",
    `📅 Дата и время (Warsaw):\n${post.startsAtLabel}`,
  ];

  if (post.venue) lines.push("", `📍 Место:\n${post.venue}`);
  if (post.pricePln) lines.push("", `💰 Цена:\n${post.pricePln}`);

  lines.push("", `📝 Текст (вставьте в описание):\n${post.summary}`);
  lines.push("", "🔗 Кнопка: Забронировать / Купить билет");
  lines.push(`   ${post.ticketUrl}`);

  if (post.imageUrl) {
    lines.push("", `🖼 Фото (URL — скачайте или откройте):\n${post.imageUrl}`);
  } else {
    lines.push("", "🖼 Фото: возьмите обложку со страницы билетов");
  }

  return lines.join("\n");
}
