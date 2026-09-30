// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ok } from "./action-result";

const authMock = vi.fn();
vi.mock("./auth", () => ({ auth: () => authMock() }));

const { requireUser, withAction, withRoute, RateLimitError, UnauthorizedError } =
  await import("./auth-helpers");

beforeEach(() => {
  authMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requireUser", () => {
  it("returns the session user id", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@example.com" } });
    await expect(requireUser()).resolves.toEqual({ userId: "u1" });
  });

  it.each([
    ["no session", null],
    ["no user", {}],
    ["user without id", { user: { email: "a@example.com" } }],
  ])("throws UnauthorizedError with %s", async (_name, session) => {
    authMock.mockResolvedValue(session);
    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("withAction", () => {
  const action = withAction(async (value: number) => {
    const { userId } = await requireUser();
    return ok({ userId, doubled: value * 2 });
  });

  it("passes through a successful result", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    await expect(action(21)).resolves.toEqual({ ok: true, data: { userId: "u1", doubled: 42 } });
  });

  it("returns unauthorized instead of throwing", async () => {
    authMock.mockResolvedValue(null);
    await expect(action(1)).resolves.toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });

  it("returns rate_limited with retry info", async () => {
    const limited = withAction(async () => {
      throw new RateLimitError(12);
    });
    await expect(limited()).resolves.toMatchObject({
      ok: false,
      error: { code: "rate_limited", retryAfterSeconds: 12 },
    });
  });

  it("hides unexpected error details", async () => {
    const broken = withAction(async () => {
      throw new Error("db password is hunter2");
    });
    const result = await broken();
    expect(result).toMatchObject({ ok: false, error: { code: "internal" } });
    expect(JSON.stringify(result)).not.toContain("hunter2");
  });
});

describe("withRoute", () => {
  it("returns the handler response", async () => {
    const route = withRoute(async () => Response.json({ hi: 1 }));
    const res = await route();
    expect(res.status).toBe(200);
  });

  it("maps UnauthorizedError to 401", async () => {
    authMock.mockResolvedValue(null);
    const route = withRoute(async () => {
      await requireUser();
      return Response.json({});
    });
    const res = await route();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });

  it("maps RateLimitError to 429 with Retry-After", async () => {
    const route = withRoute(async () => {
      throw new RateLimitError(30);
    });
    const res = await route();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("maps other errors to 500", async () => {
    const route = withRoute(async () => {
      throw new Error("boom");
    });
    expect((await route()).status).toBe(500);
  });
});
