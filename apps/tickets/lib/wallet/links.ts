import type { AppLocale } from "@/i18n/routing";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { isAppleWalletConfigured } from "./apple";
import { isGoogleWalletConfigured } from "./google";
import { signWalletTicketToken } from "./token";

export type WalletLinks = { apple?: string; google?: string };

export async function buildTicketWalletLinks(ticketId: string, locale: AppLocale): Promise<WalletLinks> {
  const apple = isAppleWalletConfigured();
  const google = isGoogleWalletConfigured();
  if (!apple && !google) return {};
  const base = getPublicAppUrl();
  if (!base) return {};
  try {
    const origin = new URL(base);
    if (origin.protocol !== "https:" || origin.username || origin.password) return {};
    const token = await signWalletTicketToken(ticketId, locale);
    if (!token) return {};
    const link = (provider: string) => {
      const url = new URL(`/api/wallet/${provider}`, origin);
      url.searchParams.set("token", token);
      return url.toString();
    };
    return { ...(apple ? { apple: link("apple") } : {}), ...(google ? { google: link("google") } : {}) };
  } catch {
    return {};
  }
}
