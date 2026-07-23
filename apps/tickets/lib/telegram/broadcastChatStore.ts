import type { SupabaseClient } from "@supabase/supabase-js";
import { getTelegramBroadcastChatIds } from "@/lib/telegram/config";

const TABLE = "telegram_broadcast_chats";
const SETTINGS_TABLE = "telegram_message_buffers";
const MASTER_SETTING_ID = "tg:settings:master-group";

/** Fallback, пока редактор не выбрал мастер-группу в самом боте. */
export const TELEGRAM_DEFAULT_MASTER_GROUP = {
  id: -1003895335306,
  title: "POPULAR IMPRO",
} as const;

export type BroadcastAudience = "all" | "master";

function isMissingTableError(message: string): boolean {
  return /does not exist|schema cache|PGRST205|42P01/i.test(message);
}

export type BroadcastChatRow = {
  chat_id: number;
  chat_title: string;
  chat_type: string;
  registered_at: string;
  updated_at: string;
};

export type MasterBroadcastChat = { id: number; title: string };

function memStore(): Map<number, BroadcastChatRow> {
  const g = globalThis as typeof globalThis & { __telegramBroadcastChats?: Map<number, BroadcastChatRow> };
  if (!g.__telegramBroadcastChats) g.__telegramBroadcastChats = new Map();
  return g.__telegramBroadcastChats;
}

export async function registerBroadcastChat(
  supabase: SupabaseClient,
  chatId: number,
  chatTitle: string,
  chatType: string,
): Promise<void> {
  const now = new Date().toISOString();
  const row: BroadcastChatRow = {
    chat_id: chatId,
    chat_title: chatTitle,
    chat_type: chatType,
    registered_at: now,
    updated_at: now,
  };
  memStore().set(chatId, row);

  const { error } = await supabase.from(TABLE).upsert({
    chat_id: chatId,
    chat_title: chatTitle,
    chat_type: chatType,
    updated_at: now,
  });
  if (error && !isMissingTableError(error.message)) throw new Error(error.message);
}

export async function unregisterBroadcastChat(supabase: SupabaseClient, chatId: number): Promise<void> {
  memStore().delete(chatId);

  const { error } = await supabase.from(TABLE).delete().eq("chat_id", chatId);
  if (error && !isMissingTableError(error.message)) throw new Error(error.message);
}

function masterFromFlags(value: unknown): MasterBroadcastChat | null {
  if (!value || typeof value !== "object") return null;
  const flags = value as { kind?: unknown; chatId?: unknown; title?: unknown };
  const id = Number(flags.chatId);
  if (flags.kind !== "master-broadcast-chat" || !Number.isFinite(id)) return null;
  return { id, title: typeof flags.title === "string" && flags.title.trim() ? flags.title : String(id) };
}

/** Настройка хранится в уже существующем serverless-safe буфере — без отдельной миграции. */
export async function getMasterBroadcastChat(supabase: SupabaseClient): Promise<MasterBroadcastChat> {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("flags")
    .eq("id", MASTER_SETTING_ID)
    .maybeSingle();
  if (error && !isMissingTableError(error.message)) throw new Error(error.message);
  return masterFromFlags(data?.flags) ?? TELEGRAM_DEFAULT_MASTER_GROUP;
}

export async function setMasterBroadcastChat(supabase: SupabaseClient, group: BroadcastChatRow): Promise<void> {
  const { error } = await supabase.from(SETTINGS_TABLE).upsert({
    id: MASTER_SETTING_ID,
    chat_id: 0,
    user_id: 0,
    text_content: "",
    file_ids: [],
    flags: { kind: "master-broadcast-chat", chatId: group.chat_id, title: group.chat_title || String(group.chat_id) },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function listBroadcastChatIds(supabase: SupabaseClient): Promise<number[]> {
  const { data, error } = await supabase.from(TABLE).select("chat_id").order("updated_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error.message)) {
      return [...memStore().keys()];
    }
    throw new Error(error.message);
  }

  const ids = (data ?? []).map((r) => Number((r as { chat_id: number }).chat_id)).filter((n) => Number.isFinite(n));
  for (const id of memStore().keys()) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function listBroadcastChats(supabase: SupabaseClient): Promise<BroadcastChatRow[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("updated_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error.message)) return [...memStore().values()];
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => row as BroadcastChatRow);
  for (const row of memStore().values()) {
    if (!rows.some((item) => item.chat_id === row.chat_id)) rows.push(row);
  }
  return rows;
}

/** Env-список + зарегистрированные в БД группы (без дублей). */
export async function resolveBroadcastChatIds(supabase: SupabaseClient): Promise<number[]> {
  const envIds = getTelegramBroadcastChatIds();
  const dbIds = await listBroadcastChatIds(supabase);
  return [...new Set([...envIds, ...dbIds])];
}

export async function resolveBroadcastTargetIds(
  supabase: SupabaseClient,
  audience: BroadcastAudience,
): Promise<number[]> {
  if (audience === "master") return [(await getMasterBroadcastChat(supabase)).id];
  return resolveBroadcastChatIds(supabase);
}

export function broadcastAudienceLabel(audience: BroadcastAudience, master = TELEGRAM_DEFAULT_MASTER_GROUP): string {
  return audience === "master" ? `⭐ ${master.title}` : "🌐 Все группы";
}
