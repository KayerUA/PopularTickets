import { getGoogleGbpConfig } from "@/lib/googleBusinessProfile/config";

type CachedToken = { accessToken: string; expiresAt: number };

const globalForGbp = globalThis as typeof globalThis & { __gbpAccessTokenCache?: CachedToken };

function tokenCache(): CachedToken | undefined {
  return globalForGbp.__gbpAccessTokenCache;
}

function setTokenCache(cache: CachedToken | undefined): void {
  globalForGbp.__gbpAccessTokenCache = cache;
}

/** OAuth access token из refresh token (serverless-safe in-memory cache). */
export async function getGoogleGbpAccessToken(): Promise<string> {
  const cfg = getGoogleGbpConfig();
  if (!cfg) throw new Error("Google GBP не настроен (GOOGLE_GBP_* env)");

  const cached = tokenCache();
  if (cached && Date.now() < cached.expiresAt - 5 * 60 * 1000) {
    return cached.accessToken;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `GBP OAuth ${res.status}`);
  }

  setTokenCache({
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  });
  return json.access_token;
}
