import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Shared CRM↔Tickets secret check (Bearer or x-crm-checkout-secret). */
export function authorizeCrmRequest(request: NextRequest): boolean {
  const expected = process.env.CRM_CHECKOUT_SECRET?.trim();
  if (!expected) return false;
  const supplied =
    request.headers.get("x-crm-checkout-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
