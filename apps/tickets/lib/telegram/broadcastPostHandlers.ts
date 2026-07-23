import type { SupabaseClient } from "@supabase/supabase-js";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import {
  getMasterBroadcastChat,
  resolveBroadcastChatIds,
  type BroadcastAudience,
} from "@/lib/telegram/broadcastChatStore";
import {
  appendBroadcastAlbumPart,
  claimBroadcastAlbumBuffer,
  clearAwaitingBroadcastPost,
  createPendingBroadcastPost,
  isAwaitingBroadcastPost,
  setAwaitingBroadcastPost,
  takePendingBroadcastPost,
} from "@/lib/telegram/broadcastPostStore";
import {
  broadcastPostToGroups,
  broadcastTextToGroups,
  describeBroadcastPostPreview,
} from "@/lib/telegram/broadcastPostToGroups";
import { saveBroadcastRetry } from "@/lib/telegram/broadcastReportStore";
import { MEDIA_GROUP_DEBOUNCE_MS, sleepMs } from "@/lib/telegram/telegramMessageBuffer";
import { sendTelegramMessage, type InlineKeyboardButton } from "@/lib/telegram/telegramBotApi";

export type BroadcastSourceMessage = {
  message_id: number;
  text?: string;
  caption?: string;
  photo?: unknown[];
  document?: { mime_type?: string };
  video?: unknown;
  animation?: unknown;
  voice?: unknown;
  audio?: unknown;
  sticker?: unknown;
};

function messagePreviewText(msg: BroadcastSourceMessage): string {
  return [msg.text, msg.caption].filter(Boolean).join("\n\n").trim();
}

function hasBroadcastableContent(msg: BroadcastSourceMessage): boolean {
  return Boolean(
    msg.text ||
      msg.caption ||
      msg.photo?.length ||
      msg.document ||
      msg.video ||
      msg.animation ||
      msg.voice ||
      msg.audio ||
      msg.sticker,
  );
}

function confirmKeyboard(token: string, groups: number, masterTitle: string): InlineKeyboardButton[][] {
  return [
    [
      { text: `🌐 Во все группы (${groups})`, callback_data: `postcast:all:${token}` },
    ],
    [{ text: `⭐ ${masterTitle}`, callback_data: `postcast:master:${token}` }],
    [{ text: "🗂 Выбрать конкретную группу", callback_data: `postcastpickgrp:${token}:0` }],
    [{ text: "✖️ Отмена", callback_data: "postcast:cancel" }],
  ];
}

async function groupCountOrError(supabase: SupabaseClient): Promise<number> {
  const count = (await resolveBroadcastChatIds(supabase)).length;
  if (!count) {
    throw new Error("Нет подключённых групп. Добавьте бота админом в группу или /subscribe в группе.");
  }
  return count;
}

export async function offerBroadcastPostConfirm(
  chatId: number,
  userId: number,
  sourceChatId: number,
  messageIds: number[],
  bodyPreview?: string,
): Promise<void> {
  await clearAwaitingBroadcastPost(chatId);
  const supabase = requireServiceSupabase();
  const groups = await groupCountOrError(supabase);
  const master = await getMasterBroadcastChat(supabase);
  const pending = await createPendingBroadcastPost(userId, sourceChatId, messageIds);
  await sendTelegramMessage(
    chatId,
    `${describeBroadcastPostPreview(messageIds, bodyPreview)}\n\nКуда отправить?`,
    { inlineKeyboard: confirmKeyboard(pending.token, groups, master.title) },
  );
}

/** Предпросмотр AI-версии: она отправляется как обычный новый текст после явного выбора аудитории. */
export async function offerGeneratedBroadcastPost(
  chatId: number,
  userId: number,
  text: string,
): Promise<void> {
  await clearAwaitingBroadcastPost(chatId);
  const supabase = requireServiceSupabase();
  const groups = await groupCountOrError(supabase);
  const master = await getMasterBroadcastChat(supabase);
  const pending = await createPendingBroadcastPost(userId, chatId, [], text);
  await sendTelegramMessage(
    chatId,
    `✨ Вариант для рассылки:\n\n${text}\n\nКуда отправить?`,
    { inlineKeyboard: confirmKeyboard(pending.token, groups, master.title) },
  );
}

export async function startBroadcastPostFlow(chatId: number, userId: number): Promise<void> {
  await setAwaitingBroadcastPost(chatId, userId);
  await sendTelegramMessage(
    chatId,
    [
      "📢 Режим рассылки поста",
      "",
      "Пришлите сообщение для групп: текст, фото, видео или альбом.",
      "Можно ответить /broadcast на уже отправленное сообщение.",
      "",
      "/cancel — отменить",
    ].join("\n"),
  );
}

export async function handleBroadcastPostInput(
  chatId: number,
  userId: number,
  msg: BroadcastSourceMessage,
  mediaGroupId?: string,
): Promise<void> {
  if (!hasBroadcastableContent(msg) && !mediaGroupId) {
    await sendTelegramMessage(chatId, "Не вижу содержимого. Пришлите текст, фото или видео.");
    return;
  }

  if (mediaGroupId) {
    await appendBroadcastAlbumPart(chatId, userId, mediaGroupId, msg.message_id);
    await sleepMs(MEDIA_GROUP_DEBOUNCE_MS);
    let claimed = await claimBroadcastAlbumBuffer(chatId, mediaGroupId, MEDIA_GROUP_DEBOUNCE_MS - 400);
    if (!claimed) return;
    if (!claimed) return;
    await offerBroadcastPostConfirm(chatId, claimed.userId, chatId, claimed.messageIds);
    return;
  }

  await offerBroadcastPostConfirm(chatId, userId, chatId, [msg.message_id], messagePreviewText(msg));
}

export async function confirmBroadcastPost(
  chatId: number,
  userId: number,
  token: string,
  audience: BroadcastAudience,
  targetChatIds?: number[],
): Promise<{ sent: number; failed: number; chats: number; retryToken?: string | null }> {
  const pending = await takePendingBroadcastPost(token, userId);
  if (!pending) {
    await sendTelegramMessage(chatId, "Сессия рассылки устарела. Отправьте /broadcast заново.");
    return { sent: 0, failed: 0, chats: 0, retryToken: null };
  }
  const supabase = requireServiceSupabase();
  const result = pending.generatedText
    ? await broadcastTextToGroups(supabase, pending.generatedText, audience, targetChatIds)
    : await broadcastPostToGroups(supabase, pending.sourceChatId, pending.messageIds, audience, targetChatIds);
  const retryToken = await saveBroadcastRetry(userId, {
    kind: "post",
    audience,
    sourceChatId: pending.sourceChatId,
    messageIds: pending.messageIds,
    generatedText: pending.generatedText,
  }, result.failedChatIds);
  await sendTelegramMessage(
    chatId,
    `📢 Готово: пост разослан в ${result.sent} из ${result.chats} групп${result.failed ? `, ошибок: ${result.failed}` : ""}.`,
    retryToken
      ? { inlineKeyboard: [[{ text: `🔁 Повторить ошибки (${result.failed})`, callback_data: `retrycast:${retryToken}` }]] }
      : undefined,
  );
  return { ...result, retryToken };
}

export function isBroadcastPostCommand(text: string): boolean {
  return (
    text === "/broadcast" || text.startsWith("/broadcast ") ||
    text.startsWith("/broadcast@") ||
    text === "/post" || text.startsWith("/post ") ||
    text.startsWith("/post@")
  );
}

export function broadcastInstruction(text: string): string | undefined {
  const match = text.trim().match(/^\/(?:broadcast|post)(?:@\w+)?\s+([\s\S]+)$/i);
  return match?.[1]?.trim() || undefined;
}

export { isAwaitingBroadcastPost, clearAwaitingBroadcastPost };
