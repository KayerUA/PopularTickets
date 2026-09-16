import { SignJWT, jwtVerify } from "jose";

function key() {
  const secret = process.env.SEAT_SELECTION_SECRET?.trim();
  if (!secret || secret.length < 16) throw new Error("Для выбора мест задайте SEAT_SELECTION_SECRET (не менее 16 символов)");
  return new TextEncoder().encode(secret);
}
export async function seatingToken(orderId: string) {
  const issuedAt = Math.floor(Date.now() / 86_400_000) * 86_400;
  return new SignJWT({ oid: orderId }).setProtectedHeader({ alg: "HS256" })
    .setAudience("seat-selection").setIssuedAt(issuedAt).setExpirationTime(issuedAt + 90 * 86_400).sign(key());
}
export async function seatingOrderId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: "seat-selection" });
    return typeof payload.oid === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.oid) ? payload.oid : null;
  } catch { return null; }
}
