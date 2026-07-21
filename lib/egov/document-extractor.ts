const defaultBaseUrl = "https://egov-ai-core-ws.oueg.info";

type ExtractorResult = {
  totalIncome: number | null;
  extractedText: string | null;
};

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
    envValue(["EGOV_AI_BASE_URL", "EGOV_BASE_URL", "EGOV_BASE", "BASE"]) ??
    defaultBaseUrl
  ).replace(/\/+$/, "");
}

async function getAccessToken() {
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

  const response = await fetch(`${getBaseUrl()}/api/v1/egov/integration/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_code: accessCode }),
  });

  if (!response.ok) {
    throw new Error(`eGov token request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };

  return payload.access_token ?? null;
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8369;|&peso;/gi, "PHP")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function parseMoney(value: string) {
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);

  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function extractTotalIncome(text: string) {
  const plainText = stripHtml(text);
  const labelPatterns = [
    /(?:grand\s+total|invoice\s+total|total\s+amount\s+due|total\s+amount|amount\s+due|balance\s+due|net\s+amount|total\s+sales|total)\s*:?\s*(?:PHP|Php|php|P|₱)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi,
    /(?:PHP|Php|php|P|₱)\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:grand\s+total|invoice\s+total|total\s+amount|amount\s+due|total)/gi,
  ];

  for (const pattern of labelPatterns) {
    const matches = [...plainText.matchAll(pattern)];
    const lastMatch = matches.at(-1);
    const amount = lastMatch?.[1] ? parseMoney(lastMatch[1]) : null;

    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

export async function extractInvoiceTotalFromDocument(
  file: File,
  fileBody: Buffer,
): Promise<ExtractorResult> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { totalIncome: null, extractedText: null };
  }

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(fileBody)], { type: file.type }),
    file.name,
  );

  const response = await fetch(
    `${getBaseUrl()}/api/v1/egov/integration/document_extractor/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`eGov document extractor failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { data?: string };
  const extractedText = typeof payload.data === "string" ? payload.data : null;

  return {
    totalIncome: extractedText ? extractTotalIncome(extractedText) : null,
    extractedText: extractedText ? stripHtml(extractedText) : null,
  };
}
