function envValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getSmsPushUrl() {
  const value = envValue(["EMESSAGE_SMS_PUSH_URL"]);

  if (!value) {
    throw new Error("Missing EMESSAGE_SMS_PUSH_URL.");
  }

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("EMESSAGE_SMS_PUSH_URL must be an HTTPS URL.");
  }

  return url.toString();
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

  const response = await fetch(getSmsPushUrl(), {
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
