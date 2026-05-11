import crypto from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const MAX = 60;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function prune(key: string, now: number) {
  const b = buckets.get(key);
  if (b && now > b.resetAt) buckets.delete(key);
}

function memoryRateLimit(key: string, max: number, windowMs: number): boolean {
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

const upstashLimiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(max: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${max}:${windowSeconds}`;
  let rl = upstashLimiterCache.get(cacheKey);
  if (!rl) {
    const redis = new Redis({ url, token });
    rl = new Ratelimit({
      redis,
      prefix: `popular:rl:${max}w${windowSeconds}`,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    });
    upstashLimiterCache.set(cacheKey, rl);
  }
  return rl;
}

/**
 * Ограничение частоты: при заданных UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN
 * используется Upstash (общий счётчик между инстансами serverless), иначе — in-memory Map.
 */
export async function rateLimit(key: string, max = MAX, windowMs = WINDOW_MS): Promise<boolean> {
  const rl = getUpstashLimiter(max, windowMs);
  if (rl) {
    const { success } = await rl.limit(key);
    return success;
  }
  return memoryRateLimit(key, max, windowMs);
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
