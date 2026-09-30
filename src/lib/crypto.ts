/**
 * AES-256-GCM encryption for secrets stored in the DB (third-party tokens).
 *
 * Output format: `v1:<iv>:<tag>:<data>`, each part base64. The version prefix
 * lets us rotate keys or algorithms later without guessing the format.
 * The key comes from ENCRYPTION_KEY (base64 of 32 bytes).
 */
import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // 96-bit IV, the GCM recommendation
const TAG_BYTES = 16;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

export class CryptoKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoKeyError";
  }
}

/** Thrown for any ciphertext that is malformed, from an unknown version, or tampered with. */
export class DecryptionError extends Error {
  constructor(message = "Unable to decrypt value") {
    super(message);
    this.name = "DecryptionError";
  }
}

/** Decodes and checks a base64 key. Never includes the key in error messages. */
export function parseKey(base64Key: string | undefined): Buffer {
  if (!base64Key || !BASE64.test(base64Key)) {
    throw new CryptoKeyError("ENCRYPTION_KEY must be base64 of 32 bytes");
  }
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES) {
    throw new CryptoKeyError("ENCRYPTION_KEY must be base64 of 32 bytes");
  }
  return key;
}

export function encryptWithKey(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(
    ":",
  );
}

function decodePart(part: string, expectedBytes?: number): Buffer {
  if (!BASE64.test(part)) throw new DecryptionError("Malformed ciphertext");
  const bytes = Buffer.from(part, "base64");
  if (expectedBytes !== undefined && bytes.length !== expectedBytes) {
    throw new DecryptionError("Malformed ciphertext");
  }
  return bytes;
}

export function decryptWithKey(cipherText: string, key: Buffer): string {
  const parts = cipherText.split(":");
  if (parts.length !== 4) throw new DecryptionError("Malformed ciphertext");
  const [version, ivPart, tagPart, dataPart] = parts as [string, string, string, string];
  if (version !== VERSION) throw new DecryptionError("Unsupported ciphertext version");

  const iv = decodePart(ivPart, IV_BYTES);
  const tag = decodePart(tagPart, TAG_BYTES);
  const data = decodePart(dataPart);

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    // GCM auth failure: wrong key or the iv/tag/data was modified.
    throw new DecryptionError("Ciphertext failed authentication");
  }
}

let cached: { raw: string; key: Buffer } | undefined;

function envKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (cached && cached.raw === raw) return cached.key;
  const key = parseKey(raw);
  cached = { raw: raw as string, key };
  return key;
}

/** Encrypts with ENCRYPTION_KEY. A fresh random IV makes every output unique. */
export const encrypt = (plain: string): string => encryptWithKey(plain, envKey());

/** Decrypts a value from `encrypt`. Throws DecryptionError on any tampering. */
export const decrypt = (cipherText: string): string => decryptWithKey(cipherText, envKey());
