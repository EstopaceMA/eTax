const defaultBaseUrl = "https://egov-ai-core-ws.oueg.info";

function envValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function getEgovAiBaseUrl() {
  return (
    envValue(["EGOV_AI_BASE_URL", "EGOV_BASE_URL", "EGOV_BASE", "BASE"]) ??
    defaultBaseUrl
  ).replace(/\/+$/, "");
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
    `${getEgovAiBaseUrl()}/api/v1/egov/integration/token`,
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
