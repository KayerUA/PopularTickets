import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: vi.fn(), submit: vi.fn(), inspect: vi.fn(), checkPage: vi.fn(),
}));
vi.mock("./client", () => ({
  getSearchConsoleConfig: mocks.config,
  SearchConsoleClient: class {
    submitSitemap = mocks.submit;
    inspectUrl = mocks.inspect;
  },
}));
vi.mock("./preflight", async (original) => ({
  ...await original<typeof import("./preflight")>(), checkPublishedPage: mocks.checkPage,
}));
import { syncSearchConsole } from "./sync";

const base = "https://www.populartickets.pl";
const url = `${base}/ru/events/show`;
const locales = ["pl", "uk", "ru"];

function database() {
  const state: Record<string, unknown> = { sitemap_hash: null, submitted_at: null, inspection_report: [], locked_until: null };
  const store = { state, events: [] as { slug: string; starts_at: string }[], missingTable: false };
  const db = {
    from(table: string) {
      let patch: Record<string, unknown> | undefined;
      let claim = false;
      const filters: Record<string, unknown> = {};
      const finish = () => {
        if (store.missingTable) return { error: { message: "table missing" }, data: null };
        if (table === "events") return { data: store.events, error: null };
        if (claim && typeof state.locked_until === "string" && Date.parse(state.locked_until) > Date.now()) return { data: null, error: null };
        if (filters.lock_token && filters.lock_token !== state.lock_token) return { data: null, error: null };
        if (patch) Object.assign(state, patch);
        return { data: { ...state }, error: null };
      };
      const query = {
        upsert: async () => store.missingTable ? { error: { message: "table missing" } } : { error: null },
        update(value: Record<string, unknown>) { patch = value; return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        or() { claim = true; return query; },
        select() { return query; },
        gt() { return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle: async () => finish(),
        then(resolve: (value: unknown) => unknown) { return Promise.resolve(finish()).then(resolve); },
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { db, ...store };
}

function sitemap(urls = [url], modified = "2026-10-29T10:00:00Z") {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    `<urlset>${urls.map((value) => `<url><loc>${value}</loc><lastmod>${modified}</lastmod></url>`).join("")}</urlset>`,
  )));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.mockReturnValue({ siteUrl: `${base}/`, baseUrl: base });
  mocks.submit.mockResolvedValue(undefined);
  mocks.inspect.mockResolvedValue({ verdict: "PASS", coverageState: "Submitted and indexed" });
  mocks.checkPage.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  sitemap();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Search Console publication sync", () => {
  it("does not make requests without credentials", async () => {
    mocks.config.mockReturnValue(null);
    expect(await syncSearchConsole()).toMatchObject({ status: "skipped" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits once, persists the hash, and skips an unchanged sitemap", async () => {
    const { db, state } = database();
    expect(await syncSearchConsole({ db, expectedUrls: [url] })).toMatchObject({ status: "submitted" });
    expect(mocks.checkPage).toHaveBeenCalledWith(url);
    expect(state.submitted_at).toBeTruthy();
    expect(state.lock_token).toBeNull();
    expect(await syncSearchConsole({ db, expectedUrls: [url] })).toMatchObject({ status: "unchanged" });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    sitemap([url], "2026-10-30T10:00:00Z");
    expect(await syncSearchConsole({ db, expectedUrls: [url] })).toMatchObject({ status: "submitted" });
    expect(mocks.submit).toHaveBeenCalledTimes(2);
  });

  it("records submission failures and retries on the next run", async () => {
    const { db, state } = database();
    mocks.submit.mockRejectedValueOnce(new Error("gsc_api_http_503"));
    expect(await syncSearchConsole({ db })).toMatchObject({ status: "failed", reason: "gsc_api_http_503" });
    expect(state.sitemap_hash).toBeNull();
    expect(state.last_error).toBe("gsc_api_http_503");
    expect(state.lock_token).toBeNull();
    expect(await syncSearchConsole({ db })).toMatchObject({ status: "submitted" });
    expect(state.last_error).toBeNull();
  });

  it("does not submit if the new event is missing from sitemap", async () => {
    const { db, state } = database();
    sitemap([`${base}/ru`]);
    expect(await syncSearchConsole({ db, expectedUrls: [url] })).toMatchObject({ status: "failed", reason: `sitemap_url_missing: ${url}` });
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(state.lock_token).toBeNull();
  });

  it("does not submit an event page that fails validation", async () => {
    mocks.checkPage.mockRejectedValueOnce(new Error("page_noindex"));
    expect(await syncSearchConsole({ db: database().db, expectedUrls: [url] })).toMatchObject({ status: "failed", reason: "page_noindex" });
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("refuses to send if durable state is unavailable", async () => {
    const { db } = database();
    vi.spyOn(db, "from").mockReturnValue({ upsert: async () => ({ error: { message: "table missing" } }) } as never);
    expect(await syncSearchConsole({ db })).toMatchObject({ status: "failed", reason: "gsc_state: table missing" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not race another worker, and recovers an expired lease", async () => {
    const { db, state } = database();
    state.locked_until = new Date(Date.now() + 60_000).toISOString();
    expect(await syncSearchConsole({ db })).toEqual({ status: "busy" });
    expect(mocks.submit).not.toHaveBeenCalled();
    state.locked_until = new Date(Date.now() - 60_000).toISOString();
    expect(await syncSearchConsole({ db })).toMatchObject({ status: "submitted" });
  });
});

describe("daily Google index monitoring", () => {
  function upcomingEvents() {
    const store = database();
    store.events.push(...Array.from({ length: 5 }, (_, i) => ({ slug: `show-${i}`, starts_at: new Date(Date.now() + 86_400_000).toISOString() })));
    const urls = store.events.flatMap((event) => locales.map((locale) => `${base}/${locale}/events/${event.slug}`));
    urls.push(...locales.map((locale) => `${base}/${locale}/events/arhiv`));
    urls.push(...locales.flatMap((locale) => ["improv", "acting"].map((course) => `${base}/${locale}/probnoe/${course}`)));
    sitemap(urls);
    return store;
  }

  it("checks events, archive and trial hubs, rotating through all 24 URLs", async () => {
    const { db } = upcomingEvents();
    const first = await syncSearchConsole({ db, inspect: true });
    expect(first.report).toHaveLength(12);
    expect(mocks.checkPage).toHaveBeenCalledTimes(24);
    const second = await syncSearchConsole({ db, inspect: true });
    expect(second.report).toHaveLength(24);
    expect(mocks.inspect).toHaveBeenCalledTimes(24);
    expect(second.report?.filter((row) => row.url.includes("/probnoe/"))).toHaveLength(6);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it("reports unknown URLs separately from successful sitemap submission", async () => {
    const { db, state } = upcomingEvents();
    mocks.inspect.mockResolvedValue({ verdict: "NEUTRAL", coverageState: "URL is unknown to Google" });
    const result = await syncSearchConsole({ db, inspect: true });
    expect(result.status).toBe("submitted");
    expect(result.report?.every((row) => row.needsAttention && row.coverageState === "URL is unknown to Google")).toBe(true);
    expect(state.inspected_at).toBeTruthy();
  });

  it("retains inspection errors without losing the successful submission", async () => {
    const { db, state } = upcomingEvents();
    mocks.inspect.mockRejectedValueOnce(new Error("gsc_api_http_403"));
    const result = await syncSearchConsole({ db, inspect: true });
    expect(result.report?.filter((row) => row.error)).toHaveLength(1);
    expect(state.sitemap_hash).toBeTruthy();
    expect(result.status).toBe("submitted");
  });
});
