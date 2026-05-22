import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EVENT_COVER_ALLOWED_MIME,
  EVENT_COVER_MAX_UPLOAD_BYTES,
} from "@/lib/eventCoverImageLimits";
import { optimizeEventCoverBuffer } from "@/lib/optimizeEventCoverImage";

export const EVENT_IMAGES_BUCKET = "event-images";

const ALLOWED_TYPES = new Set<string>(EVENT_COVER_ALLOWED_MIME);

/**
 * Создаёт публичный бакет через Storage API (service role), если его ещё нет —
 * чтобы не зависеть только от ручного SQL (ошибка «Bucket not found»).
 * Политика чтения для anon — по-прежнему из supabase/storage-event-images.sql (или публичный бакет).
 */
export async function ensureEventImagesBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.warn("[PopularTickets][Storage] listBuckets:", listErr.message);
    return;
  }
  const exists = buckets?.some((b) => b.id === EVENT_IMAGES_BUCKET || b.name === EVENT_IMAGES_BUCKET);
  if (exists) return;

  const { error: createErr } = await supabase.storage.createBucket(EVENT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: EVENT_COVER_MAX_UPLOAD_BYTES,
    allowedMimeTypes: [...EVENT_COVER_ALLOWED_MIME],
  });
  if (!createErr) return;

  const low = createErr.message.toLowerCase();
  if (
    low.includes("already") ||
    low.includes("exists") ||
    low.includes("duplicate") ||
    low.includes("409")
  ) {
    return;
  }
  console.warn("[PopularTickets][Storage] createBucket:", createErr.message);
}

async function uploadOptimizedCover(
  supabase: SupabaseClient,
  buffer: Buffer,
  mimeType: string,
  slug: string,
): Promise<string> {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 60) || "event";
  const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const { buffer: optimized, mimeType: outMime, ext } = await optimizeEventCoverBuffer(buffer, mimeType);
  const path = `${safeSlug}-${shortId}.${ext}`;

  await ensureEventImagesBucket(supabase);

  const uploadOnce = () =>
    supabase.storage.from(EVENT_IMAGES_BUCKET).upload(path, optimized, {
      contentType: outMime,
      upsert: false,
    });

  let { error } = await uploadOnce();

  if (error && /bucket not found|not found|no such bucket|does not exist/i.test(error.message)) {
    await ensureEventImagesBucket(supabase);
    const retry = await uploadOnce();
    error = retry.error;
  }

  if (error) {
    throw new Error(
      `Не удалось загрузить файл в Storage (${error.message}). Создайте публичный бакет «${EVENT_IMAGES_BUCKET}»: Supabase → Storage → New bucket, либо выполните SQL supabase/storage-event-images.sql.`
    );
  }

  const { data } = supabase.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Загружает файл обложки в Storage и возвращает публичный URL для записи в events.image_url.
 */
export async function uploadEventCoverImage(
  supabase: SupabaseClient,
  file: File,
  slug: string,
): Promise<string> {
  if (file.size > EVENT_COVER_MAX_UPLOAD_BYTES) {
    throw new Error("Файл обложки больше 5 МБ");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Допустимы только JPG, PNG, WebP и GIF");
  }

  const raw = Buffer.from(await file.arrayBuffer());
  return uploadOptimizedCover(supabase, raw, file.type, slug);
}

/** Загрузка обложки из буфера (Telegram bot и т.п.). */
export async function uploadEventCoverBuffer(
  supabase: SupabaseClient,
  buffer: Buffer,
  mimeType: string,
  slug: string,
): Promise<string> {
  if (buffer.length > EVENT_COVER_MAX_UPLOAD_BYTES) {
    throw new Error("Файл обложки больше 5 МБ");
  }
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error("Допустимы только JPG, PNG, WebP и GIF");
  }

  return uploadOptimizedCover(supabase, buffer, mimeType, slug);
}
