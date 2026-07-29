/**
 * One-off: encrypts the PII columns of every existing egov_sso_profiles row.
 * Safe to re-run — it detects and skips rows already in ciphertext format.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key.trim()]) process.env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    // optional
  }
}

function looksEncrypted(value: unknown): boolean {
  return typeof value === "string" && value.split(".").length === 3;
}

async function main() {
  loadEnv(".env.local");

  const { createAdminClient } = await import("../lib/supabase/admin");
  const { encryptEgovSsoRow, hashEmail } = await import("../lib/egov-sso/pii-fields");
  const { encryptPii } = await import("../lib/security/pii-crypto");

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase.from("egov_sso_profiles").select("*");

  if (error) {
    throw new Error(`Could not load egov_sso_profiles: ${error.message}`);
  }

  console.log(`found ${rows?.length ?? 0} rows`);

  for (const row of rows ?? []) {
    // Checked per-field, not row-wide: a field already run through
    // encryptEgovSsoRow (e.g. mobile, from an earlier pass) must not be
    // skipped just because a field added since (email) still needs it — and
    // must never be encrypted a second time, which would corrupt it.
    const mobileDone = looksEncrypted(row.mobile) || row.mobile === null;
    const emailDone = looksEncrypted(row.email) || row.email === null;

    if (mobileDone && emailDone) {
      console.log(`  ${row.sso_uid} — already encrypted, skipping`);
      continue;
    }

    const update: Record<string, unknown> = {};

    if (!emailDone) {
      // Handled on its own, never through encryptEgovSsoRow(row) — that would
      // re-encrypt every other already-ciphertext field alongside it.
      update.email = encryptPii(row.email as string);
      update.email_hash = hashEmail(row.email as string);
    }

    if (!mobileDone) {
      // A row with mobile still in plaintext hasn't been through
      // encryptEgovSsoRow at all yet, so every other TEXT_FIELDS/JSON_FIELDS
      // column is safe to encrypt in bulk here too.
      const fullRow = { ...row } as Record<string, unknown>;
      delete fullRow.id;
      delete fullRow.email;
      Object.assign(update, encryptEgovSsoRow(fullRow));
    }

    const { error: updateError } = await supabase
      .from("egov_sso_profiles")
      .update(update)
      .eq("id", row.id as string);

    if (updateError) {
      throw new Error(`Failed to encrypt row ${row.id}: ${updateError.message}`);
    }

    console.log(`  ${row.sso_uid} — encrypted`);
  }

  console.log("done");
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
