import { sendTelegramMessage } from "@/lib/telegram/telegramBotApi";
import { getTelegramSaleNotifyChatIds } from "@/lib/telegram/config";
import { ratingText } from "@/lib/ratings/i18n";
import type { AppLocale } from "@/i18n/routing";

export async function notifyTelegramAboutEventRating(params: {
  eventTitle: string;
  score: number;
  comment: string | null;
  buyerEmail: string;
  locale: AppLocale;
}): Promise<void> {
  const chats = getTelegramSaleNotifyChatIds();
  if (!chats.size) return;
  const label = ratingText[params.locale].scores[params.score - 1] ?? String(params.score);
  const stars = "★".repeat(params.score) + "☆".repeat(Math.max(0, 5 - params.score));
  const lines = [
    "⭐ Оценка мероприятия",
    params.eventTitle,
    `${stars}  ${params.score}/5 — ${label}`,
    params.buyerEmail,
    params.comment?.trim() ? `«${params.comment.trim()}»` : null,
  ].filter(Boolean);
  const text = lines.join("\n");
  await Promise.all(
    [...chats].map(async (chatId) => {
      try {
        await sendTelegramMessage(chatId, text, { disableWebPagePreview: true });
      } catch (error) {
        console.error("[event rating] telegram", chatId, error);
      }
    }),
  );
}
