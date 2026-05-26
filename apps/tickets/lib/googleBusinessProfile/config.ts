export type GoogleGbpConfig = {
  accountId: string;
  locationId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  languageCode: string;
};

export function getGoogleGbpConfig(): GoogleGbpConfig | null {
  const accountId = (process.env.GOOGLE_GBP_ACCOUNT_ID ?? "").trim();
  const locationId = (process.env.GOOGLE_GBP_LOCATION_ID ?? "").trim();
  const clientId = (process.env.GOOGLE_GBP_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.GOOGLE_GBP_CLIENT_SECRET ?? "").trim();
  const refreshToken = (process.env.GOOGLE_GBP_REFRESH_TOKEN ?? "").trim();
  if (!accountId || !locationId || !clientId || !clientSecret || !refreshToken) return null;
  return {
    accountId,
    locationId,
    clientId,
    clientSecret,
    refreshToken,
    languageCode: (process.env.GOOGLE_GBP_LANGUAGE ?? "ru").trim() || "ru",
  };
}

export function isGoogleGbpConfigured(): boolean {
  return getGoogleGbpConfig() !== null;
}
