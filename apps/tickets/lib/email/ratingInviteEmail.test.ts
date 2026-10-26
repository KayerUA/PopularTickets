import { describe, expect, it } from "vitest";
import { ratingInviteEmailHtml, ratingInviteEmailSubject, ratingInviteEmailText } from "./ratingInviteEmail";

const events = [
  {
    title: "Боинг-Боинг",
    whenLabel: "14 июня 2026 г., 19:00",
    url: "https://www.populartickets.pl/ru/rate/a",
  },
  {
    title: "Труффальдино из Бергамо",
    whenLabel: "28 июня 2026 г., 19:00",
    url: "https://www.populartickets.pl/ru/rate/b",
  },
];

describe("rating invite email", () => {
  it("puts a button per event in one letter", () => {
    const html = ratingInviteEmailHtml({ locale: "ru", events });
    expect(html).toContain("Как прошли вечера?");
    expect(html).toContain("Вы были на нескольких вечерах");
    expect(html).toContain("Боинг-Боинг");
    expect(html).toContain("Труффальдино из Бергамо");
    expect(html).toContain(events[0].url);
    expect(html).toContain(events[1].url);
    expect(ratingInviteEmailSubject({ locale: "ru", events })).toBe("Как прошли вечера");
    expect(ratingInviteEmailText({ locale: "ru", events })).toContain(events[0].url);
  });

  it("keeps a single-event letter about that night", () => {
    const html = ratingInviteEmailHtml({ locale: "ru", events: [events[1]] });
    expect(html).toContain("Как прошёл вечер?");
    expect(html).not.toContain("нескольких вечерах");
    expect(ratingInviteEmailSubject({ locale: "ru", events: [events[1]] })).toContain("Труффальдино");
  });
});
