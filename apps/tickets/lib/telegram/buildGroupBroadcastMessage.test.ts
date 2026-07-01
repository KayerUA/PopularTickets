import { describe, expect, it } from "vitest";
import {
  buildGroupBroadcastContent,
  extractBroadcastTeaser,
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
  it("builds selling trial caption with bullets, price and ticket url", () => {
    const { photoCaption, previewMessage, ticketUrl } = buildGroupBroadcastContent(
      "https://www.populartickets.pl",
      {
        slug: "probnoe-improv-2026-05-21",
        title: "Пробное занятие по импровизации в Варшаве",
        description:
          "Приходите попробовать импровизацию без опыта. Живой зал, поддержка, смех и знакомство с театром.",
        venue: "ul. Domaniewska 37, Warszawa",
        startsAtIso: "2026-05-21T17:00:00.000Z",
        priceGrosze: 7000,
        dayOfEventPriceGrosze: null,
        listingKind: "trial",
      },
    );

    expect(ticketUrl).toBe("https://www.populartickets.pl/ru/events/probnoe-improv-2026-05-21");
    expect(photoCaption).toContain("ПРОБНОЕ ЗАНЯТИЕ ПО ИМПРОВИЗАЦИИ");
    expect(photoCaption).toContain("✨ Учимся быстро мыслить");
    expect(photoCaption).toContain("Популярный поэт");
    expect(photoCaption).toContain("🎟 Пробное занятие — 70 zł");
    expect(photoCaption).toContain("Билеты на сайте");
    expect(photoCaption).toContain(ticketUrl);
    expect(photoCaption).toContain("Без опыта");
    expect(previewMessage).toContain(ticketUrl);
  });
});
