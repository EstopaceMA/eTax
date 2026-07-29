import {
  decryptPii,
  decryptPiiJson,
  encryptPii,
  encryptPiiJson,
  hashForLookup,
} from "@/lib/security/pii-crypto";

/**
 * Which egov_sso_profiles columns are encrypted at rest, and how.
 *
 * email is encrypted like the rest of the identity data, but it's also a
 * lookup key (sign-in resolves by email), so egov_sso_profiles carries a
 * separate email_hash column — a deterministic HMAC of the normalized email —
 * used for equality search instead of querying the ciphertext directly.
 * hashEmail() below computes it; callers query .eq("email_hash", ...).
 *
 * Left in plaintext, deliberately:
 * - id, sso_uid, user_id, created_at, updated_at, email_hash: needed for
 *   lookups (account linking and RLS key off sso_uid/user_id; email_hash is
 *   itself the lookup key for email and reveals nothing without
 *   PII_ENCRYPTION_KEY).
 * - barangay_code, municipality_code, province_code, region_code,
 *   country_alpha_2_code, country_alpha_3_code, country_id: PSGC/ISO
 *   classifier codes, not identifying on their own, and read by the RDO
 *   lookup before a session exists.
 */
const TEXT_FIELDS = [
  "email",
  "first_name",
  "middle_name",
  "last_name",
  "suffix",
  "gender",
  "birth_date",
  "nationality",
  "mobile",
  "photo_url",
  "address",
  "street",
  "barangay",
  "municipality",
  "province",
  "region",
  "country",
  "postal",
  "foreign_address",
  "address_line_2",
  "tin_id",
  "signature",
  "signature_url",
] as const;

/** Normalizes and hashes an email for equality lookup against email_hash. */
export function hashEmail(email: string): string {
  return hashForLookup(email.trim().toLowerCase());
}

const JSON_FIELDS = ["passport", "national_id", "additional_information", "raw_payload"] as const;

export type EncryptedTextField = (typeof TEXT_FIELDS)[number];
export type EncryptedJsonField = (typeof JSON_FIELDS)[number];

/** Encrypts every sensitive field present on the given row. Absent keys are left alone. */
export function encryptEgovSsoRow<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = { ...row };

  for (const field of TEXT_FIELDS) {
    if (field in result) {
      result[field] = encryptPii(result[field] as string | null | undefined);
    }
  }

  for (const field of JSON_FIELDS) {
    if (field in result) {
      result[field] = encryptPiiJson(result[field]);
    }
  }

  return result as T;
}

/** Decrypts every sensitive field present on the given row. Absent keys are left alone. */
export function decryptEgovSsoRow<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = { ...row };

  for (const field of TEXT_FIELDS) {
    if (field in result) {
      result[field] = decryptPii(result[field] as string | null | undefined);
    }
  }

  for (const field of JSON_FIELDS) {
    if (field in result) {
      result[field] = decryptPiiJson(result[field] as string | null | undefined);
    }
  }

  return result as T;
}
