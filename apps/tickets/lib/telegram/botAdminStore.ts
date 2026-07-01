import type { SupabaseClient } from "@supabase/supabase-js";
import { getTelegramOwnerUserIds } from "@/lib/telegram/config";

const TABLE = "telegram_bot_admins";

function isMissingTableError(message: string): boolean {
  return /does not exist|schema cache|PGRST205|42P01/i.test(message);
}

export type BotAdminRow = {
  telegram_user_id: number;
  username: string | null;
  display_name: string | null;
  added_by: number | null;
  created_at: string;
};

type MemRow = BotAdminRow;

function memStore(): Map<number, MemRow> {
  const g = globalThis as typeof globalThis & { __telegramBotAdmins?: Map<number, MemRow> };
  if (!g.__telegramBotAdmins) g.__telegramBotAdmins = new Map();
  return g.__telegramBotAdmins;
}

export async function addBotAdmin(
  supabase: SupabaseClient,
  userId: number,
  opts: { username?: string; displayName?: string; addedBy?: number },
): Promise<void> {
  const row: MemRow = {
    telegram_user_id: userId,
    username: opts.username ?? null,
    display_name: opts.displayName ?? null,
    added_by: opts.addedBy ?? null,
    created_at: new Date().toISOString(),
  };
  memStore().set(userId, row);

  const { error } = await supabase.from(TABLE).upsert({
    telegram_user_id: userId,
    username: row.username,
    display_name: row.display_name,
    added_by: row.added_by,
  });
  if (error && !isMissingTableError(error.message)) throw new Error(error.message);
}

export async function removeBotAdmin(supabase: SupabaseClient, userId: number): Promise<boolean> {
  const had = memStore().delete(userId);

  const { data, error } = await supabase.from(TABLE).delete().eq("telegram_user_id", userId).select("telegram_user_id");
  if (error) {
    if (isMissingTableError(error.message)) return had;
    throw new Error(error.message);
  }
  return (data?.length ?? 0) > 0 || had;
}

export async function listBotAdmins(supabase: SupabaseClient): Promise<BotAdminRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingTableError(error.message)) return [...memStore().values()];
    throw new Error(error.message);
  }

  const rows = (data ?? []) as BotAdminRow[];
  for (const row of rows) {
    memStore().set(row.telegram_user_id, row);
  }
  for (const row of memStore().values()) {
    if (!rows.some((r) => r.telegram_user_id === row.telegram_user_id)) rows.push(row);
  }
  return rows;
}

/** Владельцы (env) + назначенные редакторы (БД). */
export async function resolveBotOperatorIds(supabase: SupabaseClient): Promise<Set<number>> {
  const owners = getTelegramOwnerUserIds();
  const delegated = await listBotAdmins(supabase);
  const out = new Set(owners);
  for (const row of delegated) out.add(row.telegram_user_id);
  return out;
}
