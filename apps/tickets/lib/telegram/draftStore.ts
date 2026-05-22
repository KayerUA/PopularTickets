import type { SupabaseClient } from "@supabase/supabase-js";

export type TelegramDraftStatus = "awaiting_clarification" | "preview" | "published" | "cancelled";

export type TelegramEventDraftRow = {
  id: string;
  telegram_chat_id: number;
  telegram_user_id: number;
  status: TelegramDraftStatus;
  source_text: string;
  image_file_id: string | null;
  parsed: Record<string, unknown>;
  missing_fields: string[];
  created_at: string;
  expires_at: string;
};

const TABLE = "telegram_event_drafts";

function isMissingTableError(message: string): boolean {
  return /does not exist|schema cache|PGRST205|42P01/i.test(message);
}

/** In-memory fallback для локальной разработки без миграции SQL. Переживает HMR через globalThis. */
type DraftMemory = {
  drafts: Map<string, TelegramEventDraftRow>;
  byChat: Map<number, string>;
};

function mem(): DraftMemory {
  const g = globalThis as typeof globalThis & { __telegramEventDraftMemory?: DraftMemory };
  if (!g.__telegramEventDraftMemory) {
    g.__telegramEventDraftMemory = { drafts: new Map(), byChat: new Map() };
  }
  return g.__telegramEventDraftMemory;
}

function rememberDraft(row: TelegramEventDraftRow): void {
  const { drafts, byChat } = mem();
  drafts.set(row.id, row);
  if (row.status !== "published" && row.status !== "cancelled") {
    byChat.set(row.telegram_chat_id, row.id);
  } else {
    byChat.delete(row.telegram_chat_id);
  }
}

export async function saveTelegramDraft(
  supabase: SupabaseClient,
  row: Omit<TelegramEventDraftRow, "created_at" | "expires_at"> & {
    created_at?: string;
    expires_at?: string;
  },
): Promise<TelegramEventDraftRow> {
  const payload = {
    id: row.id,
    telegram_chat_id: row.telegram_chat_id,
    telegram_user_id: row.telegram_user_id,
    status: row.status,
    source_text: row.source_text,
    image_file_id: row.image_file_id,
    parsed: row.parsed,
    missing_fields: row.missing_fields,
    expires_at: row.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const ins = await supabase.from(TABLE).upsert(payload).select("*").single();
  if (ins.error) {
    if (!isMissingTableError(ins.error.message)) throw new Error(ins.error.message);
    if (process.env.VERCEL) {
      throw new Error(
        "Таблица telegram_event_drafts не найдена в Supabase. Выполните SQL: supabase/telegram-event-drafts.sql",
      );
    }
    const full: TelegramEventDraftRow = {
      ...payload,
      created_at: new Date().toISOString(),
      expires_at: payload.expires_at,
    };
    rememberDraft(full);
    return full;
  }
  const saved = ins.data as TelegramEventDraftRow;
  rememberDraft(saved);
  return saved;
}

export async function getTelegramDraft(
  supabase: SupabaseClient,
  id: string,
): Promise<TelegramEventDraftRow | null> {
  const cached = mem().drafts.get(id);
  if (cached) return cached;

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) {
    if (isMissingTableError(error.message)) return null;
    throw new Error(error.message);
  }
  if (data) {
    rememberDraft(data as TelegramEventDraftRow);
    return data as TelegramEventDraftRow;
  }
  return null;
}

export async function getActiveDraftForChat(
  supabase: SupabaseClient,
  chatId: number,
): Promise<TelegramEventDraftRow | null> {
  const memId = mem().byChat.get(chatId);
  if (memId) {
    const m = mem().drafts.get(memId);
    if (m && m.status !== "published" && m.status !== "cancelled") return m;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("telegram_chat_id", chatId)
    .in("status", ["awaiting_clarification", "preview"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) return memId ? (mem().drafts.get(memId) ?? null) : null;
    throw new Error(error.message);
  }
  if (data) {
    rememberDraft(data as TelegramEventDraftRow);
    return data as TelegramEventDraftRow;
  }
  return memId ? (mem().drafts.get(memId) ?? null) : null;
}

export async function cancelActiveDraftForChat(supabase: SupabaseClient, chatId: number): Promise<void> {
  const active = await getActiveDraftForChat(supabase, chatId);
  if (active) await updateTelegramDraftStatus(supabase, active.id, "cancelled");
}

export async function updateTelegramDraftStatus(
  supabase: SupabaseClient,
  id: string,
  status: TelegramDraftStatus,
  parsed?: Record<string, unknown>,
  missing_fields?: string[],
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (parsed) patch.parsed = parsed;
  if (missing_fields) patch.missing_fields = missing_fields;

  const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
  if (error && !isMissingTableError(error.message)) throw new Error(error.message);

  const cached = mem().drafts.get(id);
  if (cached) {
    rememberDraft({
      ...cached,
      status,
      ...(parsed ? { parsed } : {}),
      ...(missing_fields ? { missing_fields } : {}),
    });
  }
}
