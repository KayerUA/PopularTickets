import { SignJWT, jwtVerify } from "jose";
import type { AppLocale } from "@/i18n/routing";

const issuer = "popular-tickets";
const audience = "ticket-wallet";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signingKey(): Uint8Array | null {
  const secret = process.env.WALLET_LINK_SECRET?.trim();
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

export function isWalletLinkSigningConfigured(): boolean {
  return signingKey() !== null;
}

export async function signWalletTicketToken(ticketId: string, locale: AppLocale): Promise<string | null> {
  const key = signingKey();
  if (!key || !uuid.test(ticketId)) return null;
  return new SignJWT({ locale })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(ticketId)
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(key);
}

export async function verifyWalletTicketToken(token: string): Promise<{ ticketId: string; locale: AppLocale } | null> {
  const key = signingKey();
  if (!key || token.length > 2048) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"], issuer, audience });
    if (!payload.sub || !uuid.test(payload.sub) || typeof payload.exp !== "number") return null;
    if (payload.locale !== "pl" && payload.locale !== "ru" && payload.locale !== "uk") return null;
    return { ticketId: payload.sub, locale: payload.locale };
  } catch {
    return null;
  }
}
