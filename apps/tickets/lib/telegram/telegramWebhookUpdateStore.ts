import type { TelegramUpdate } from "@/lib/telegram/handleTelegramUpdate";
import { requireServiceSupabase } from "@/lib/supabase/admin";

const TABLE = "telegram_message_buffers";
const PREFIX = "tg:update:";
const PROCESSING_STALE_MS = 10 * 60 * 1000;
const RETRY_TTL_MS = 24 * 60 * 60 * 1000;

type UpdateStatus = "processing" | "completed" | "failed";

type StoredFlags = {
  kind: "webhook-update";
  status: UpdateStatus;
  payload: TelegramUpdate;
  attempts: number;
  expiresAt: number;
  lastError?: string;
};

export type RetryableTelegramUpdate = {
  update: TelegramUpdate;
  updateId: number;
};

function key(updateId: number): string {
  return `${PREFIX}${updateId}`;
}

function isDuplicateKeyError(message: string): boolean {
  return /duplicate key|unique constraint|23505/i.test(message);
}

function flagsFrom(value: unknown): StoredFlags | null {
  if (!value || typeof value !== "object") return null;
  const flags = value as Partial<StoredFlags>;
  if (flags.kind !== "webhook-update" || !flags.payload || typeof flags.attempts !== "number") return null;
  if (flags.status !== "processing" && flags.status !== "completed" && flags.status !== "failed") return null;
  return flags as StoredFlags;
}

function updatePayload(update: TelegramUpdate, status: UpdateStatus, attempts: number, lastError?: string): StoredFlags {
  return {
    kind: "webhook-update",
    status,
    payload: update,
    attempts,
    expiresAt: Date.now() + RETRY_TTL_MS,
    ...(lastError ? { lastError: lastError.slice(0, 500) } : {}),
  };
}

/**
 * Постоянная дедупликация Telegram update_id. В отличие от Set в памяти она
 * работает между Vercel-инстансами и переживает повторную доставку webhook.
 */
export async function claimTelegramWebhookUpdate(update: TelegramUpdate): Promise<boolean> {
  const supabase = requireServiceSupabase();
  const id = key(update.update_id);
  const flags = updatePayload(update, "processing", 1);
  const { error } = await supabase.from(TABLE).insert({
    id,
    chat_id: 0,
    user_id: 0,
    text_content: "",
    file_ids: [],
    flags,
    updated_at: new Date().toISOString(),
  });
  if (!error) return true;
  if (!isDuplicateKeyError(error.message)) throw new Error(error.message);

  const { data, error: readError } = await supabase
    .from(TABLE)
    .select("flags,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  const previous = flagsFrom(data?.flags);
  if (!previous || previous.status === "completed") return false;
  const age = Date.now() - new Date(String(data?.updated_at ?? 0)).getTime();
  if (previous.status === "processing" && age < PROCESSING_STALE_MS) return false;

  const { data: claimed, error: claimError } = await supabase
    .from(TABLE)
    .update({
      flags: updatePayload(update, "processing", previous.attempts + 1),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("updated_at", data!.updated_at)
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  return Boolean(claimed);
}

export async function completeTelegramWebhookUpdate(updateId: number): Promise<void> {
  const supabase = requireServiceSupabase();
  const id = key(updateId);
  const { data, error } = await supabase.from(TABLE).select("flags").eq("id", id).maybeSingle();
  if (error || !data) return;
  const previous = flagsFrom(data.flags);
  if (!previous) return;
  await supabase
    .from(TABLE)
    .update({ flags: { ...previous, status: "completed" }, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function failTelegramWebhookUpdate(updateId: number, error: unknown): Promise<void> {
  const supabase = requireServiceSupabase();
  const id = key(updateId);
  const { data } = await supabase.from(TABLE).select("flags").eq("id", id).maybeSingle();
  const previous = flagsFrom(data?.flags);
  if (!previous) return;
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from(TABLE)
    .update({
      flags: { ...previous, status: "failed", lastError: message.slice(0, 500) },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/** Забирает только зависшие/неудачные обновления. Их повторяет защищённый cron route. */
export async function claimRetryableTelegramUpdates(limit = 20): Promise<RetryableTelegramUpdate[]> {
  const supabase = requireServiceSupabase();
  const staleBefore = new Date(Date.now() - PROCESSING_STALE_MS).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id,flags,updated_at")
    .like("id", `${PREFIX}%`)
    .lt("updated_at", staleBefore)
    .limit(limit);
  if (error) throw new Error(error.message);

  const retryable: RetryableTelegramUpdate[] = [];
  for (const row of data ?? []) {
    const flags = flagsFrom(row.flags);
    if (!flags || flags.status === "completed" || flags.expiresAt < Date.now()) continue;
    const updateId = Number(String(row.id).slice(PREFIX.length));
    if (!Number.isFinite(updateId)) continue;
    const { data: claimed } = await supabase
      .from(TABLE)
      .update({
        flags: { ...flags, status: "processing", attempts: flags.attempts + 1, lastError: undefined },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("updated_at", row.updated_at)
      .select("id")
      .maybeSingle();
    if (claimed) retryable.push({ update: flags.payload, updateId });
  }
  return retryable;
}
