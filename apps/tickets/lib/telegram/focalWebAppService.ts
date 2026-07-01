import type { SupabaseClient } from "@supabase/supabase-js";
import { clampEventImageFocal } from "@/lib/eventCoverFocal";
import { isEventsImageFocalUnavailable } from "@/lib/supabase/eventsPoetCourseColumn";
import { IMAGE_FOCALS_KEY, getDraftImageFocals, setDraftImageFocal, type ImageFocal } from "@/lib/telegram/draftImageFocal";
import { getTelegramDraft, updateTelegramDraftStatus } from "@/lib/telegram/draftStore";
import { readPublishedEvents } from "@/lib/telegram/broadcastToGroups";
import { parseStoredEvents, storedImageFileIds } from "@/lib/telegram/parseEventWithGemini";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { downloadTelegramFile } from "@/lib/telegram/telegramBotApi";

export type FocalWebAppLoadResult = {
  mode: "draft" | "event";
  draftId?: string;
  eventId?: string;
  eventIndex: number;
  eventCount: number;
  title: string;
  focalX: number;
  focalY: number;
  hasImage: boolean;
  imageFileId?: string;
};

export async function loadFocalWebAppState(
  supabase: SupabaseClient,
  opts: { draftId?: string; eventId?: string; eventIndex: number; userId: number },
): Promise<FocalWebAppLoadResult | null> {
  if (opts.eventId) {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,image_url,image_focal_x,image_focal_y")
      .eq("id", opts.eventId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as {
      id: string;
      title: string;
      image_url: string | null;
      image_focal_x?: number;
      image_focal_y?: number;
    };
    return {
      mode: "event",
      eventId: row.id,
      eventIndex: 0,
      eventCount: 1,
      title: row.title,
      focalX: clampEventImageFocal(row.image_focal_x),
      focalY: clampEventImageFocal(row.image_focal_y),
      hasImage: Boolean(row.image_url?.trim()),
    };
  }

  if (!opts.draftId) return null;
  const draft = await getTelegramDraft(supabase, opts.draftId);
  if (!draft || draft.telegram_user_id !== opts.userId) return null;

  const events = parseStoredEvents(draft.parsed);
  const imageFileIds = storedImageFileIds(draft.parsed, draft.image_file_id);
  const eventIndex = Math.max(0, Math.min(opts.eventIndex, Math.max(events.length - 1, 0)));
  const focals = getDraftImageFocals(draft.parsed, Math.max(events.length, imageFileIds.length, 1));
  const focal = focals[eventIndex] ?? { x: 50, y: 50 };
  const fileId = imageFileIds[eventIndex];
  const ev = events[eventIndex];

  return {
    mode: "draft",
    draftId: draft.id,
    eventIndex,
    eventCount: Math.max(events.length, 1),
    title: ev?.title ?? `Событие ${eventIndex + 1}`,
    focalX: focal.x,
    focalY: focal.y,
    hasImage: Boolean(fileId),
    imageFileId: fileId,
  };
}

export async function saveFocalWebAppState(
  supabase: SupabaseClient,
  opts: {
    draftId?: string;
    eventId?: string;
    eventIndex: number;
    userId: number;
    focal: ImageFocal;
  },
): Promise<void> {
  const focalX = clampEventImageFocal(opts.focal.x);
  const focalY = clampEventImageFocal(opts.focal.y);

  if (opts.eventId) {
    let patch = { image_focal_x: focalX, image_focal_y: focalY };
    let res = await supabase.from("events").update(patch).eq("id", opts.eventId);
    if (res.error && isEventsImageFocalUnavailable(res.error.message)) {
      return;
    }
    if (res.error) throw new Error(res.error.message);
    return;
  }

  if (!opts.draftId) throw new Error("draftId или eventId обязателен");

  const draft = await getTelegramDraft(supabase, opts.draftId);
  if (!draft || draft.telegram_user_id !== opts.userId) {
    throw new Error("Черновик не найден");
  }

  const nextParsed = setDraftImageFocal(draft.parsed, opts.eventIndex, { x: focalX, y: focalY });
  const published = readPublishedEvents(nextParsed);
  const publishedEvent = published[opts.eventIndex];

  if (publishedEvent?.id) {
    let res = await supabase
      .from("events")
      .update({ image_focal_x: focalX, image_focal_y: focalY })
      .eq("id", publishedEvent.id);
    if (res.error && !isEventsImageFocalUnavailable(res.error.message)) {
      throw new Error(res.error.message);
    }
  }

  await updateTelegramDraftStatus(supabase, opts.draftId, draft.status, nextParsed);
}

export async function fetchDraftFocalImage(
  supabase: SupabaseClient,
  opts: { draftId: string; eventIndex: number; userId: number },
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const draft = await getTelegramDraft(supabase, opts.draftId);
  if (!draft || draft.telegram_user_id !== opts.userId) return null;
  const imageFileIds = storedImageFileIds(draft.parsed, draft.image_file_id);
  const fileId = imageFileIds[opts.eventIndex];
  if (!fileId) return null;
  return downloadTelegramFile(fileId);
}

export async function fetchEventCoverImage(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const { data, error } = await supabase.from("events").select("image_url").eq("id", eventId).maybeSingle();
  if (error || !data?.image_url) return null;
  const rawUrl = String(data.image_url);
  let url = rawUrl;
  if (!url.startsWith("http")) {
    const base = getPublicAppUrl()?.replace(/\/$/, "");
    if (base) url = `${base}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  }
  const res = await fetch(url);
  if (!res.ok) return null;
  const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  return { buffer: Buffer.from(await res.arrayBuffer()), mimeType };
}
