/**
 * Ошибка PostgREST, когда колонка `events.poet_course_id` ещё не в БД или не попала в кэш схемы.
 */
export function isEventsPoetCourseIdUnavailable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("poet_course_id") &&
    (m.includes("schema cache") || m.includes("could not find") || m.includes("column"))
  );
}

/** Колонки `image_focal_x` / `image_focal_y` ещё не в БД или не в кэше PostgREST. */
export function isEventsImageFocalUnavailable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("image_focal_x") || m.includes("image_focal_y")) &&
    (m.includes("schema cache") || m.includes("could not find") || m.includes("column"))
  );
}
