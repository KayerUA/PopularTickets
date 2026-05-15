/**
 * Старые или «говорящие» URL → канонический `poet_course.slug` (как в сиде / админке).
 * 308 в middleware; дублируем разрешение в fetch на всякий случай.
 */
export const POET_KURSY_LEGACY_SLUG_REDIRECTS: Readonly<Record<string, string>> = {
  "akterskoe-masterstvo": "acting",
  "aktyorskoe-masterstvo": "acting",
  "story-telling": "story-talling",
};
