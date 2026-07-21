import {
  getEgovAiAccessToken,
  getEgovAiBaseUrl,
} from "@/lib/egov/client";

type AssistantPayload = {
  data?: string;
  session_id?: string;
};

export async function generateEgovAssistantResponse(prompt: string) {
  const accessToken = await getEgovAiAccessToken();

  if (!accessToken) {
    throw new Error("eGov AI credentials are not configured.");
  }

  const response = await fetch(
    `${getEgovAiBaseUrl()}/api/v1/egov/integration/ai_assistant/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, category: "PH" }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`eGov AI assistant failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as AssistantPayload;

  if (typeof payload.data !== "string" || !payload.data.trim()) {
    throw new Error("eGov AI assistant returned an empty response.");
  }

  return {
    answer: payload.data.trim(),
    sessionId: payload.session_id ?? null,
  };
}
