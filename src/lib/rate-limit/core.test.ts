// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { RateLimitError } from "@/lib/errors";

import { createMemoryStore, createRateLimiter, type RateLimitStore } from "./core";

function clock(start = Date.UTC(2026, 8, 30, 4, 30, 0)) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function limiter(limit = 3, c = clock()) {
  const store = createMemoryStore({ now: c.now });
  return { c, rl: createRateLimiter({ name: "ai", limit, store, now: c.now }) };
}

describe("createRateLimiter with the memory store", () => {
  it("allows up to the limit, then blocks", async () => {
    const { rl } = limiter(3);
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rl.check("u1"));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
  });

  it("reports retryAfterSeconds until the window resets", async () => {
    const { rl, c } = limiter(1);
    await rl.check("u1");
    c.advance(45_000);
    const blocked = await rl.check("u1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(15);
  });

  it("resets in the next window", async () => {
    const { rl, c } = limiter(1);
    await rl.check("u1");
    expect((await rl.check("u1")).allowed).toBe(false);
    c.advance(60_000);
    expect((await rl.check("u1")).allowed).toBe(true);
  });

  it("counts each user separately", async () => {
    const { rl } = limiter(1);
    expect((await rl.check("u1")).allowed).toBe(true);
    expect((await rl.check("u2")).allowed).toBe(true);
    expect((await rl.check("u1")).allowed).toBe(false);
  });

  it("keeps separate limiters apart on a shared store", async () => {
    const c = clock();
    const store = createMemoryStore({ now: c.now });
    const ai = createRateLimiter({ name: "ai", limit: 1, store, now: c.now });
    const upload = createRateLimiter({ name: "upload", limit: 1, store, now: c.now });
    await ai.check("u1");
    expect((await upload.check("u1")).allowed).toBe(true);
  });

  it("enforce throws RateLimitError when over the limit", async () => {
    const { rl } = limiter(1);
    await expect(rl.enforce("u1")).resolves.toMatchObject({ allowed: true });
    const error = await rl.enforce("u1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterSeconds).toBeGreaterThan(0);
  });

  it("rejects an empty userId and bad options", async () => {
    const { rl } = limiter();
    await expect(rl.check("")).rejects.toThrow(/userId/);
    const store = createMemoryStore();
    expect(() => createRateLimiter({ name: "x", limit: 0, store })).toThrow();
    expect(() => createRateLimiter({ name: "x", limit: 1.5, store })).toThrow();
    expect(() => createRateLimiter({ name: "x", limit: 1, windowMs: 0, store })).toThrow();
  });
});

describe("memory store housekeeping", () => {
  it("sweeps expired buckets when full", async () => {
    const c = clock();
    const store = createMemoryStore({ now: c.now, maxKeys: 2 });
    const rl = createRateLimiter({ name: "ai", limit: 1, store, now: c.now });
    await rl.check("a");
    await rl.check("b");
    c.advance(60_000);
    // The map is full, so expired a/b are swept and new windows start.
    expect((await rl.check("c")).allowed).toBe(true);
    expect((await rl.check("a")).allowed).toBe(true);
  });
});

describe("store fallback", () => {
  const failing: RateLimitStore = { hit: () => Promise.reject(new Error("mongo down")) };

  it("uses the fallback store when the primary fails", async () => {
    const c = clock();
    const onStoreError = vi.fn();
    const rl = createRateLimiter({
      name: "ai",
      limit: 1,
      store: failing,
      fallback: createMemoryStore({ now: c.now }),
      now: c.now,
      onStoreError,
    });
    expect((await rl.check("u1")).allowed).toBe(true);
    expect((await rl.check("u1")).allowed).toBe(false);
    expect(onStoreError).toHaveBeenCalledTimes(2);
  });

  it("rethrows when there is no fallback", async () => {
    const rl = createRateLimiter({ name: "ai", limit: 1, store: failing });
    await expect(rl.check("u1")).rejects.toThrow("mongo down");
  });

  it("logs by default when falling back", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rl = createRateLimiter({
      name: "ai",
      limit: 1,
      store: failing,
      fallback: createMemoryStore(),
    });
    await rl.check("u1");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
