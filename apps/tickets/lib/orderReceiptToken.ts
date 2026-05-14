import { SignJWT, jwtVerify } from "jose";
import type { AppLocale } from "@/i18n/routing";

const CLAIM = "oid";

function secretBytes(): Uint8Array | null {
  const s = process.env.ORDER_RECEIPT_SECRET?.trim();
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

/** Подписанные ссылки на чек: включено, если задан ORDER_RECEIPT_SECRET (≥16 символов). */
export function isOrderReceiptSigningConfigured(): boolean {
  return secretBytes() !== null;
}

/** Срок жизни ссылки (ожидание оплаты + возврат к странице). */
const RECEIPT_JWT_MAX_AGE = "7d";

export async function signOrderReceiptToken(orderId: string): Promise<string | null> {
  const key = secretBytes();
  if (!key) return null;
  return new SignJWT({ [CLAIM]: orderId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(RECEIPT_JWT_MAX_AGE)
    .sign(key);
}

export async function verifyOrderReceiptToken(token: string): Promise<string | null> {
  const key = secretBytes();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const oid = payload[CLAIM];
    if (typeof oid !== "string" || !oid) return null;
    return oid;
  } catch {
    return null;
  }
}

/** Путь (pathname + query) для редиректа после оплаты: с `rt`, если включена подпись, иначе legacy `order`. */
export async function buildCheckoutReturnPath(locale: AppLocale, orderId: string): Promise<string> {
  const rt = await signOrderReceiptToken(orderId);
  if (rt) return `/${locale}/checkout/return?rt=${encodeURIComponent(rt)}`;
  return `/${locale}/checkout/return?order=${encodeURIComponent(orderId)}`;
}
