/**
 * Rate limiters for expensive routes. Usage inside withAction/withRoute:
 *
 *   const { userId } = await requireUser();
 *   await rateLimits.ai.enforce(userId); // throws RateLimitError → 429 / rate_limited
 */
import "server-only";

import { connectDb } from "@/lib/db/connection";
import { RateLimitBucket } from "@/lib/db/models/rate-limit-bucket";

import { createMemoryStore, createRateLimiter, type RateLimitStore } from "./core";

export * from "./core";

/** Atomic `$inc` upsert on one document per user per window. */
export const mongoStore: RateLimitStore = {
  async hit({ key, userId, name, windowStart, windowMs }) {
    await connectDb();
    const resetAt = windowStart + windowMs;
    const bucket = await RateLimitBucket.findOneAndUpdate(
      { _id: `${key}:${windowStart}` },
      { $inc: { count: 1 }, $setOnInsert: { userId, name, expiresAt: new Date(resetAt) } },
      { upsert: true, returnDocument: "after", projection: { count: 1 } },
    ).lean();
    return { count: bucket?.count ?? 1, resetAt };
  },
};

const memoryFallback = createMemoryStore();

export const rateLimits = {
  /** Advisor / assistant model calls. */
  ai: createRateLimiter({ name: "ai", limit: 20, store: mongoStore, fallback: memoryFallback }),
  /** Bank-statement and import uploads. */
  upload: createRateLimiter({
    name: "upload",
    limit: 5,
    store: mongoStore,
    fallback: memoryFallback,
  }),
};
