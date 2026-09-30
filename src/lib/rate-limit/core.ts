/**
 * Fixed-window, per-user rate limiting. The store is pluggable: Mongo is the
 * shared source of truth across serverless instances, and an in-memory store
 * is the fallback when Mongo is unreachable (and the store used in tests).
 */
import { RateLimitError } from "@/lib/errors";

export interface HitResult {
  count: number;
  /** Epoch ms when the current window ends. */
  resetAt: number;
}

export interface HitInput {
  key: string;
  userId: string;
  name: string;
  windowStart: number;
  windowMs: number;
}

export interface RateLimitStore {
  /** Increments the counter for `key` in the window starting at `windowStart`. */
  hit(input: HitInput): Promise<HitResult>;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  name: string;
  limit: number;
  windowMs?: number;
  store: RateLimitStore;
  fallback?: RateLimitStore;
  now?: () => number;
  onStoreError?: (error: unknown) => void;
}

export interface RateLimiter {
  check(userId: string): Promise<RateLimitResult>;
  /** Like `check`, but throws RateLimitError when over the limit. */
  enforce(userId: string): Promise<RateLimitResult>;
}

export function createRateLimiter({
  name,
  limit,
  windowMs = 60_000,
  store,
  fallback,
  now = Date.now,
  onStoreError = (error) =>
    console.error(`[rate-limit:${name}] store failed, using fallback`, error),
}: RateLimiterOptions): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("limit must be a positive integer");
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error("windowMs must be a positive integer");
  }

  async function check(userId: string): Promise<RateLimitResult> {
    if (!userId) throw new Error("userId is required for rate limiting");
    const current = now();
    const windowStart = current - (current % windowMs);
    const input = { key: `${name}:${userId}`, userId, name, windowStart, windowMs };

    let hit: HitResult;
    try {
      hit = await store.hit(input);
    } catch (error) {
      if (!fallback) throw error;
      onStoreError(error);
      hit = await fallback.hit(input);
    }

    const allowed = hit.count <= limit;
    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - hit.count),
      resetAt: hit.resetAt,
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((hit.resetAt - current) / 1000)),
    };
  }

  return {
    check,
    async enforce(userId) {
      const result = await check(userId);
      if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
      return result;
    },
  };
}

/** Per-process counters. Good for dev, tests and as a fallback; not shared across instances. */
export function createMemoryStore({ now = Date.now, maxKeys = 10_000 } = {}): RateLimitStore {
  const buckets = new Map<string, { windowStart: number; count: number; resetAt: number }>();

  function sweep() {
    const current = now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= current) buckets.delete(key);
    }
  }

  return {
    async hit({ key, windowStart, windowMs }) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.windowStart !== windowStart) {
        if (buckets.size >= maxKeys) sweep();
        bucket = { windowStart, count: 0, resetAt: windowStart + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return { count: bucket.count, resetAt: bucket.resetAt };
    },
  };
}
