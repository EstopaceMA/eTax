import {
  getEgovAiAccessToken,
  requiredEgovAiEndpoint,
} from "@/lib/egov/client";

type ExtractorResult = {
  totalIncome: number | null;
  extractedText: string | null;
};

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
  const accessToken = await getEgovAiAccessToken();

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
    requiredEgovAiEndpoint("EGOV_AI_DOCUMENT_EXTRACTOR_URL"),
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
