import type { Metadata } from "next";

/** Опционально: через N дней после начала события — noindex (env). По умолчанию 0 = не скрывать. */
export function eventSeoArchiveDays(): number {
  const raw = process.env.EVENT_SEO_ARCHIVE_DAYS?.trim();
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * robots для страницы события.
 * published — индексируем всегда (и прошлые, и будущие), пока не задан EVENT_SEO_ARCHIVE_DAYS.
 * unlisted — только прямой URL, без индекса.
 */
export function eventRobotsMeta(
  startsAt: string,
  visibility: string,
): Metadata["robots"] | undefined {
  if (visibility === "unlisted") {
    return { index: false, follow: true };
  }
  if (visibility !== "published") {
    return { index: false, follow: false };
  }

  const archiveDays = eventSeoArchiveDays();
  if (archiveDays <= 0) return undefined;

  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) return undefined;
  const ageDays = (Date.now() - startMs) / (24 * 60 * 60 * 1000);
  if (ageDays > archiveDays) {
    return { index: false, follow: true };
  }
  return undefined;
}

export type EventSitemapTier = {
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
};

/**
 * Авто-приоритет в sitemap: будущие — выше, недавно прошедшие — средние, старые — ниже (но остаются в sitemap).
 */
export function eventSitemapTier(startsAt: string): EventSitemapTier {
  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) {
    return { priority: 0.5, changeFrequency: "weekly" };
  }
  const daysFromNow = (startMs - Date.now()) / (24 * 60 * 60 * 1000);

  if (daysFromNow >= 0) {
    if (daysFromNow <= 14) return { priority: 0.9, changeFrequency: "daily" };
    if (daysFromNow <= 60) return { priority: 0.85, changeFrequency: "weekly" };
    return { priority: 0.75, changeFrequency: "weekly" };
  }

  const daysPast = -daysFromNow;
  if (daysPast <= 30) return { priority: 0.6, changeFrequency: "weekly" };
  if (daysPast <= 180) return { priority: 0.45, changeFrequency: "monthly" };
  return { priority: 0.35, changeFrequency: "monthly" };
}
