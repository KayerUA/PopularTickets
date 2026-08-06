import { describe, expect, it } from "vitest";
import {
  extractScheduleLinesFromSource,
  isTrialScheduleAfisha,
  poetCourseSlugFromText,
} from "@/lib/telegram/trialSchedule";

const HEADER_SCHEDULE = `Импровизация
11.08 (вт) 18:00-20:00
13.08 (чт) 18:00-20:00
16.08 (вс) 12:30-14:30

Актёрское мастерство
15.08 (сб) 16:00-18:00

И сразу еще на неделю

Импровизация
18.08 (вт) 18:00-20:00
20.08 (чт) 18:00-20:00
23.08 (вс) 12:30-14:30

Актёрское мастерство
22.08 (сб) 16:00-18:00`;

describe("extractScheduleLinesFromSource", () => {
  it("группирует даты по заголовку дисциплины", () => {
    const lines = extractScheduleLinesFromSource(HEADER_SCHEDULE);

    expect(lines).toHaveLength(8);
    expect(lines.map((line) => line.startsAtWarsaw.slice(5))).toEqual([
      "08-11T18:00",
      "08-13T18:00",
      "08-16T12:30",
      "08-15T16:00",
      "08-18T18:00",
      "08-20T18:00",
      "08-23T12:30",
      "08-22T16:00",
    ]);
    expect(lines.map((line) => poetCourseSlugFromText(line.lineHint))).toEqual([
      "improv",
      "improv",
      "improv",
      "acting",
      "improv",
      "improv",
      "improv",
      "acting",
    ]);
  });

  it("не считает время окончания описанием строки", () => {
    const [line] = extractScheduleLinesFromSource("Актёрское мастерство\n15.08 (сб) 16:00-18:00");
    expect(line?.lineHint).toBe("Актёрское мастерство");
  });

  it("поддерживает старый формат с описанием после тире", () => {
    const lines = extractScheduleLinesFromSource("20.05 (ср) 20:00-22:00 — Импровизация\n21.05 (чт) 19:00 — Актёрское мастерство");
    expect(lines.map((line) => line.lineHint)).toEqual(["Импровизация", "Актёрское мастерство"]);
  });
});

describe("isTrialScheduleAfisha", () => {
  it("узнаёт голое расписание занятий", () => {
    expect(isTrialScheduleAfisha(HEADER_SCHEDULE)).toBe(true);
  });

  it("не принимает анонс шоу за расписание пробных", () => {
    const show = "Импровизационное шоу\n11.08 (вт) 19:00\n13.08 (чт) 19:00\nБилеты 60 zl";
    expect(isTrialScheduleAfisha(show)).toBe(false);
  });
});

describe("poetCourseSlugFromText", () => {
  it("различает дисциплины и не гадает на пустой строке", () => {
    expect(poetCourseSlugFromText("Актёрское мастерство")).toBe("acting");
    expect(poetCourseSlugFromText("Импровизация")).toBe("improv");
    expect(poetCourseSlugFromText("PLAY-BACK театр")).toBe("playback");
    expect(poetCourseSlugFromText("20:00")).toBeNull();
    expect(poetCourseSlugFromText("")).toBeNull();
  });
});
