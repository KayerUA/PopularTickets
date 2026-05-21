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

/** Нужен ли код контролёра (production или явно задан CHECKIN_OPERATOR_TOKEN). */
export function checkinAuthRequired(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.CHECKIN_OPERATOR_TOKEN?.trim());
}

export async function isCheckinSessionActive(): Promise<boolean> {
  if (!checkinAuthRequired()) return true;
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get(CHECKIN_SESSION_COOKIE)?.value;
  return verifyCheckinSessionToken(token);
}
