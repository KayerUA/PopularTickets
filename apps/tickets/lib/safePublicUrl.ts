/**
 * Безопасная нормализация URL для OG, JSON-LD и next/image.
 * Не бросает — возвращает null при битых значениях из БД.
 */

export function isValidHttpUrl(href: string | null | undefined): boolean {
  if (!href || typeof href !== "string") return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Нормализует maps / внешние ссылки: добавляет https:// при необходимости. */
export function normalizeHttpUrl(href: string | null | undefined): string | null {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim().replace(/[.,;]+$/, "");
  if (!trimmed) return null;
  if (isValidHttpUrl(trimmed)) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      return url.toString();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Абсолютный URL ассета (OG, JSON-LD image).
 * Поддерживает `/public/...`, `https://...`, относительные пути от base.
 */
export function resolveAbsoluteAssetUrl(
  src: string | null | undefined,
  base: string | null | undefined,
): string | null {
  if (!src || typeof src !== "string") return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return isValidHttpUrl(trimmed) ? trimmed : null;
  }

  const baseClean = base?.replace(/\/$/, "");
  if (!baseClean) {
    if (trimmed.startsWith("/")) return trimmed;
    return null;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  try {
    const resolved = new URL(path, `${baseClean}/`).toString();
    return isRenderableImageSrc(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/** src пригоден для next/image (локальный путь или абсолютный http(s)). */
export function isRenderableImageSrc(src: string | null | undefined): boolean {
  if (!src || typeof src !== "string") return false;
  const trimmed = src.trim();
  if (!trimmed || trimmed.includes("::")) return false;
  if (trimmed.startsWith("/")) return true;
  return isValidHttpUrl(trimmed);
}
