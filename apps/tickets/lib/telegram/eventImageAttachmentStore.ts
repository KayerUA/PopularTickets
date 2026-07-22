import { randomBytes } from "node:crypto";
import { requireServiceSupabase } from "@/lib/supabase/admin";

const PREFIX = "event-image:pending:";
const TTL_MS = 15 * 60 * 1000;

type PendingImageAttachment = {
  token: string;
  userId: number;
  fileId: string;
};

function memory(): Map<string, PendingImageAttachment> {
  const g = globalThis as typeof globalThis & { __eventImageAttachment?: Map<string, PendingImageAttachment> };
  if (!g.__eventImageAttachment) g.__eventImageAttachment = new Map();
  return g.__eventImageAttachment;
}

async function supabaseOrNull() {
  try {
    return requireServiceSupabase();
  } catch {
    return null;
  }
}

export async function createPendingEventImageAttachment(userId: number, fileId: string): Promise<string> {
  const token = randomBytes(6).toString("hex");
  memory().set(token, { token, userId, fileId });
  const supabase = await supabaseOrNull();
  if (!supabase) return token;

  const { error } = await supabase.from("telegram_message_buffers").upsert({
    id: `${PREFIX}${token}`,
    chat_id: userId,
    user_id: userId,
    text_content: "",
    file_ids: [fileId],
    flags: { kind: "event-image-attachment", expiresAt: Date.now() + TTL_MS },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function takePendingEventImageAttachment(
  token: string,
  userId: number,
): Promise<PendingImageAttachment | null> {
  const supabase = await supabaseOrNull();
  if (!supabase) {
    const pending = memory().get(token);
    if (!pending || pending.userId !== userId) return null;
    memory().delete(token);
    return pending;
  }

  const { data, error } = await supabase
    .from("telegram_message_buffers")
    .delete()
    .eq("id", `${PREFIX}${token}`)
    .eq("user_id", userId)
    .select("file_ids,flags")
    .maybeSingle();
  if (error) throw new Error(error.message);
  memory().delete(token);
  const flags = (data?.flags as Record<string, unknown> | undefined) ?? {};
  const expiresAt = Number(flags.expiresAt);
  const fileId = Array.isArray(data?.file_ids) ? data.file_ids.find((id): id is string => typeof id === "string") : undefined;
  if (!fileId || flags.kind !== "event-image-attachment" || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }
  return { token, userId, fileId };
}
