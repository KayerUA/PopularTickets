import { describe, expect, it } from "vitest";
import {
  getDraftImageFocals,
  setDraftImageFocal,
  IMAGE_FOCALS_KEY,
} from "@/lib/telegram/draftImageFocal";

describe("draftImageFocal", () => {
  it("defaults to center and saves per index", () => {
    expect(getDraftImageFocals({}, 2)).toEqual([
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ]);

    const next = setDraftImageFocal({}, 1, { x: 30, y: 70 });
    expect(next[IMAGE_FOCALS_KEY]).toEqual([
      { x: 50, y: 50 },
      { x: 30, y: 70 },
    ]);
  });
});
