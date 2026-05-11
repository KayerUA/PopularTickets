import type { SupabaseClient } from "@supabase/supabase-js";

export const EVENT_IMAGES_BUCKET = "event-images";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
  const { error } = await supabase.storage.from(EVENT_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(
      `Не удалось загрузить файл в Storage (${error.message}). Проверьте, что выполнен SQL supabase/storage-event-images.sql и бакет event-images существует.`
    );
  }

  const { data } = supabase.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
