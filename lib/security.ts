import crypto from "crypto";

const WINDOW_MS = 60_000;
const MAX = 60;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function prune(key: string, now: number) {
  const b = buckets.get(key);
  if (b && now > b.resetAt) buckets.delete(key);
}

export function rateLimit(key: string, max = MAX, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  prune(key, now);
  const existing = buckets.get(key);
  if (!existing) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= max) return false;
  existing.count += 1;
  return true;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
