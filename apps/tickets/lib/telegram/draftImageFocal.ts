import { clampEventImageFocal } from "@/lib/eventCoverFocal";

export const IMAGE_FOCALS_KEY = "_imageFocals";

export type ImageFocal = { x: number; y: number };

export const DEFAULT_IMAGE_FOCAL: ImageFocal = { x: 50, y: 50 };

function normalizeFocal(raw: unknown): ImageFocal {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_IMAGE_FOCAL };
  const o = raw as { x?: unknown; y?: unknown };
  return {
    x: clampEventImageFocal(o.x),
    y: clampEventImageFocal(o.y),
  };
}

export function getDraftImageFocals(parsed: Record<string, unknown>, count: number): ImageFocal[] {
  const raw = parsed[IMAGE_FOCALS_KEY];
  const out: ImageFocal[] = [];
  if (Array.isArray(raw)) {
    for (let i = 0; i < count; i++) {
      out.push(normalizeFocal(raw[i]));
    }
  }
  while (out.length < count) out.push({ ...DEFAULT_IMAGE_FOCAL });
  return out;
}

export function setDraftImageFocal(
  parsed: Record<string, unknown>,
  index: number,
  focal: ImageFocal,
): Record<string, unknown> {
  const count = Math.max(index + 1, getDraftImageFocals(parsed, index + 1).length);
  const focals = getDraftImageFocals(parsed, count);
  focals[index] = {
    x: clampEventImageFocal(focal.x),
    y: clampEventImageFocal(focal.y),
  };
  return { ...parsed, [IMAGE_FOCALS_KEY]: focals };
}
