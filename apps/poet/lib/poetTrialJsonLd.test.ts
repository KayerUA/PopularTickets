import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPoetTrialItemListJsonLd, buildTrialEventSeriesJsonLd } from "./poetTrialJsonLd";
import type { PoetTrialDisplay } from "./poetTrials";

const base = "https://www.popularpoet.pl";
const trial: PoetTrialDisplay = {
  id: "trial-1", title: "Пробное занятие", body: "Два часа импровизации",
  starts_at: "2026-11-15T16:00:00Z", ends_at: "2026-11-15T18:00:00Z",
  slug: "trial-improv", courseId: "course-1", courseSlug: "improv", courseLine: "Импровизация",
  venue: "ul. Domaniewska 37", priceGrosze: 10_000, imageUrl: "/courses/impro.jpg",
  imageFocalX: null, imageFocalY: null, eventLanguage: "ru", status: null,
  totalTickets: 12, remainingTickets: 10,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-29T12:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_POET_SITE_URL", base);
  vi.stubEnv("NEXT_PUBLIC_TICKETS_SITE_URL", "https://www.populartickets.pl");
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

function eventFor(imageUrl: string | null) {
  const data = buildPoetTrialItemListJsonLd({ trials: [{ ...trial, imageUrl }], locale: "ru", listName: "Пробные" })!;
  return (data.itemListElement as { item: Record<string, unknown> }[])[0].item;
}

describe("Poet event images", () => {
  it.each([
    ["/courses/impro.jpg", `${base}/courses/impro.jpg`],
    ["  /courses/akterka.jpg  ", `${base}/courses/akterka.jpg`],
    ["courses/impro.jpg", `${base}/courses/impro.jpg`],
    ["https://storage.example/image.webp", "https://storage.example/image.webp"],
    ["//cdn.example/image.jpg", "https://cdn.example/image.jpg"],
  ])("resolves %s to a crawlable absolute URL", (source, expected) => {
    expect(eventFor(source).image).toBe(expected);
  });

  it.each([null, "", " ", "javascript:alert(1)", "data:image/png;base64,abc", "https://["])("omits invalid image %s", (source) => {
    expect(eventFor(source)).not.toHaveProperty("image");
  });

  it("does not publish a relative image when no base URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_POET_SITE_URL", "");
    expect(eventFor("/courses/impro.jpg")).not.toHaveProperty("image");
    expect(eventFor("https://storage.example/photo.jpg").image).toBe("https://storage.example/photo.jpg");
  });

  it("also resolves images in course EventSeries", () => {
    const data = buildTrialEventSeriesJsonLd({ trials: [trial], locale: "pl", name: "Improwizacja", description: "Zajęcia", url: `${base}/pl/kursy/improv` })!;
    expect((data.subEvent as Record<string, unknown>[])[0].image).toBe(`${base}/courses/impro.jpg`);
  });

  it("retains the real date capacity, address and price", () => {
    const event = eventFor(trial.imageUrl);
    expect(event.maximumAttendeeCapacity).toBe(12);
    expect(event.startDate).toBe(trial.starts_at);
    expect(event.endDate).toBe(trial.ends_at);
    expect(event.location).toMatchObject({ address: { addressLocality: "Warszawa", addressCountry: "PL" } });
    expect(event.offers).toMatchObject({ price: "100.00", priceCurrency: "PLN", url: "https://www.populartickets.pl/ru/probnoe/improv?d=trial-improv" });
  });
});
