import { describe, expect, it } from "vitest";
import { buildGbpManualPost, formatGbpManualTelegramMessage } from "@/lib/googleBusinessProfile/gbpManualFallback";

describe("gbpManualFallback", () => {
  it("builds post with summary and warsaw date", () => {
    const post = buildGbpManualPost({
      title: "Импров-шоу",
      description: "Вечер импровизации в театре.",
      startsAtIso: "2026-06-06T15:30:00.000Z",
      ticketUrl: "https://www.populartickets.pl/ru/events/improv",
      imageUrl: "https://cdn.example/cover.jpg",
      venue: "Teatr Popular Poet",
      pricePln: 50,
    });

    expect(post.title).toBe("Импров-шоу");
    expect(post.summary).toContain("Импров-шоу");
    expect(post.startsAtLabel).toMatch(/июн/i);
    expect(post.ticketUrl).toContain("/ru/events/improv");
    expect(post.imageUrl).toBe("https://cdn.example/cover.jpg");
  });

  it("formats telegram message with manual steps", () => {
    const text = formatGbpManualTelegramMessage(
      buildGbpManualPost({
        title: "Шоу",
        description: "Описание.",
        startsAtIso: "2026-06-06T15:30:00.000Z",
        ticketUrl: "https://www.populartickets.pl/ru/events/show",
      }),
    );

    expect(text).toContain("Google Business — вручную");
    expect(text).toContain("business.google.com");
    expect(text).toContain("Забронировать");
  });
});
