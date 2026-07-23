import { requireServiceSupabase } from "@/lib/supabase/admin";
import { broadcastPostToGroups, type BroadcastPostResult } from "@/lib/telegram/broadcastPostToGroups";
import { broadcastDraftToGroups, broadcastEventToGroups } from "@/lib/telegram/broadcastToGroups";
import { saveBroadcastRetry, takeBroadcastRetry } from "@/lib/telegram/broadcastReportStore";

export type RetryBroadcastResult = {
  sent: number;
  failed: number;
  chats: number;
  retryToken: string | null;
};

export async function retryBroadcast(userId: number, token: string): Promise<RetryBroadcastResult | null> {
  const retry = await takeBroadcastRetry(userId, token);
  if (!retry) return null;
  const supabase = requireServiceSupabase();
  let result: BroadcastPostResult | { sent: number; failed: number; chats: number; failedChatIds: number[] };
  const { payload, failedChatIds } = retry;

  if (payload.kind === "post") {
    result = await broadcastPostToGroups(
      supabase,
      payload.sourceChatId,
      payload.messageIds,
      payload.audience,
      failedChatIds,
    );
  } else if (payload.kind === "event") {
    result = await broadcastEventToGroups(supabase, payload.eventId, payload.audience, failedChatIds);
  } else {
    result = await broadcastDraftToGroups(supabase, payload.draftId, payload.audience, failedChatIds);
  }

  const retryToken = await saveBroadcastRetry(userId, payload, result.failedChatIds);
  return { sent: result.sent, failed: result.failed, chats: result.chats, retryToken };
}
