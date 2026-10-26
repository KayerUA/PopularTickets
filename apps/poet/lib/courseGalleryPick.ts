import { ACTING_GALLERY } from "@/lib/actingGallery";
import { IMPROV_GALLERY, type CourseShot } from "@/lib/improvGallery";

const GALLERIES: Record<string, readonly CourseShot[]> = {
  improv: IMPROV_GALLERY,
  acting: ACTING_GALLERY,
};

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (Math.imul(hash, 31) + id.charCodeAt(i)) >>> 0;
  return hash;
}

/** Стабильный кадр из галереи курса: у разных дат разные фото, у одной даты одно и то же. */
export function galleryPhotosForTrials(
  trials: readonly { id: string; courseSlug: string | null }[],
): Map<string, string> {
  const result = new Map<string, string>();
  const taken = new Map<string, Set<number>>();
  const ordered = [...trials].sort((a, b) => a.id.localeCompare(b.id));

  for (const slot of ordered) {
    const shots = slot.courseSlug ? GALLERIES[slot.courseSlug] : undefined;
    if (!shots?.length || !slot.courseSlug) continue;
    const used = taken.get(slot.courseSlug) ?? new Set<number>();
    let index = hashId(slot.id) % shots.length;
    if (used.size < shots.length) {
      while (used.has(index)) index = (index + 1) % shots.length;
    }
    used.add(index);
    taken.set(slot.courseSlug, used);
    result.set(slot.id, shots[index].src);
  }

  return result;
}
