import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { claimTelegramBuffer, type TelegramBufferRow } from "@/lib/telegram/telegramMessageBuffer";
import { requireServiceSupabase } from "@/lib/supabase/admin";

export type PendingBroadcastPost = {
  token: string;
  userId: number;
  sourceChatId: number;
  messageIds: number[];
  createdAt: number;
};

const PENDING_TTL_MS = 30 * 60 * 1000;

function pendingStore(): Map<string, PendingBroadcastPost> {
  const g = globalThis as typeof globalThis & { __pendingBroadcastPosts?: Map<string, PendingBroadcastPost> };
  if (!g.__pendingBroadcastPosts) g.__pendingBroadcastPosts = new Map();
  return g.__pendingBroadcastPosts;
}

function awaitingStore(): Map<number, number> {
  const g = globalThis as typeof globalThis & { __awaitingBroadcastPost?: Map<number, number> };
  if (!g.__awaitingBroadcastPost) g.__awaitingBroadcastPost = new Map();
  return g.__awaitingBroadcastPost;
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [token, row] of pendingStore()) {
    if (now - row.createdAt > PENDING_TTL_MS) pendingStore().delete(token);
  }
}

export function setAwaitingBroadcastPost(chatId: number, userId: number): void {
  awaitingStore().set(chatId, userId);
}

export function clearAwaitingBroadcastPost(chatId: number): void {
  awaitingStore().delete(chatId);
}

export function isAwaitingBroadcastPost(chatId: number, userId: number): boolean {
  return awaitingStore().get(chatId) === userId;
}

export function createPendingBroadcastPost(
  userId: number,
  sourceChatId: number,
  messageIds: number[],
): PendingBroadcastPost {
  pruneExpired();
  const token = randomBytes(6).toString("hex");
  const row: PendingBroadcastPost = {
    token,
    userId,
    sourceChatId,
    messageIds: [...new Set(messageIds)].sort((a, b) => a - b),
    createdAt: Date.now(),
  };
  pendingStore().set(token, row);
  return row;
}

export function takePendingBroadcastPost(token: string, userId: number): PendingBroadcastPost | null {
  pruneExpired();
  const row = pendingStore().get(token);
  if (!row || row.userId !== userId) return null;
  pendingStore().delete(token);
  return row;
}

export function broadcastAlbumBufferKey(chatId: number, mediaGroupId: string): string {
  return `${chatId}:bcast:${mediaGroupId}`;
}

function messageIdFromBufferToken(token: string): number | null {
  if (!token.startsWith("m:")) return null;
  const n = Number(token.slice(2));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function messageIdsFromBufferRow(row: TelegramBufferRow): number[] {
  return row.file_ids
    .map(messageIdFromBufferToken)
    .filter((id): id is number => id != null)
    .sort((a, b) => a - b);
}

async function readBroadcastAlbumRow(
  supabase: SupabaseClient | null,
  id: string,
): Promise<TelegramBufferRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("telegram_message_buffers").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  if (!data) return null;
  return {
    id: String(data.id),
    chat_id: Number(data.chat_id),
    user_id: Number(data.user_id),
    text_content: String(data.text_content ?? ""),
    file_ids: Array.isArray(data.file_ids) ? data.file_ids.map(String) : [],
    flags: (data.flags as TelegramBufferRow["flags"]) ?? {},
    updated_at: String(data.updated_at),
  };
}

async function writeBroadcastAlbumRow(
  supabase: SupabaseClient | null,
  row: TelegramBufferRow,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("telegram_message_buffers").upsert({
    id: row.id,
    chat_id: row.chat_id,
    user_id: row.user_id,
    text_content: row.text_content,
    file_ids: row.file_ids,
    flags: row.flags,
    updated_at: row.updated_at,
  });
}

/** Накапливает message_id альбома для рассылки (serverless-safe через Supabase buffer). */
export async function appendBroadcastAlbumPart(
  chatId: number,
  userId: number,
  mediaGroupId: string,
  messageId: number,
): Promise<void> {
  let supabase: SupabaseClient | null = null;
  try {
    supabase = requireServiceSupabase();
  } catch {
    supabase = null;
  }

  const id = broadcastAlbumBufferKey(chatId, mediaGroupId);
  const token = `m:${messageId}`;
  const prev = await readBroadcastAlbumRow(supabase, id);
  const fileIds = [...(prev?.file_ids ?? [])];
  if (!fileIds.includes(token)) fileIds.push(token);

  await writeBroadcastAlbumRow(supabase, {
    id,
    chat_id: chatId,
    user_id: userId,
    text_content: prev?.text_content ?? "",
    file_ids: fileIds,
    flags: {},
    updated_at: new Date().toISOString(),
  });
}

export async function claimBroadcastAlbumBuffer(
  chatId: number,
  mediaGroupId: string,
  minAgeMs: number,
): Promise<{ userId: number; messageIds: number[] } | null> {
  const id = broadcastAlbumBufferKey(chatId, mediaGroupId);
  const claimed = await claimTelegramBuffer(id, minAgeMs);
  if (!claimed) return null;
  const messageIds = messageIdsFromBufferRow(claimed);
  if (!messageIds.length) return null;
  return { userId: claimed.user_id, messageIds };
}
