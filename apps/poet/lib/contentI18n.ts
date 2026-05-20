import type { AppLocale } from "@/i18n/routing";

export type EventI18nRow = {
  title: string;
  description?: string | null;
  title_pl?: string | null;
  description_pl?: string | null;
  title_uk?: string | null;
  description_uk?: string | null;
};

export type CourseI18nRow = {
  title: string;
  body?: string | null;
  card_tag?: string | null;
  title_pl?: string | null;
  body_pl?: string | null;
  title_uk?: string | null;
  body_uk?: string | null;
  card_tag_pl?: string | null;
  card_tag_uk?: string | null;
};

export type ResolvedCopy = { title: string; description: string };

function pick(primary: string | null | undefined, fallback: string): string {
  const p = primary?.trim();
  return p && p.length > 0 ? p : fallback;
}

export function resolveEventCopy(row: EventI18nRow, locale: AppLocale): ResolvedCopy | null {
  if (locale === "pl") {
    return {
      title: pick(row.title_pl, row.title),
      description: pick(row.description_pl, row.description ?? ""),
    };
  }
  if (locale === "uk") {
    return {
      title: pick(row.title_uk, row.title),
      description: pick(row.description_uk, row.description ?? ""),
    };
  }
  return {
    title: row.title,
    description: row.description?.trim() ?? "",
  };
}

export function resolveCourseCopy(row: CourseI18nRow, locale: AppLocale): ResolvedCopy | null {
  if (locale === "pl") {
    return {
      title: pick(row.title_pl, row.title),
      description: pick(row.body_pl, row.body ?? ""),
    };
  }
  if (locale === "uk") {
    return {
      title: pick(row.title_uk, row.title),
      description: pick(row.body_uk, row.body ?? ""),
    };
  }
  return {
    title: row.title,
    description: row.body?.trim() ?? "",
  };
}

export function resolveCourseTag(row: CourseI18nRow, locale: AppLocale): string {
  const base = row.card_tag?.trim() ?? "";
  if (locale === "pl") return row.card_tag_pl?.trim() || base;
  if (locale === "uk") return row.card_tag_uk?.trim() || base;
  return base;
}
