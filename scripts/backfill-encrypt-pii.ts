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
  const { encryptEgovSsoRow } = await import("../lib/egov-sso/pii-fields");

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase.from("egov_sso_profiles").select("*");

  if (error) {
    throw new Error(`Could not load egov_sso_profiles: ${error.message}`);
  }

  console.log(`found ${rows?.length ?? 0} rows`);

  for (const row of rows ?? []) {
    if (looksEncrypted(row.mobile) || row.mobile === null) {
      console.log(`  ${row.email} — already encrypted (or null), skipping`);
      continue;
    }

    const { id, ...rest } = row as Record<string, unknown>;
    const encrypted = encryptEgovSsoRow(rest);

    const { error: updateError } = await supabase
      .from("egov_sso_profiles")
      .update(encrypted)
      .eq("id", id as string);

    if (updateError) {
      throw new Error(`Failed to encrypt row ${id}: ${updateError.message}`);
    }

    console.log(`  ${row.email} — encrypted`);
  }

  console.log("done");
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
