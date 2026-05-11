import type { SupabaseClient } from "@supabase/supabase-js";

export const EVENT_IMAGES_BUCKET = "event-images";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const ALLOWED_TYPES = new Set<string>(ALLOWED_MIME);

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
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME],
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

function extFromMime(type: string): string {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "img";
  }
}

/**
 * Загружает файл обложки в Storage и возвращает публичный URL для записи в events.image_url.
 */
export async function uploadEventCoverImage(
  supabase: SupabaseClient,
  file: File,
  slug: string
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("Файл обложки больше 5 МБ");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Допустимы только JPG, PNG, WebP и GIF");
  }

  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 60) || "event";
  const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const path = `${safeSlug}-${shortId}.${extFromMime(file.type)}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await ensureEventImagesBucket(supabase);

  const uploadOnce = () =>
    supabase.storage.from(EVENT_IMAGES_BUCKET).upload(path, buffer, {
      contentType: file.type,
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
