function envValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function requiredEgovAiEndpoint(name: string) {
  const value = envValue([name]);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error(`${name} must be an HTTPS URL.`);
  }

  return url.toString();
}

export async function getEgovAiAccessToken() {
  const existingToken = envValue([
    "EGOV_AI_ACCESS_TOKEN",
    "EGOV_HACKATHON_TOKEN",
    "HACKATHON_TOKEN",
    "hackathon_token",
  ]);

  if (existingToken) {
    return existingToken;
  }

  const accessCode = envValue([
    "EGOV_AI_ACCESS_CODE",
    "EGOV_ACCESS_CODE",
    "HACKATHON_ACCESS_CODE",
    "ACCESS_CODE",
    "access_code",
  ]);

  if (!accessCode) {
    return null;
  }

  const response = await fetch(
    requiredEgovAiEndpoint("EGOV_AI_TOKEN_URL"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_code: accessCode }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`eGov token request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };

  return payload.access_token ?? null;
}
