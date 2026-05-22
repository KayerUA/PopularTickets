/** Порог: файлы крупнее сжимаем в браузере перед превью и отправкой. */
export const EVENT_COVER_CLIENT_COMPRESS_ABOVE_BYTES = 400 * 1024;

const MAX_EDGE = 1920;
const WEBP_QUALITY = 0.82;

/**
 * Уменьшает обложку до ~1920px и WebP — чтобы не декодировать многомегабайтный blob в превью
 * и не гонять исходник через server action.
 */
export async function compressEventCoverFile(file: File): Promise<File> {
  if (file.type === "image/gif") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const long = Math.max(bitmap.width, bitmap.height);
    const scale = long > MAX_EDGE ? MAX_EDGE / long : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas недоступен");

    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Не удалось сжать изображение"))),
        "image/webp",
        WEBP_QUALITY,
      );
    });

    const base = file.name.replace(/\.[^.]+$/i, "") || "cover";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

export function shouldCompressEventCoverClient(bytes: number): boolean {
  return bytes > EVENT_COVER_CLIENT_COMPRESS_ABOVE_BYTES;
}
