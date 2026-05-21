import { SignJWT, jwtVerify } from "jose";

function secret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_JWT_SECRET должен быть не короче 16 символов");
  }
  return new TextEncoder().encode(s);
}

export const CHECKIN_SESSION_COOKIE = "checkin_session";

export async function signCheckinSessionToken(): Promise<string> {
  return new SignJWT({ role: "checkin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifyCheckinSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "checkin";
  } catch {
    return false;
  }
}

/** Пароль контролёра для /check-in. CHECKIN_OPERATOR_TOKEN — устаревший алиас. */
export function readCheckinPasswordEnv(): string | undefined {
  const v = process.env.CHECKIN_PASSWORD?.trim() || process.env.CHECKIN_OPERATOR_TOKEN?.trim();
  return v || undefined;
}

/** Нужен ли вход (production или явно задан CHECKIN_PASSWORD). */
export function checkinAuthRequired(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(readCheckinPasswordEnv());
}

export async function isCheckinSessionActive(): Promise<boolean> {
  if (!checkinAuthRequired()) return true;
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get(CHECKIN_SESSION_COOKIE)?.value;
  return verifyCheckinSessionToken(token);
}
