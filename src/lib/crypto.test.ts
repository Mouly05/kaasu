// @vitest-environment node
import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CryptoKeyError,
  decrypt,
  decryptWithKey,
  DecryptionError,
  encrypt,
  encryptWithKey,
  parseKey,
} from "./crypto";

const keyA = randomBytes(32);
const keyB = randomBytes(32);

/** Flips one bit in a base64 segment and re-encodes it. */
function flipBit(segment: string): string {
  const bytes = Buffer.from(segment, "base64");
  bytes[0] = bytes[0]! ^ 0x01;
  return bytes.toString("base64");
}

function withPart(cipher: string, index: number, value: string): string {
  const parts = cipher.split(":");
  parts[index] = value;
  return parts.join(":");
}

describe("encryptWithKey / decryptWithKey", () => {
  it.each(["", "hello", "ghp_x1Y2z3", "காசு ₹1,23,456 🪙", "x".repeat(10_000)])(
    "round-trips %j",
    (plain) => {
      expect(decryptWithKey(encryptWithKey(plain, keyA), keyA)).toBe(plain);
    },
  );

  it("produces the versioned v1:iv:tag:data format", () => {
    const parts = encryptWithKey("secret", keyA).split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    expect(Buffer.from(parts[1]!, "base64")).toHaveLength(12);
    expect(Buffer.from(parts[2]!, "base64")).toHaveLength(16);
  });

  it("uses a random IV so the same plaintext never encrypts the same way", () => {
    const a = encryptWithKey("same", keyA);
    const b = encryptWithKey("same", keyA);
    expect(a).not.toBe(b);
    expect(a.split(":")[1]).not.toBe(b.split(":")[1]);
  });

  it("does not leak the plaintext into the output", () => {
    expect(encryptWithKey("super-secret-token", keyA)).not.toContain("super-secret-token");
  });

  describe("tamper detection", () => {
    const cipher = encryptWithKey("bank-token-123", keyA);

    it.each([
      ["iv", 1],
      ["tag", 2],
      ["data", 3],
    ])("rejects a modified %s", (_name, index) => {
      const tampered = withPart(cipher, index, flipBit(cipher.split(":")[index]!));
      expect(() => decryptWithKey(tampered, keyA)).toThrow(DecryptionError);
    });

    it("rejects decryption with the wrong key", () => {
      expect(() => decryptWithKey(cipher, keyB)).toThrow(DecryptionError);
    });

    it("rejects swapping data from another ciphertext", () => {
      const other = encryptWithKey("bank-token-999", keyA);
      const spliced = withPart(cipher, 3, other.split(":")[3]!);
      expect(() => decryptWithKey(spliced, keyA)).toThrow(DecryptionError);
    });

    it("rejects truncated data", () => {
      const data = Buffer.from(cipher.split(":")[3]!, "base64");
      const truncated = withPart(cipher, 3, data.subarray(0, data.length - 1).toString("base64"));
      expect(() => decryptWithKey(truncated, keyA)).toThrow(DecryptionError);
    });
  });

  describe("malformed input", () => {
    const cipher = encryptWithKey("x", keyA);

    it.each([
      ["empty string", ""],
      ["too few parts", "v1:abc:def"],
      ["too many parts", `${cipher}:extra`],
      ["unknown version", cipher.replace(/^v1/, "v2")],
      ["non-base64 iv", withPart(cipher, 1, "!!!!")],
      ["short iv", withPart(cipher, 1, Buffer.alloc(8).toString("base64"))],
      ["short tag", withPart(cipher, 2, Buffer.alloc(4).toString("base64"))],
      ["non-base64 data", withPart(cipher, 3, "@@@")],
    ])("rejects %s", (_name, value) => {
      expect(() => decryptWithKey(value, keyA)).toThrow(DecryptionError);
    });
  });
});

describe("parseKey", () => {
  it("accepts base64 of exactly 32 bytes", () => {
    expect(parseKey(keyA.toString("base64")).equals(keyA)).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not base64", "not base64!"],
    ["16 bytes", randomBytes(16).toString("base64")],
    ["33 bytes", randomBytes(33).toString("base64")],
  ])("rejects a %s key without echoing it", (_name, value) => {
    expect(() => parseKey(value)).toThrow(CryptoKeyError);
    if (value) {
      try {
        parseKey(value);
      } catch (error) {
        expect((error as Error).message).not.toContain(value);
      }
    }
  });
});

describe("encrypt / decrypt (ENCRYPTION_KEY)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips using the env key", () => {
    vi.stubEnv("ENCRYPTION_KEY", keyA.toString("base64"));
    const cipher = encrypt("token");
    expect(decrypt(cipher)).toBe("token");
    expect(decryptWithKey(cipher, keyA)).toBe("token");
  });

  it("picks up a changed key", () => {
    vi.stubEnv("ENCRYPTION_KEY", keyA.toString("base64"));
    const cipher = encrypt("token");
    vi.stubEnv("ENCRYPTION_KEY", keyB.toString("base64"));
    expect(() => decrypt(cipher)).toThrow(DecryptionError);
  });

  it("fails clearly when the key is missing", () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    expect(() => encrypt("token")).toThrow(CryptoKeyError);
  });
});
