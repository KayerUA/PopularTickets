import { importPKCS8, SignJWT } from "jose";
import { getPublicAppUrl } from "@/lib/publicAppUrl";

export type SearchConsoleConfig = {
  siteUrl: string;
  baseUrl: string;
  clientEmail: string;
  privateKey: string;
};

export function getSearchConsoleConfig(): SearchConsoleConfig | null {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return null;
  const baseUrl = getPublicAppUrl()?.replace(/\/$/, "");
  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!baseUrl || !clientEmail || !privateKey) return null;
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || `${baseUrl}/`;
  const base = new URL(baseUrl);
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length);
    if (base.hostname !== domain && !base.hostname.endsWith(`.${domain}`)) throw new Error("gsc_property_host_mismatch");
  } else if (!`${baseUrl}/`.startsWith(new URL(siteUrl).href.replace(/\/?$/, "/"))) {
    throw new Error("gsc_property_url_mismatch");
  }
  return { siteUrl, baseUrl, clientEmail, privateKey };
}

export type GoogleIndexStatus = {
  verdict?: string;
  coverageState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  indexingState?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
};

export class SearchConsoleClient {
  private token?: Promise<string>;
  constructor(private readonly config: SearchConsoleConfig) {}

  private async accessToken(): Promise<string> {
    if (this.token) return this.token;
    this.token = this.createAccessToken();
    return this.token;
  }

  private async createAccessToken(): Promise<string> {
    const key = await importPKCS8(this.config.privateKey, "RS256");
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/webmasters" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(this.config.clientEmail)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const json = await response.json() as { access_token?: string };
    if (!response.ok || !json.access_token) throw new Error(`gsc_oauth_http_${response.status}`);
    return json.access_token;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const token = await this.accessToken();
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`gsc_api_http_${response.status}`);
    return response;
  }

  async submitSitemap(sitemapUrl: string): Promise<void> {
    await this.request(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.config.siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      { method: "PUT" },
    );
  }

  async inspectUrl(url: string): Promise<GoogleIndexStatus & { inspectionResultLink?: string }> {
    const response = await this.request("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: this.config.siteUrl }),
    });
    const json = await response.json() as {
      inspectionResult?: { indexStatusResult?: GoogleIndexStatus; inspectionResultLink?: string };
    };
    if (!json.inspectionResult?.indexStatusResult) throw new Error("gsc_inspection_result_missing");
    return {
      ...json.inspectionResult.indexStatusResult,
      inspectionResultLink: json.inspectionResult.inspectionResultLink,
    };
  }
}
