const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

/** endDate для schema.org/Event — тот же ISO-суффикс, что у startDate (+00:00 vs Z). */
export function eventEndDateIso(startsAt: string, durationMs = DEFAULT_EVENT_DURATION_MS): string {
  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) return startsAt;
  const end = new Date(startMs + durationMs);

  if (/\+00:00$/.test(startsAt)) {
    return end.toISOString().replace(".000Z", "+00:00");
  }
  if (/Z$/.test(startsAt)) {
    return end.toISOString();
  }
  const offsetMatch = startsAt.match(/([+-]\d{2}:\d{2})$/);
  if (offsetMatch) {
    return end.toISOString().replace(".000Z", offsetMatch[1]);
  }
  return end.toISOString().replace(".000Z", "Z");
}
