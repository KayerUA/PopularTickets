import { describe, expect, it } from "vitest";
import {
  TELEGRAM_MASTER_GROUP,
  broadcastAudienceLabel,
} from "@/lib/telegram/broadcastChatStore";

describe("broadcast audiences", () => {
  it("uses the configured existing group as the master audience", () => {
    expect(TELEGRAM_MASTER_GROUP).toEqual({
      id: -1003895335306,
      title: "POPULAR IMPRO",
    });
    expect(broadcastAudienceLabel("master")).toContain("POPULAR IMPRO");
  });

  it("labels the all-groups audience clearly", () => {
    expect(broadcastAudienceLabel("all")).toContain("Все группы");
  });
});
