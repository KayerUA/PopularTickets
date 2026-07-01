import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { resolveBroadcastChatIds } from "@/lib/telegram/broadcastChatStore";
import {
  buildGroupBroadcastContent,
  fallbackBroadcastDetails,
  fetchEventBroadcastDetails,
} from "@/lib/telegram/buildGroupBroadcastMessage";
import { getTelegramDraft } from "@/lib/telegram/draftStore";
import { IMAGE_FILE_IDS_KEY, storedImageFileIds } from "@/lib/telegram/parseEventWithGemini";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram/telegramBotApi";

export const PUBLISHED_EVENTS_KEY = "_publishedEvents";
/** Флаг: события из черновика уже показаны на сайте (visibility=published). */
export const ON_SITE_KEY = "_onSite";

export type PublishedEventInfo = {
  title: string;
  slug: string;
  startsAtIso: string;
  /** id события в БД — для смены видимости (показать/скрыть на сайте). */
  id?: string;
};

function ticketButton(ticketUrl: string) {
  return [[{ text: "🎫 Билеты", url: ticketUrl }]];
}

export function readPublishedEvents(parsed: Record<string, unknown>): PublishedEventInfo[] {
  const raw = parsed[PUBLISHED_EVENTS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is PublishedEventInfo =>
      item != null &&
      typeof item === "object" &&
      typeof (item as PublishedEventInfo).title === "string" &&
      typeof (item as PublishedEventInfo).slug === "string" &&
      typeof (item as PublishedEventInfo).startsAtIso === "string",
  );
}

export function isDraftOnSite(parsed: Record<string, unknown>): boolean {
  return parsed[ON_SITE_KEY] === true;
}

async function sendEventBroadcastToChat(
  supabase: SupabaseClient,
  targetChatId: number,
  event: PublishedEventInfo,
  fileId: string | undefined,
  base: string,
): Promise<void> {
  const details =
    (await fetchEventBroadcastDetails(supabase, event)) ?? fallbackBroadcastDetails(event);
  const { photoCaption, previewMessage, ticketUrl } = buildGroupBroadcastContent(base, details);
  const keyboard = ticketButton(ticketUrl);

  if (fileId) {
    const photoMsgId = await sendTelegramPhoto(targetChatId, fileId, photoCaption, {
      inlineKeyboard: keyboard,
    });
    await sendTelegramMessage(targetChatId, previewMessage, {
      replyToMessageId: photoMsgId,
      inlineKeyboard: keyboard,
    });
    return;
  }

  const text = `${photoCaption}\n\n${previewMessage}`.slice(0, 4096);
  await sendTelegramMessage(targetChatId, text, { inlineKeyboard: keyboard });
}

export async function broadcastDraftToGroups(
  supabase: SupabaseClient,
  draftId: string,
): Promise<{ sent: number; failed: number; chats: number }> {
  const chatIds = await resolveBroadcastChatIds(supabase);
  if (!chatIds.length) {
    throw new Error("Нет групп для рассылки. Добавьте бота админом в группу или /subscribe в группе.");
  }

  const draft = await getTelegramDraft(supabase, draftId);
  if (!draft) throw new Error("Черновик не найден");
  if (draft.status !== "published") throw new Error("Сначала опубликуйте событие");

  const published = readPublishedEvents(draft.parsed);
  if (!published.length) throw new Error("Нет данных опубликованных событий");

  const imageFileIds = storedImageFileIds(draft.parsed, draft.image_file_id);
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";

  let sent = 0;
  let failed = 0;

  for (const targetChatId of chatIds) {
    for (let i = 0; i < published.length; i++) {
      const event = published[i]!;
      const fileId = imageFileIds[i];

      try {
        await sendEventBroadcastToChat(supabase, targetChatId, event, fileId, base);
        sent++;
      } catch (e) {
        failed++;
        console.error("[telegram broadcast]", targetChatId, event.slug, e);
      }
    }
  }

  return { sent, failed, chats: chatIds.length };
}

export function publishedEventsPayload(events: PublishedEventInfo[]): Record<string, unknown> {
  return { [PUBLISHED_EVENTS_KEY]: events };
}

export function mergePublishedIntoParsed(
  parsed: Record<string, unknown>,
  events: PublishedEventInfo[],
): Record<string, unknown> {
  return {
    ...parsed,
    ...publishedEventsPayload(events),
    [IMAGE_FILE_IDS_KEY]: parsed[IMAGE_FILE_IDS_KEY],
  };
}
