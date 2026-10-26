import { describe, expect, it } from "vitest";
import {
  newsletterBoeingEmailHtml,
  newsletterBoeingEmailSubject,
  newsletterBoeingEmailText,
} from "./newsletterBoeingEmail";

const event = {
  locale: "ru" as const,
  whenLabel: "воскресенье, 4 октября 2026 г., 19:00",
  venue: "Scena Kocjana · ul. Kocjana 3, Bemowo",
  priceLabel: "70 zł",
  regularPriceLabel: "100 zł",
  imageUrl: "https://example.com/poster.webp",
  url: "https://www.populartickets.pl/ru/events/spektakl-boing-boing-scena-kocjana-2026-10-04?gift=mail",
};

describe("newsletter Boeing email", () => {
  it("is an announcement with a silent 70 zł offer, without printing the promo code", () => {
    const html = newsletterBoeingEmailHtml(event);
    expect(newsletterBoeingEmailSubject("ru")).toContain("Scena Kocjana");
    expect(html).toContain(event.imageUrl);
    expect(html).toContain("9×7");
    expect(html).toContain("gift=mail");
    expect(html).toContain("70 zł");
    expect(html).toContain("Купить билет за 70 zł");
    expect(html).not.toContain("MAIL70");
    expect(html).not.toContain("RATE70");
    expect(html).not.toContain("gift=audience");
    expect(html).not.toContain("Domaniewsk");
    expect(newsletterBoeingEmailText(event)).toContain(event.url);
  });
});
