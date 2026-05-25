import { describe, expect, it } from "vitest";
import { buildEventSlugFromTitleAndDate, dateSuffixFromAdminStartsAt } from "@/lib/eventSlugFromTitle";

describe("buildEventSlugFromTitleAndDate", () => {
  it("appends warsaw date from datetime-local", () => {
    expect(buildEventSlugFromTitleAndDate("Импровизация", "2026-05-21T21:00")).toBe("improvizatsiya-2026-05-21");
  });

  it("parses date prefix", () => {
    expect(dateSuffixFromAdminStartsAt("2026-05-21T21:00")).toBe("2026-05-21");
  });
});
