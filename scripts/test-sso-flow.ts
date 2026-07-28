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
    // optional file
  }
}

async function main() {
  loadEnv(".env.local");

  const { exchangeCodeForToken, fetchSsoProfile } = await import("../lib/egov-sso/client");
  const { saveSsoProfile } = await import("../lib/egov-sso/store");

  const arg = process.argv[2];

  if (!arg) {
    console.error("usage: tsx scripts/test-sso-flow.ts <exchange_code | --file path.json>");
    process.exit(1);
  }

  let profile;

  if (arg === "--file") {
    const raw = readFileSync(process.argv[3], "utf8");
    const jsonEnd = raw.lastIndexOf("HTTP_STATUS:");
    profile = JSON.parse(jsonEnd > 0 ? raw.slice(0, jsonEnd) : raw).data;
    console.log("1. (skipped token exchange — replaying captured response)");
    console.log("2. profile loaded:", profile.first_name, profile.last_name, "|", profile.uniqid);
  } else {
    const token = await exchangeCodeForToken(arg);
    console.log("1. token acquired:", token.slice(0, 25) + "...");

    profile = await fetchSsoProfile(token);
    console.log("2. profile fetched:", profile.first_name, profile.last_name, "|", profile.uniqid);
  }

  const saved = await saveSsoProfile(profile);
  console.log("3. saved row id:", saved.id);
  console.log("   sso_uid:", saved.sso_uid);
  console.log("   email:", saved.email);
  console.log("   mobile:", saved.mobile);
  console.log("   birth_date:", saved.birth_date);
  console.log("   municipality:", saved.municipality, "|", saved.province);
  console.log("   passport #:", saved.passport?.passport_number);
  console.log("   national_id pcn:", saved.national_id?.pcn);
  console.log("   tin_id:", saved.tin_id);
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
