import type { SupabaseClient } from "@supabase/supabase-js";
import {
  broadcastAudienceLabel,
  resolveBroadcastTargetIds,
  type BroadcastAudience,
} from "@/lib/telegram/broadcastChatStore";
import { copyTelegramMessages } from "@/lib/telegram/telegramBotApi";

export type BroadcastPostResult = {
  sent: number;
  failed: number;
  chats: number;
};

export function describeBroadcastPostPreview(messageIds: number[], bodyPreview?: string): string {
  const count = messageIds.length;
  const kind =
    count > 1 ? `альбом (${count} сообщ.)` : bodyPreview?.trim() ? "текст/медиа с подписью" : "сообщение";
  const excerpt = bodyPreview?.trim()
    ? bodyPreview.trim().slice(0, 180) + (bodyPreview.trim().length > 180 ? "…" : "")
    : "";
  const lines = [
    "📢 Готово к рассылке",
    "",
    `Тип: ${kind}`,
  ];
  if (excerpt) lines.push("", excerpt);
  return lines.join("\n");
}

export async function broadcastPostToGroups(
  supabase: SupabaseClient,
  sourceChatId: number,
  messageIds: number[],
  audience: BroadcastAudience = "all",
): Promise<BroadcastPostResult> {
  const chatIds = await resolveBroadcastTargetIds(supabase, audience);
  if (!chatIds.length) {
    throw new Error("Нет групп для рассылки. Добавьте бота админом в группу или /subscribe в группе.");
  }
  if (!messageIds.length) throw new Error("Нет сообщения для рассылки");

  const sortedIds = [...new Set(messageIds)].sort((a, b) => a - b);
  let sent = 0;
  let failed = 0;

  for (const targetChatId of chatIds) {
    try {
      await copyTelegramMessages(targetChatId, sourceChatId, sortedIds);
      sent++;
    } catch (e) {
      failed++;
      console.error("[telegram post broadcast]", targetChatId, sortedIds, e);
    }
  }

  return { sent, failed, chats: chatIds.length };
}

export { broadcastAudienceLabel };
