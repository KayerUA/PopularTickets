import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPublishedPage, sitemapEntries, sitemapFingerprint } from "./preflight";

const base = "https://www.populartickets.pl";
const url = `${base}/ru/events/show`;
const xml = (body: string) => `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
const entry = (location: string, modified = "2026-10-29T10:00:00Z") => `<url><loc>${location}</loc><lastmod>${modified}</lastmod></url>`;

afterEach(() => vi.unstubAllGlobals());

describe("sitemap validation", () => {
  it("hashes URL and modification date, independent of ordering or priority", () => {
    const a = sitemapEntries(xml(entry(url) + entry(`${base}/ru`)), base);
    const b = sitemapEntries(xml(entry(`${base}/ru`) + entry(url).replace("</url>", "<priority>0.9</priority></url>")), base);
    expect(sitemapFingerprint(a)).toBe(sitemapFingerprint(b));
    const changed = sitemapEntries(xml(entry(url, "2026-10-30T10:00:00Z") + entry(`${base}/ru`)), base);
    expect(sitemapFingerprint(a)).not.toBe(sitemapFingerprint(changed));
  });

  it.each([
    ["<html>error</html>", "invalid_xml"],
    [xml(""), "empty"],
    [xml(entry("https://other.example/event")), "foreign_host"],
    [xml(entry(url, "yesterday")), "invalid_lastmod"],
    [xml("<url></url>"), "location_missing"],
  ])("rejects invalid sitemap %s", (body, error) => {
    expect(() => sitemapEntries(body, base)).toThrow(error);
  });
});

describe("published page validation", () => {
  function respond(body: string, status = 200, headers: Record<string, string> = {}) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      status, headers: { "content-type": "text/html; charset=utf-8", ...headers },
    })));
  }

  it("accepts a canonical indexable page", async () => {
    respond(`<html><link href='${url}' rel='canonical'><meta content='index, follow' name='robots'></html>`);
    await expect(checkPublishedPage(url)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ redirect: "manual", cache: "no-store" }));
  });

  it.each([301, 404, 503])("rejects HTTP %i", async (status) => {
    respond("unavailable", status);
    await expect(checkPublishedPage(url)).rejects.toThrow(`page_http_${status}`);
  });

  it.each([
    `<meta name="robots" content="noindex,follow">`,
    `<META CONTENT='NONE' NAME='googlebot'>`,
  ])("rejects robots exclusion %s", async (meta) => {
    respond(`<link rel="canonical" href="${url}">${meta}`);
    await expect(checkPublishedPage(url)).rejects.toThrow("noindex");
  });

  it("checks HTTP robots headers", async () => {
    respond(`<link rel="canonical" href="${url}">`, 200, { "x-robots-tag": "googlebot: noindex" });
    await expect(checkPublishedPage(url)).rejects.toThrow("noindex");
  });

  it("rejects missing or wrong canonical", async () => {
    respond(`<link rel="canonical" href="${base}/ru">`);
    await expect(checkPublishedPage(url)).rejects.toThrow("canonical_mismatch");
    respond("<html>not found</html>");
    await expect(checkPublishedPage(url)).rejects.toThrow("canonical_mismatch");
  });

  it("ignores robots examples in scripts and comments", async () => {
    respond(`<link rel="canonical" href="${url}"><!-- <meta name="robots" content="noindex"> --><script>"<meta name='robots' content='noindex'>"</script>`);
    await expect(checkPublishedPage(url)).resolves.toBeUndefined();
  });
});
