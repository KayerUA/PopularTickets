import { z } from "zod";

export const CONTENT_VISIBILITIES = ["published", "unlisted", "inactive"] as const;
export type ContentVisibility = (typeof CONTENT_VISIBILITIES)[number];

export const contentVisibilitySchema = z.enum(CONTENT_VISIBILITIES);

export function parseContentVisibilityFromForm(v: unknown): ContentVisibility {
  const r = contentVisibilitySchema.safeParse(typeof v === "string" ? v.trim() : v);
  return r.success ? r.data : "inactive";
}

/** Страница события и чекаут (не inactive). */
export function allowsPublicEventByVisibility(v: string): boolean {
  return v === "published" || v === "unlisted";
}

/** Только афиша / списки на сайте. */
export function isListedVisibility(v: string): boolean {
  return v === "published";
}
