import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
const { sync } = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("./sync", () => ({ syncSearchConsole: sync }));
import { GET } from "@/app/api/cron/search-discovery/route";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = (authorization?: string) => new NextRequest("https://www.populartickets.pl/api/cron/search-discovery", {
  headers: authorization ? { authorization } : {},
});

describe("search discovery cron", () => {
  it("rejects requests when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer undefined"))).status).toBe(404);
    expect(sync).not.toHaveBeenCalled();
  });
  it("rejects unauthorized requests", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect((await GET(request("Bearer wrong"))).status).toBe(404);
    expect(sync).not.toHaveBeenCalled();
  });
  it("runs inspection and reports failures to the scheduler", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    sync.mockResolvedValue({ status: "failed", reason: "gsc_api_http_503" });
    const response = await GET(request("Bearer test-secret"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "failed", reason: "gsc_api_http_503" });
    expect(sync).toHaveBeenCalledWith({ inspect: true });
  });
});
