import { SignJWT, jwtVerify } from "jose";

function secret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_JWT_SECRET должен быть не короче 16 символов");
  }
  return new TextEncoder().encode(s);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}
