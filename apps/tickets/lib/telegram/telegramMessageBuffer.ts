import type { SupabaseClient } from "@supabase/supabase-js";
import { requireServiceSupabase } from "@/lib/supabase/admin";

export type TelegramBufferRow = {
  id: string;
  chat_id: number;
  user_id: number;
  text_content: string;
  file_ids: string[];
  flags: { notifiedWaitingForText?: boolean };
  updated_at: string;
};

const TABLE = "telegram_message_buffers";

function isMissingTableError(message: string): boolean {
  return /does not exist|schema cache|PGRST205|42P01/i.test(message);
}

type MemRow = TelegramBufferRow;

function memStore(): Map<string, MemRow> {
  const g = globalThis as typeof globalThis & { __telegramMessageBuffers?: Map<string, MemRow> };
  if (!g.__telegramMessageBuffers) g.__telegramMessageBuffers = new Map();
  return g.__telegramMessageBuffers;
}

function afishaId(chatId: number): string {
  return `${chatId}:afisha`;
}

function mediaGroupBufferId(chatId: number, groupId: string): string {
  return `${chatId}:mg:${groupId}`;
}

function normalizeRow(raw: Record<string, unknown>): TelegramBufferRow {
  const fileIds = raw.file_ids;
  return {
    id: String(raw.id),
    chat_id: Number(raw.chat_id),
    user_id: Number(raw.user_id),
    text_content: String(raw.text_content ?? ""),
    file_ids: Array.isArray(fileIds) ? fileIds.map(String) : [],
    flags: (raw.flags as TelegramBufferRow["flags"]) ?? {},
    updated_at: String(raw.updated_at),
  };
}

async function readRow(supabase: SupabaseClient | null, id: string): Promise<TelegramBufferRow | null> {
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) {
      if (isMissingTableError(error.message)) return memStore().get(id) ?? null;
      throw new Error(error.message);
    }
    if (data) {
      const row = normalizeRow(data as Record<string, unknown>);
      memStore().set(id, row);
      return row;
    }
    memStore().delete(id);
    return null;
  }

  return memStore().get(id) ?? null;
}

async function writeRow(supabase: SupabaseClient | null, row: TelegramBufferRow): Promise<void> {
  memStore().set(row.id, row);
  if (!supabase) return;

  const { error } = await supabase.from(TABLE).upsert({
    id: row.id,
    chat_id: row.chat_id,
    user_id: row.user_id,
    text_content: row.text_content,
    file_ids: row.file_ids,
    flags: row.flags,
    updated_at: row.updated_at,
  });
  if (error && !isMissingTableError(error.message)) throw new Error(error.message);
}

async function deleteRow(supabase: SupabaseClient | null, id: string): Promise<TelegramBufferRow | null> {
  const mem = memStore().get(id);
  memStore().delete(id);

  if (!supabase) return mem ?? null;

  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("*").maybeSingle();
  if (error) {
    if (isMissingTableError(error.message)) return mem ?? null;
    throw new Error(error.message);
  }
  return data ? normalizeRow(data as Record<string, unknown>) : mem ?? null;
}

/** Забрать буфер только если он «устоялся» (debounce между serverless-вызовами). */
export async function claimTelegramBuffer(
  id: string,
  minAgeMs: number,
): Promise<TelegramBufferRow | null> {
  let supabase: SupabaseClient | null = null;
  try {
    supabase = requireServiceSupabase();
  } catch {
    supabase = null;
  }

  const row = await readRow(supabase, id);
  if (!row) return null;

  const age = Date.now() - new Date(row.updated_at).getTime();
  if (age < minAgeMs) return null;

  // Удаляем только именно ту версию, которую прочитали. Иначе фото, пришедшее
  // между select и delete, могло потеряться при сборке альбома.
  let claimed: TelegramBufferRow | null;
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("updated_at", row.updated_at)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    claimed = data ? normalizeRow(data as Record<string, unknown>) : null;
    if (claimed) memStore().delete(id);
  } else {
    claimed = await deleteRow(null, id);
  }
  if (!claimed) return null;

  const claimedAge = Date.now() - new Date(claimed.updated_at).getTime();
  if (claimedAge < minAgeMs) {
    await writeRow(supabase, claimed);
    return null;
  }

  return claimed;
}

export type AfishaBundleReady = {
  chatId: number;
  userId: number;
  text: string;
  fileIds: string[];
};

export async function mergeAfishaPartPersistent(
  chatId: number,
  userId: number,
  part: { text?: string; fileIds?: string[] },
  onReady: (payload: AfishaBundleReady) => Promise<void>,
  onWaitingForText?: (payload: { chatId: number; photoCount: number }) => Promise<void>,
): Promise<void> {
  let supabase: SupabaseClient | null = null;
  try {
    supabase = requireServiceSupabase();
  } catch {
    supabase = null;
  }

  const id = afishaId(chatId);
  const now = new Date().toISOString();
  const prev = await readRow(supabase, id);

  const text = part.text?.trim()
    ? (part.text.trim().length >= (prev?.text_content.length ?? 0) ? part.text.trim() : prev!.text_content)
    : (prev?.text_content ?? "");

  const fileIds = [...(prev?.file_ids ?? [])];
  for (const fid of part.fileIds ?? []) {
    if (!fileIds.includes(fid)) fileIds.push(fid);
  }

  const hasText = text.length > 0;
  const hasPhotos = fileIds.length > 0;

  if (hasText && hasPhotos) {
    await deleteRow(supabase, id);
    await onReady({ chatId, userId, text, fileIds: [...fileIds] });
    return;
  }

  if (hasText && !hasPhotos) {
    await deleteRow(supabase, id);
    await onReady({ chatId, userId, text, fileIds: [] });
    return;
  }

  if (hasPhotos && !hasText) {
    const prevIds = prev?.file_ids ?? [];
    const isFreshBatch = prevIds.length === 0;
    const notified = isFreshBatch ? false : (prev?.flags?.notifiedWaitingForText ?? false);
    await writeRow(supabase, {
      id,
      chat_id: chatId,
      user_id: userId,
      text_content: "",
      file_ids: fileIds,
      flags: { notifiedWaitingForText: notified },
      updated_at: now,
    });
    if (!notified && onWaitingForText) {
      await onWaitingForText({ chatId, photoCount: fileIds.length });
      await writeRow(supabase, {
        id,
        chat_id: chatId,
        user_id: userId,
        text_content: "",
        file_ids: fileIds,
        flags: { notifiedWaitingForText: true },
        updated_at: now,
      });
    }
  }
}

export async function cancelAfishaBuffer(chatId: number): Promise<void> {
  let supabase: SupabaseClient | null = null;
  try {
    supabase = requireServiceSupabase();
  } catch {
    supabase = null;
  }
  await deleteRow(supabase, afishaId(chatId));
}

export async function appendMediaGroupPartPersistent(
  groupKey: string,
  chatId: number,
  userId: number,
  fileId: string | undefined,
  text: string,
): Promise<void> {
  let supabase: SupabaseClient | null = null;
  try {
    supabase = requireServiceSupabase();
  } catch {
    supabase = null;
  }

  const id = mediaGroupBufferId(chatId, groupKey);
  const prev = await readRow(supabase, id);
  const fileIds = [...(prev?.file_ids ?? [])];
  if (fileId && !fileIds.includes(fileId)) fileIds.push(fileId);

  const mergedText = text.trim() || prev?.text_content || "";

  await writeRow(supabase, {
    id,
    chat_id: chatId,
    user_id: userId,
    text_content: mergedText,
    file_ids: fileIds,
    flags: {},
    updated_at: new Date().toISOString(),
  });
}

export function mediaGroupBufferKey(chatId: number, groupId: string): string {
  return mediaGroupBufferId(chatId, groupId);
}

export async function peekAfishaBuffer(
  chatId: number,
): Promise<{ fileIds: string[]; text: string } | undefined> {
  let supabase: SupabaseClient | null = null;
  try {
    supabase = requireServiceSupabase();
  } catch {
    supabase = null;
  }
  const row = await readRow(supabase, afishaId(chatId));
  if (!row || row.file_ids.length === 0) return undefined;
  return { fileIds: row.file_ids, text: row.text_content };
}

// При пересылке Telegram иногда доставляет части альбома с разрывом до 5 секунд.
// Ждём весь пакет, чтобы только последний worker запустил один Gemini-разбор.
export const MEDIA_GROUP_DEBOUNCE_MS = 6000;

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}
