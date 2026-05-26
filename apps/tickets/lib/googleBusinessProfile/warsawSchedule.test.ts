import { describe, expect, it } from "vitest";
import { gbpScheduleFromIso } from "@/lib/googleBusinessProfile/warsawSchedule";

describe("gbpScheduleFromIso", () => {
  it("builds Warsaw schedule from UTC ISO", () => {
    const schedule = gbpScheduleFromIso("2026-06-06T17:30:00.000Z");
    expect(schedule).not.toBeNull();
    expect(schedule!.startDate).toEqual({ year: 2026, month: 6, day: 6 });
    expect(schedule!.startTime.hours).toBe(19);
    expect(schedule!.startTime.minutes).toBe(30);
    expect(schedule!.endTime.hours).toBeGreaterThanOrEqual(22);
  });
});
