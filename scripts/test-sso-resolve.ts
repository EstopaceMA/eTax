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

async function main() {
  loadEnv(".env.local");

  const { resolveSsoLogin } = await import("../lib/egov-sso/resolve");
  const email = process.argv[2];

  if (!email) {
    console.error("usage: tsx scripts/test-sso-resolve.ts <email>");
    process.exit(1);
  }

  const result = await resolveSsoLogin(email);
  const p = result.profile as Record<string, string | null>;

  console.log(`source     : ${result.source}`);
  if (result.ssoError) console.log(`sso error  : ${result.ssoError}`);
  console.log(`name       : ${p.first_name} ${p.last_name}`);
  console.log(`sso_uid    : ${p.sso_uid}`);
  console.log(`email      : ${p.email}`);
  console.log(`updated_at : ${p.updated_at}`);
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
