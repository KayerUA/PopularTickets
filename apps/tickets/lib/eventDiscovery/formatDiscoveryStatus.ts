import type { EventDiscoveryResult } from "@/lib/eventDiscovery/notifyEventPublished";

/** Строки для ответа Telegram-бота после публикации. */
export function formatDiscoveryStatusForTelegram(result: EventDiscoveryResult | undefined): string {
  if (!result) return "";

  const lines: string[] = [];

  if (result.gbp === "created") {
    lines.push("📍 Google Business: событие создано");
    if (result.gbpSearchUrl) {
      lines.push(`   ${result.gbpSearchUrl}`);
    }
  } else if (result.gbp === "failed") {
    lines.push(`⚠️ Google Business: ${result.gbpError ?? "ошибка"}`);
  } else if (result.gbpError === "not_configured") {
    lines.push("ℹ️ Google Business: не настроен (GOOGLE_GBP_* в Vercel)");
  }

  if (result.indexNow === "ok") {
    lines.push("🔔 IndexNow: URL отправлен");
  } else if (result.indexNow === "failed") {
    lines.push("⚠️ IndexNow: не удалось отправить");
  }

  return lines.length ? `\n\n${lines.join("\n")}` : "";
}
