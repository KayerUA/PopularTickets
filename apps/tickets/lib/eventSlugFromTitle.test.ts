import { describe, expect, it } from "vitest";
import {
  buildEventSlugFromTitleAndDate,
  dateSuffixFromAdminStartsAt,
  slugifyEventTitle,
} from "@/lib/eventSlugFromTitle";

describe("buildEventSlugFromTitleAndDate", () => {
  it("appends warsaw date from datetime-local", () => {
    expect(buildEventSlugFromTitleAndDate("Импровизация", "2026-05-21T21:00")).toBe("improvizatsiya-2026-05-21");
  });

  it("parses date prefix", () => {
    expect(dateSuffixFromAdminStartsAt("2026-05-21T21:00")).toBe("2026-05-21");
  });

  it("drops stop words for SEO", () => {
    expect(buildEventSlugFromTitleAndDate("Пробное занятие по импровизации в Варшаве", "2026-05-21T19:00")).toBe(
      "probnoe-zanyatie-improvizatsii-varshave-2026-05-21",
    );
  });

  it("keeps the date even for long titles (word-boundary truncation)", () => {
    const slug = buildEventSlugFromTitleAndDate(
      "Большой вечерний спектакль импровизации и живого театра в Варшаве — театр Популярный поэт",
      "2026-05-21T19:00",
    );
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-2026-05-21")).toBe(true);
    expect(slug).not.toMatch(/-$/);
  });
});

describe("slugifyEventTitle", () => {
  it("removes ru/pl/en stop words", () => {
    expect(slugifyEventTitle("Концерт на сцене и в зале")).toBe("kontsert-stsene-zale");
  });

  it("falls back to original tokens when all are stop words", () => {
    expect(slugifyEventTitle("в и на")).toBe("v-i-na");
  });
});
