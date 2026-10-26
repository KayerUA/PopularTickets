import { SignJWT, jwtVerify } from "jose";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIENCE = "event-rating";

function key(): Uint8Array {
  const secret =
    process.env.EVENT_RATING_SECRET?.trim() ||
    process.env.SEAT_SELECTION_SECRET?.trim() ||
    process.env.ORDER_RECEIPT_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "Для ссылок оценки задайте EVENT_RATING_SECRET, SEAT_SELECTION_SECRET или ORDER_RECEIPT_SECRET (не менее 16 символов)",
    );
  }
  return new TextEncoder().encode(secret);
}

export function isEventRatingSigningConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

const PREVIEW_AUDIENCE = "event-rating-preview";

export async function eventRatingToken(orderId: string) {
  const issuedAt = Math.floor(Date.now() / 86_400_000) * 86_400;
  return new SignJWT({ oid: orderId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 90 * 86_400)
    .sign(key());
}

export async function eventRatingPreviewToken(eventId: string) {
  const issuedAt = Math.floor(Date.now() / 86_400_000) * 86_400;
  return new SignJWT({ eid: eventId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(PREVIEW_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 90 * 86_400)
    .sign(key());
}

export async function eventRatingOrderId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
    });
    return typeof payload.oid === "string" && UUID.test(payload.oid) ? payload.oid : null;
  } catch {
    return null;
  }
}

export async function eventRatingPreviewEventId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      audience: PREVIEW_AUDIENCE,
    });
    return typeof payload.eid === "string" && UUID.test(payload.eid) ? payload.eid : null;
  } catch {
    return null;
  }
}
