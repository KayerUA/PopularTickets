import { describe, expect, it } from "vitest";
import { describeBroadcastPostPreview } from "@/lib/telegram/broadcastPostToGroups";

describe("describeBroadcastPostPreview", () => {
  it("describes single text post with excerpt", () => {
    const text = describeBroadcastPostPreview([42], "Анонс вечера импровизации в субботу!");
    expect(text).toContain("Готово к рассылке");
    expect(text).toContain("Анонс вечера");
  });

  it("describes album", () => {
    const text = describeBroadcastPostPreview([1, 2, 3]);
    expect(text).toContain("альбом (3 сообщ.)");
  });
});
