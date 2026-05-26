const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

export type GbpDateParts = { year: number; month: number; day: number };
export type GbpTimeParts = { hours: number; minutes: number; seconds: number; nanos: number };

export type GbpEventSchedule = {
  startDate: GbpDateParts;
  startTime: GbpTimeParts;
  endDate: GbpDateParts;
  endTime: GbpTimeParts;
};

function partsFromDate(d: Date): { date: GbpDateParts; time: GbpTimeParts } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    date: {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
    },
    time: {
      hours: Number(map.hour),
      minutes: Number(map.minute),
      seconds: Number(map.second ?? 0),
      nanos: 0,
    },
  };
}

/** Расписание события в Europe/Warsaw для GBP LocalPost.event.schedule. */
export function gbpScheduleFromIso(startsAtIso: string, durationMs = DEFAULT_EVENT_DURATION_MS): GbpEventSchedule | null {
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + durationMs);
  const startParts = partsFromDate(start);
  const endParts = partsFromDate(end);
  return {
    startDate: startParts.date,
    startTime: startParts.time,
    endDate: endParts.date,
    endTime: endParts.time,
  };
}
