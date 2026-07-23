import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { claimTelegramBuffer, type TelegramBufferRow } from "@/lib/telegram/telegramMessageBuffer";
import { requireServiceSupabase } from "@/lib/supabase/admin";

export type PendingBroadcastPost = {
  token: string;
  userId: number;
  sourceChatId: number;
  messageIds: number[];
  generatedText?: string;
  generatedPhotoFileId?: string;
  createdAt: number;
};

const PENDING_TTL_MS = 30 * 60 * 1000;
const AWAITING_TTL_MS = 15 * 60 * 1000;
const SESSION_PREFIX = "postcast:session:";
const PENDING_PREFIX = "postcast:pending:";
const REWRITE_PREFIX = "postcast:rewrite:";

function pendingStore(): Map<string, PendingBroadcastPost> {
  const g = globalThis as typeof globalThis & { __pendingBroadcastPosts?: Map<string, PendingBroadcastPost> };
  if (!g.__pendingBroadcastPosts) g.__pendingBroadcastPosts = new Map();
  return g.__pendingBroadcastPosts;
}

type AwaitingBroadcastPost = { userId: number; expiresAt: number };

function awaitingStore(): Map<number, AwaitingBroadcastPost> {
  const g = globalThis as typeof globalThis & { __awaitingBroadcastPost?: Map<number, AwaitingBroadcastPost> };
  if (!g.__awaitingBroadcastPost) g.__awaitingBroadcastPost = new Map();
  return g.__awaitingBroadcastPost;
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [token, row] of pendingStore()) {
    if (now - row.createdAt > PENDING_TTL_MS) pendingStore().delete(token);
  }
}

function expiryIn(ms: number): number {
  return Date.now() + ms;
}

function isExpired(expiresAt: unknown): boolean {
  return typeof expiresAt !== "number" || expiresAt <= Date.now();
}

async function sessionSupabase() {
  try {
    return requireServiceSupabase();
  } catch {
    return null;
  }
}

async function saveSession(
  id: string,
  chatId: number,
  userId: number,
  flags: Record<string, unknown>,
): Promise<void> {
  const supabase = await sessionSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("telegram_message_buffers").upsert({
    id,
    chat_id: chatId,
    user_id: userId,
    text_content: "",
    file_ids: [],
    flags,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function takeSession(id: string, userId?: number): Promise<{ flags: Record<string, unknown>; userId: number } | null> {
  const supabase = await sessionSupabase();
  if (!supabase) return null;
  let query = supabase.from("telegram_message_buffers").delete().eq("id", id);
  if (userId != null) query = query.eq("user_id", userId);
  const { data, error } = await query.select("user_id,flags").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    userId: Number(data.user_id),
    flags: (data.flags as Record<string, unknown>) ?? {},
  };
}

async function readSession(id: string): Promise<{ flags: Record<string, unknown>; userId: number } | null> {
  const supabase = await sessionSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("telegram_message_buffers")
    .select("user_id,flags")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    userId: Number(data.user_id),
    flags: (data.flags as Record<string, unknown>) ?? {},
  };
}

export async function setAwaitingBroadcastPost(chatId: number, userId: number): Promise<void> {
  const expiresAt = expiryIn(AWAITING_TTL_MS);
  awaitingStore().set(chatId, { userId, expiresAt });
  await saveSession(`${SESSION_PREFIX}${chatId}`, chatId, userId, {
    kind: "awaiting-post",
    expiresAt,
  });
}

export async function clearAwaitingBroadcastPost(chatId: number): Promise<void> {
  awaitingStore().delete(chatId);
  await takeSession(`${SESSION_PREFIX}${chatId}`);
}

type RewriteSession = {
  stage: "source" | "instruction";
  source?: string;
  sourcePhotoFileId?: string;
  expiresAt: number;
};

export async function startAiBroadcastRewrite(chatId: number, userId: number): Promise<void> {
  await clearAwaitingBroadcastPost(chatId);
  await saveSession(`${REWRITE_PREFIX}${chatId}`, chatId, userId, {
    kind: "ai-rewrite-post",
    stage: "source",
    expiresAt: expiryIn(AWAITING_TTL_MS),
  });
}

export async function clearAiBroadcastRewrite(chatId: number): Promise<void> {
  await takeSession(`${REWRITE_PREFIX}${chatId}`);
}

export async function readAiBroadcastRewrite(chatId: number, userId: number): Promise<RewriteSession | null> {
  const row = await readSession(`${REWRITE_PREFIX}${chatId}`);
  if (!row || row.userId !== userId || row.flags.kind !== "ai-rewrite-post") return null;
  const stage = row.flags.stage;
  const expiresAt = Number(row.flags.expiresAt);
  if ((stage !== "source" && stage !== "instruction") || isExpired(expiresAt)) {
    await clearAiBroadcastRewrite(chatId);
    return null;
  }
  return {
    stage,
    source: typeof row.flags.source === "string" ? row.flags.source : undefined,
    sourcePhotoFileId: typeof row.flags.sourcePhotoFileId === "string" ? row.flags.sourcePhotoFileId : undefined,
    expiresAt,
  };
}

export async function saveAiBroadcastRewriteInstruction(
  chatId: number,
  userId: number,
  source: string,
  sourcePhotoFileId?: string,
): Promise<void> {
  await saveSession(`${REWRITE_PREFIX}${chatId}`, chatId, userId, {
    kind: "ai-rewrite-post",
    stage: "instruction",
    source,
    sourcePhotoFileId,
    expiresAt: expiryIn(AWAITING_TTL_MS),
  });
}

export async function isAwaitingBroadcastPost(chatId: number, userId: number): Promise<boolean> {
  const memory = awaitingStore().get(chatId);
  if (memory?.userId === userId && !isExpired(memory.expiresAt)) return true;
  if (memory) awaitingStore().delete(chatId);
  const row = await readSession(`${SESSION_PREFIX}${chatId}`);
  if (!row || row.userId !== userId || row.flags.kind !== "awaiting-post") return false;
  if (isExpired(row.flags.expiresAt)) {
    await takeSession(`${SESSION_PREFIX}${chatId}`, userId);
    return false;
  }
  awaitingStore().set(chatId, { userId, expiresAt: Number(row.flags.expiresAt) });
  return true;
}

export async function createPendingBroadcastPost(
  userId: number,
  sourceChatId: number,
  messageIds: number[],
  generatedText?: string,
  generatedPhotoFileId?: string,
): Promise<PendingBroadcastPost> {
  pruneExpired();
  const token = randomBytes(6).toString("hex");
  const row: PendingBroadcastPost = {
    token,
    userId,
    sourceChatId,
    messageIds: [...new Set(messageIds)].sort((a, b) => a - b),
    generatedText: generatedText?.trim() || undefined,
    generatedPhotoFileId: generatedPhotoFileId?.trim() || undefined,
    createdAt: Date.now(),
  };
  pendingStore().set(token, row);
  await saveSession(`${PENDING_PREFIX}${token}`, sourceChatId, userId, {
    kind: "pending-post",
    sourceChatId,
    messageIds: row.messageIds,
    generatedText: row.generatedText,
    generatedPhotoFileId: row.generatedPhotoFileId,
    expiresAt: expiryIn(PENDING_TTL_MS),
  });
  return row;
}

export async function takePendingBroadcastPost(token: string, userId: number): Promise<PendingBroadcastPost | null> {
  pruneExpired();
  const supabase = await sessionSupabase();
  if (supabase) {
    // В production именно delete в БД — атомарный «билет» на рассылку между инстансами Vercel.
    const stored = await takeSession(`${PENDING_PREFIX}${token}`, userId);
    if (!stored || stored.flags.kind !== "pending-post" || isExpired(stored.flags.expiresAt)) return null;
    pendingStore().delete(token);
    const sourceChatId = Number(stored.flags.sourceChatId);
    const messageIds = Array.isArray(stored.flags.messageIds)
      ? stored.flags.messageIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
      : [];
    const generatedText = typeof stored.flags.generatedText === "string" ? stored.flags.generatedText.trim() : undefined;
    const generatedPhotoFileId = typeof stored.flags.generatedPhotoFileId === "string"
      ? stored.flags.generatedPhotoFileId.trim()
      : undefined;
    if (!Number.isFinite(sourceChatId) || (!messageIds.length && !generatedText)) return null;
    return { token, userId, sourceChatId, messageIds, generatedText, generatedPhotoFileId, createdAt: Date.now() };
  }

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
