import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { sync } = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("@/lib/searchConsole/sync", () => ({ syncSearchConsole: sync }));
vi.mock("@/lib/publicAppUrl", () => ({ getPublicAppUrl: () => "https://www.populartickets.pl" }));
vi.mock("@/lib/googleBusinessProfile/config", () => ({ isGoogleGbpConfigured: () => false }));
vi.mock("@/lib/googleBusinessProfile/gbpManualFallback", () => ({ isGbpManualFallbackEnabled: () => false }));
import { runEventDiscovery } from "./notifyEventPublished";
import { formatDiscoveryStatusForTelegram } from "./formatDiscoveryStatus";

const payload = {
  slug: "show", title: "Show", description: "Description", venue: "Venue",
  starts_at: "2026-12-01T19:00:00Z", price_grosze: 5000, listing_kind: "performance",
  maps_url: null, visibility: "published",
};
beforeEach(() => {
  vi.stubEnv("INDEXNOW_KEY", "");
  vi.stubEnv("EVENT_DISCOVERY_WEBHOOK_URL", "");
  sync.mockResolvedValue({ status: "submitted" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("publication discovery", () => {
  it("sends all three language URLs for published performances", async () => {
    const result = await runEventDiscovery(payload);
    expect(sync).toHaveBeenCalledWith({ expectedUrls: ["pl", "uk", "ru"].map((locale) => `https://www.populartickets.pl/${locale}/events/show`) });
    expect(result.searchConsole?.status).toBe("submitted");
    expect(formatDiscoveryStatusForTelegram(result)).toContain("индексацию проверим отдельно");
  });
  it.each(["unlisted", "inactive"])("does not submit a %s event", async (visibility) => {
    await runEventDiscovery({ ...payload, visibility });
    expect(sync).not.toHaveBeenCalled();
  });
  it("does not require redirected trial URLs in the sitemap", async () => {
    await runEventDiscovery({ ...payload, listing_kind: "trial" });
    expect(sync).toHaveBeenCalledWith({ expectedUrls: [] });
  });
  it("returns Google failure without undoing publication", async () => {
    sync.mockResolvedValue({ status: "failed", reason: "gsc_api_http_503" });
    const result = await runEventDiscovery(payload);
    expect(result.searchConsole?.status).toBe("failed");
    expect(formatDiscoveryStatusForTelegram(result)).toContain("повторим при следующей сверке");
  });
  it("shows missing credentials explicitly", async () => {
    sync.mockResolvedValue({ status: "skipped", reason: "not_configured_or_not_production" });
    const result = await runEventDiscovery(payload);
    expect(formatDiscoveryStatusForTelegram(result)).toContain("автоматическая отправка не подключена");
  });
});
