import "server-only";

import { createHmac } from "node:crypto";

const defaultBaseUrl = "https://egovpay-pgi-ws-dev.oueg.info";

type CreatePaymentInput = {
  amount: number;
  callbackUrl: string;
  itemName: string;
  redirectUrl: string;
  transactionId: string;
};

type EgovPayResponse = {
  data?: {
    uuid?: string;
    url?: string;
    channel?: {
      refno?: string;
    };
  };
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function createDigest(amount: number, transactionId: string, token: string) {
  const digestKey = token.startsWith("test_") ? token.slice("test_".length) : token;

  return createHmac("sha256", digestKey)
    .update(`${amount}|${transactionId}`)
    .digest("hex");
}

export async function createEgovPayTransaction(input: CreatePaymentInput) {
  const token = requiredEnv("EGOVPAY_API_TOKEN");
  const settlementTemplateUuid = requiredEnv("EGOVPAY_SETTLEMENT_TEMPLATE_UUID");

  if (!token.startsWith("test_")) {
    throw new Error("eGovPay live tokens are disabled in this integration.");
  }

  const baseUrl = (process.env.EGOVPAY_BASE_URL?.trim() || defaultBaseUrl).replace(
    /\/+$/,
    "",
  );
  const response = await fetch(`${baseUrl}/api/v1/transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-eGovPay-Token": token,
    },
    body: JSON.stringify({
      amount: input.amount,
      settlement_template_uuid: settlementTemplateUuid,
      currency: "PHP",
      digest: createDigest(input.amount, input.transactionId, token),
      callback_url: input.callbackUrl,
      redirect_url: input.redirectUrl,
      txnid: input.transactionId,
      items: [
        {
          name: input.itemName,
          amount: input.amount,
        },
      ],
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as EgovPayResponse | null;

  if (!response.ok) {
    const responseDetail = payload ? ` ${JSON.stringify(payload).slice(0, 500)}` : "";
    throw new Error(
      `eGovPay transaction request failed with HTTP ${response.status}.${responseDetail}`,
    );
  }

  const hostedUrl = payload?.data?.url;

  if (!hostedUrl) {
    throw new Error("eGovPay did not return a hosted payment URL.");
  }

  const parsedUrl = new URL(hostedUrl);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("eGovPay returned an invalid payment URL.");
  }

  return {
    uuid: payload?.data?.uuid ?? null,
    url: parsedUrl.toString(),
    referenceNumber: payload?.data?.channel?.refno ?? null,
  };
}
