import { describe, expect, it } from "vitest";
import {
  formatUpcomingEventsMessage,
  type UpcomingEventRow,
} from "@/lib/telegram/upcomingEventsBot";

const sample: UpcomingEventRow[] = [
  {
    id: "a",
    slug: "probnoe-improv",
    title: "Пробное занятие по импровизации",
    startsAtIso: "2026-06-30T16:00:00.000Z",
    listingKind: "trial",
    visibility: "published",
  },
];

describe("formatUpcomingEventsMessage", () => {
  it("lists upcoming events with links", () => {
    const text = formatUpcomingEventsMessage(sample, 0, "https://www.populartickets.pl");
    expect(text).toContain("Предстоящие события");
    expect(text).toContain("Пробное занятие");
    expect(text).toContain("/ru/events/probnoe-improv");
    expect(text).toContain("повторная рассылка");
  });

  it("handles empty list", () => {
    expect(formatUpcomingEventsMessage([], 0, "https://x.pl")).toContain("Нет предстоящих");
  });
});
