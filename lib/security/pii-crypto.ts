import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Application-level encryption for PII stored in Postgres.
 *
 * This is deliberately separate from Supabase's own at-rest/in-transit
 * encryption: the key here lives only in server env vars and is never sent to
 * Postgres, so it protects against a leaked service-role key, a DB dump, or
 * anyone browsing the Supabase table editor directly — none of which
 * transport/at-rest encryption defends against, since Postgres decrypts those
 * transparently for any authorized reader.
 *
 * AES-256-GCM, random 12-byte IV per value, stored as
 * "<iv>.<authTag>.<ciphertext>" (all base64). A value can only be decrypted
 * with the exact key it was encrypted with — rotating PII_ENCRYPTION_KEY
 * without migrating existing rows first makes them unreadable.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function loadKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new Error(
      "Missing PII_ENCRYPTION_KEY. Generate one with: openssl rand -base64 32",
    );
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      `PII_ENCRYPTION_KEY must decode to 32 bytes for AES-256, got ${key.length}. Generate one with: openssl rand -base64 32`,
    );
  }

  return key;
}

/** Encrypts a string. Returns null unchanged, so optional PII fields stay optional. */
export function encryptPii(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64")).join(".");
}

/** Decrypts a value produced by encryptPii. Returns null unchanged. */
export function decryptPii(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parts = value.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Value is not in the expected iv.authTag.ciphertext format — was it encrypted with encryptPii?",
    );
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const key = loadKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

/** Encrypts a JSON-serializable value (for jsonb columns migrated to text). */
export function encryptPiiJson(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return encryptPii(JSON.stringify(value));
}

/** Decrypts and parses a value produced by encryptPiiJson. */
export function decryptPiiJson<T = unknown>(value: string | null | undefined): T | null {
  const plaintext = decryptPii(value);

  if (plaintext === null) {
    return null;
  }

  return JSON.parse(plaintext) as T;
}
