import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { resolveAbsoluteAssetUrl } from "@/lib/safePublicUrl";
import { resolveBroadcastTargetIds, type BroadcastAudience } from "@/lib/telegram/broadcastChatStore";
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
  image: { fileId?: string; imageUrl?: string | null },
  base: string,
): Promise<void> {
  const details =
    (await fetchEventBroadcastDetails(supabase, event)) ?? fallbackBroadcastDetails(event);
  const { photoCaption, previewMessage, ticketUrl } = buildGroupBroadcastContent(base, details);
  const keyboard = ticketButton(ticketUrl);

  const photoUrl = image.imageUrl
    ? resolveAbsoluteAssetUrl(image.imageUrl, base)
    : null;
  const photoSource = image.fileId ?? photoUrl ?? undefined;

  if (photoSource) {
    const photoMsgId = await sendTelegramPhoto(targetChatId, photoSource, photoCaption, {
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

export async function broadcastEventToGroups(
  supabase: SupabaseClient,
  eventId: string,
  audience: BroadcastAudience = "all",
): Promise<{ sent: number; failed: number; chats: number }> {
  const chatIds = await resolveBroadcastTargetIds(supabase, audience);
  if (!chatIds.length) {
    throw new Error("Нет групп для рассылки. Добавьте бота админом в группу или /subscribe в группе.");
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,slug,title,starts_at,image_url,visibility")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.visibility === "inactive") throw new Error("Событие не найдено");

  const event: PublishedEventInfo = {
    id: String(data.id),
    slug: String(data.slug),
    title: String(data.title),
    startsAtIso: String(data.starts_at),
  };
  const imageUrl = typeof data.image_url === "string" ? data.image_url : null;
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";

  let sent = 0;
  let failed = 0;

  for (const targetChatId of chatIds) {
    try {
      await sendEventBroadcastToChat(supabase, targetChatId, event, { imageUrl }, base);
      sent++;
    } catch (e) {
      failed++;
      console.error("[telegram rebroadcast]", targetChatId, event.slug, e);
    }
  }

  return { sent, failed, chats: chatIds.length };
}

export async function broadcastDraftToGroups(
  supabase: SupabaseClient,
  draftId: string,
  audience: BroadcastAudience = "all",
): Promise<{ sent: number; failed: number; chats: number }> {
  const chatIds = await resolveBroadcastTargetIds(supabase, audience);
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

      try {
        await sendEventBroadcastToChat(
          supabase,
          targetChatId,
          event,
          { fileId: imageFileIds[i] },
          base,
        );
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
