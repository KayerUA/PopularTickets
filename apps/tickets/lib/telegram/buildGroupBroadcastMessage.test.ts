import { describe, expect, it } from "vitest";
import {
  buildGroupBroadcastContent,
  extractBroadcastTeaser,
  formatTrialDateBullet,
} from "@/lib/telegram/buildGroupBroadcastMessage";

describe("extractBroadcastTeaser", () => {
  it("strips ticket footer boilerplate", () => {
    const raw =
      "Вечер импровизации для всех, кто хочет посмеяться и расслабиться. Билеты онлайн — populartickets.pl · театр «Популярный поэт», Warszawa.";
    expect(extractBroadcastTeaser(raw)).toBe(
      "Вечер импровизации для всех, кто хочет посмеяться и расслабиться.",
    );
  });
});

describe("buildGroupBroadcastContent", () => {
  it("builds a permanent trial hub caption with schedule and hub url", () => {
    const { photoCaption, previewMessage, ticketUrl, buttonLabel } = buildGroupBroadcastContent(
      "https://www.populartickets.pl",
      {
        slug: "probnoe-improv-2026-05-21",
        title: "Пробное занятие по импровизации в Варшаве",
        description:
          "Приходите попробовать импровизацию без опыта. Живой зал, поддержка, смех и знакомство с театром.",
        venue: "ul. Domaniewska 37, Warszawa",
        startsAtIso: "2026-05-21T16:00:00.000Z",
        priceGrosze: 7000,
        dayOfEventPriceGrosze: null,
        listingKind: "trial",
        poetCourseSlug: "improv",
        upcomingDates: [
          "2026-05-21T16:00:00.000Z",
          "2026-05-23T16:00:00.000Z",
          "2026-05-25T10:30:00.000Z",
        ],
      },
    );

    expect(ticketUrl).toBe("https://www.populartickets.pl/ru/probnoe/improv");
    expect(buttonLabel).toBe("🎟 Выбрать дату");
    expect(photoCaption).toContain("ПРОБНОЕ · ИМПРОВИЗАЦИЯ");
    expect(photoCaption).toContain("Ближайшие даты:");
    expect(photoCaption).toContain(formatTrialDateBullet("2026-05-21T16:00:00.000Z"));
    expect(photoCaption).toContain("Популярный поэт");
    expect(photoCaption).toContain("70 zł");
    expect(photoCaption).toContain(ticketUrl);
    expect(photoCaption).toContain("одной ссылке");
    expect(previewMessage).toContain("не протухает");
  });

  it("keeps performance posts on the event page", () => {
    const { ticketUrl, buttonLabel } = buildGroupBroadcastContent("https://www.populartickets.pl", {
      slug: "improv-show-friday",
      title: "Improv Show",
      description: "Вечер импровизации.",
      venue: "ul. Domaniewska 37",
      startsAtIso: "2026-05-21T17:00:00.000Z",
      priceGrosze: 6000,
      dayOfEventPriceGrosze: null,
      listingKind: "performance",
      poetCourseSlug: null,
      upcomingDates: [],
    });
    expect(ticketUrl).toBe("https://www.populartickets.pl/ru/events/improv-show-friday");
    expect(buttonLabel).toBe("🎫 Билеты");
  });
});
