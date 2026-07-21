const defaultBaseUrl = "https://ws-message.e.gov.ph";

function envValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getBaseUrl() {
  return (
    envValue(["EMESSAGE_BASE_URL", "EGOV_MESSAGE_BASE_URL"]) ?? defaultBaseUrl
  ).replace(/\/+$/, "");
}

export async function sendSms({
  number,
  message,
}: {
  number: string;
  message: string;
}) {
  const token = envValue(["EMESSAGE_ACCESS_TOKEN", "EMESSAGE_API_TOKEN"]);

  if (!token) {
    throw new Error("Missing EMESSAGE_ACCESS_TOKEN.");
  }

  const response = await fetch(`${getBaseUrl()}/messaging/v1/sms/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EMESSAGE-Auth": token,
    },
    body: JSON.stringify({ number, message }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`eMessage SMS request failed with HTTP ${response.status}`);
  }

  return payload;
}
