import sharp from "sharp";
import { EVENT_COVER_MAX_UPLOAD_BYTES } from "@/lib/eventCoverImageLimits";

const MAX_EDGE = 1920;
const WEBP_QUALITY = 82;

/** Сжимает обложку для витрины: до 1920px по длинной стороне, WebP ~80%. */
export async function optimizeEventCoverBuffer(
  input: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  if (input.length > EVENT_COVER_MAX_UPLOAD_BYTES) {
    throw new Error("Файл обложки больше 5 МБ");
  }

  if (mimeType === "image/gif") {
    const meta = await sharp(input, { animated: true }).metadata();
    if ((meta.pages ?? 1) > 1) {
      if (input.length <= 2 * 1024 * 1024) {
        return { buffer: input, mimeType: "image/gif", ext: "gif" };
      }
      throw new Error("Анимированный GIF больше 2 МБ — сохраните как JPG/PNG/WebP или уменьшите файл.");
    }
  }

  const optimized = await sharp(input, { animated: false })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  return { buffer: optimized, mimeType: "image/webp", ext: "webp" };
}
