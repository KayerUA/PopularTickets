import { generateKeyPairSync } from "node:crypto";
import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/publicAppUrl", () => ({ getPublicAppUrl: () => "https://www.populartickets.pl" }));
import { getSearchConsoleConfig, SearchConsoleClient } from "./client";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const base = "https://www.populartickets.pl";
const email = "test@example.iam.gserviceaccount.com";

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL", email);
  vi.stubEnv("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY", pem);
  vi.stubEnv("GOOGLE_SEARCH_CONSOLE_SITE_URL", `${base}/`);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Search Console credentials", () => {
  it("requires a private key as well as an email", () => {
    vi.stubEnv("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY", "");
    expect(getSearchConsoleConfig()).toBeNull();
  });
  it("does not send production notifications from preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getSearchConsoleConfig()).toBeNull();
  });
  it("accepts a domain property and escaped PEM newlines", () => {
    vi.stubEnv("GOOGLE_SEARCH_CONSOLE_SITE_URL", "sc-domain:populartickets.pl");
    vi.stubEnv("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY", pem.replace(/\n/g, "\\n"));
    expect(getSearchConsoleConfig()).toMatchObject({ siteUrl: "sc-domain:populartickets.pl", privateKey: pem.trim() });
  });
  it.each(["sc-domain:other.example", "https://www.populartickets.pl/admin/"])("rejects property mismatch %s", (site) => {
    vi.stubEnv("GOOGLE_SEARCH_CONSOLE_SITE_URL", site);
    expect(getSearchConsoleConfig).toThrow("mismatch");
  });
});

describe("Search Console API", () => {
  it("signs the correct OAuth scope and reuses authorization for concurrent requests", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("oauth2.googleapis.com")) {
        return Response.json({ access_token: "test-token", expires_in: 3600 });
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new SearchConsoleClient(getSearchConsoleConfig()!);
    await Promise.all([client.submitSitemap(`${base}/sitemap.xml`), client.submitSitemap(`${base}/sitemap.xml`)]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(fetch).mock.calls;
    const assertion = (calls[0][1]!.body as URLSearchParams).get("assertion")!;
    expect(decodeJwt(assertion)).toMatchObject({ iss: email, scope: "https://www.googleapis.com/auth/webmasters", aud: "https://oauth2.googleapis.com/token" });
    expect(calls[1][0]).toBe(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(`${base}/`)}/sitemaps/${encodeURIComponent(`${base}/sitemap.xml`)}`);
    expect(calls[1][1]).toMatchObject({ method: "PUT", headers: { Authorization: "Bearer test-token" } });
    expect(calls[1][1]?.body).toBeUndefined();
  });

  it("reads index status without requesting unsupported event indexing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input) => String(input).includes("oauth2.googleapis.com")
      ? Response.json({ access_token: "test-token" })
      : Response.json({ inspectionResult: { indexStatusResult: { verdict: "NEUTRAL", coverageState: "URL is unknown to Google" }, inspectionResultLink: "https://search.google.com/search-console/inspect" } })));
    const client = new SearchConsoleClient(getSearchConsoleConfig()!);
    const url = `${base}/ru/events/show`;
    expect(await client.inspectUrl(url)).toMatchObject({ coverageState: "URL is unknown to Google" });
    const request = vi.mocked(fetch).mock.calls[1];
    expect(request[0]).toBe("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect");
    expect(JSON.parse(request[1]!.body as string)).toEqual({ inspectionUrl: url, siteUrl: `${base}/` });
  });

  it("does not expose OAuth error bodies or credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error_description: "sensitive server detail" }, { status: 403 })));
    const client = new SearchConsoleClient(getSearchConsoleConfig()!);
    await expect(client.submitSitemap(`${base}/sitemap.xml`)).rejects.toThrow("gsc_oauth_http_403");
  });
});
