/**
 * Encrypts a plaintext value the same way the app does, so the output can be
 * pasted directly into a Supabase table editor cell for an encrypted column.
 *
 * The app reads PII_ENCRYPTION_KEY from process.env at runtime; this script
 * needs the same key, so it reads .env.local itself before importing the
 * crypto module.
 *
 * Usage:
 *   npx tsx scripts/encrypt-value.ts "+639171234567"
 *   npx tsx scripts/encrypt-value.ts --json '{"passport_number":"PN1234567"}'
 *
 * TEXT_FIELDS (encrypt as plain text): first_name, middle_name, last_name,
 * suffix, gender, birth_date, nationality, mobile, photo_url, address,
 * street, barangay, municipality, province, region, country, postal,
 * foreign_address, address_line_2, tin_id, signature, signature_url
 *
 * JSON_FIELDS (use --json; column type is text, holding serialized JSON):
 * passport, national_id, additional_information, raw_payload
 *
 * Never encrypt: id, sso_uid, email, user_id, created_at, updated_at, or any
 * *_code / country_id column — those stay plaintext for lookups.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const [key, ...rest] = trimmed.split("=");
      const name = key.trim();
      if (!process.env[name]) {
        process.env[name] = rest.join("=").trim();
      }
    }
  } catch {
    // .env.local is optional if PII_ENCRYPTION_KEY is already exported
  }
}

async function main() {
  loadEnvLocal();

  const { encryptPii, encryptPiiJson } = await import("../lib/security/pii-crypto");

  const args = process.argv.slice(2);
  const isJson = args[0] === "--json";
  const raw = isJson ? args.slice(1).join(" ") : args.join(" ");

  if (!raw) {
    console.error(
      "usage: npx tsx scripts/encrypt-value.ts \"plaintext\"\n" +
        "       npx tsx scripts/encrypt-value.ts --json '{\"key\":\"value\"}'",
    );
    process.exit(1);
  }

  const encrypted = isJson ? encryptPiiJson(JSON.parse(raw)) : encryptPii(raw);

  console.log(encrypted);
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
