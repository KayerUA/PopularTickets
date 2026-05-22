/** Максимальный размер исходного файла обложки (до сжатия на сервере). */
export const EVENT_COVER_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Выше этого порога не показываем blob-превью — декодирование ломает вкладку на мобилках. */
export const EVENT_COVER_MAX_PREVIEW_BYTES = 1.5 * 1024 * 1024;

export const EVENT_COVER_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const EVENT_COVER_ACCEPT = EVENT_COVER_ALLOWED_MIME.join(",");

export function formatEventCoverBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function eventCoverUploadTooLarge(bytes: number): boolean {
  return bytes > EVENT_COVER_MAX_UPLOAD_BYTES;
}

export function eventCoverPreviewTooLarge(bytes: number): boolean {
  return bytes > EVENT_COVER_MAX_PREVIEW_BYTES;
}
