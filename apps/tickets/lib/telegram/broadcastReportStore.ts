import { randomBytes } from "node:crypto";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import type { BroadcastAudience } from "@/lib/telegram/broadcastChatStore";

const TABLE = "telegram_message_buffers";
const PREFIX = "tg:broadcast:";
const TTL_MS = 24 * 60 * 60 * 1000;

export type BroadcastReportPayload =
  | { kind: "post"; audience: BroadcastAudience; sourceChatId: number; messageIds: number[]; generatedText?: string }
  | { kind: "event"; audience: BroadcastAudience; eventId: string }
  | { kind: "draft"; audience: BroadcastAudience; draftId: string };

type StoredReport = {
  kind: "broadcast-report";
  payload: BroadcastReportPayload;
  failedChatIds: number[];
  expiresAt: number;
};

function parseReport(value: unknown): StoredReport | null {
  if (!value || typeof value !== "object") return null;
  const report = value as Partial<StoredReport>;
  if (report.kind !== "broadcast-report" || !report.payload || !Array.isArray(report.failedChatIds)) return null;
  return report as StoredReport;
}

/** Сохраняет только неудачные получатели; кнопка retry не повторяет уже доставленные группы. */
export async function saveBroadcastRetry(
  userId: number,
  payload: BroadcastReportPayload,
  failedChatIds: number[],
): Promise<string | null> {
  const unique = [...new Set(failedChatIds)].filter((id) => Number.isFinite(id));
  if (!unique.length) return null;
  const token = randomBytes(6).toString("hex");
  const report: StoredReport = {
    kind: "broadcast-report",
    payload,
    failedChatIds: unique,
    expiresAt: Date.now() + TTL_MS,
  };
  const { error } = await requireServiceSupabase().from(TABLE).insert({
    id: `${PREFIX}${token}`,
    chat_id: 0,
    user_id: userId,
    text_content: "",
    file_ids: [],
    flags: report,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return token;
}

/** Delete — атомарный билет на повтор, поэтому двойной тап не запустит две рассылки. */
export async function takeBroadcastRetry(
  userId: number,
  token: string,
): Promise<{ payload: BroadcastReportPayload; failedChatIds: number[] } | null> {
  const { data, error } = await requireServiceSupabase()
    .from(TABLE)
    .delete()
    .eq("id", `${PREFIX}${token}`)
    .eq("user_id", userId)
    .select("flags")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const report = parseReport(data?.flags);
  if (!report || report.expiresAt < Date.now()) return null;
  return { payload: report.payload, failedChatIds: report.failedChatIds };
}
