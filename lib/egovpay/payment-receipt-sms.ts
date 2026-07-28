import "server-only";

import type { FilingQuarter } from "@/lib/filing-periods";
import { getQuarterMeta } from "@/lib/filing-periods";
import { getTaxAmountPayable } from "@/lib/tax-amount-payable";
import { sendSms } from "@/lib/emessage/sms";
import { normalizePhilippineMobileNumber } from "@/lib/emessage/philippines";
import type { SsoProfile } from "@/lib/types";

type SendPaymentReceiptSmsInput = {
  quarter: FilingQuarter;
  isFiled: boolean;
  ssoProfile: Pick<SsoProfile, "mobile"> | null;
  transactionId: string;
};

export type PaymentReceiptSmsResult =
  | { status: "sent"; recipient: string }
  | { status: "skipped"; reason: string };

function formatPhpAmount(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    currencyDisplay: "code",
    style: "currency",
  }).format(amount);
}

export async function sendEgovPayPaymentReceiptSms({
  quarter,
  isFiled,
  ssoProfile,
  transactionId,
}: SendPaymentReceiptSmsInput): Promise<PaymentReceiptSmsResult> {
  const recipient = normalizePhilippineMobileNumber(
    ssoProfile?.mobile ?? null,
  );

  if (!recipient) {
    return { status: "skipped", reason: "missing_mobile_number" };
  }

  const quarterMeta = getQuarterMeta(quarter);
  const amount = getTaxAmountPayable();
  const nextStep = isFiled
    ? "Your return is marked filed and paid. Please use the eTax app to review your filing record."
    : "Your payment is marked paid, but filing is still pending. Please use the eTax app to file your return.";
  const message = `eTax: Your eGovPay test payment of ${formatPhpAmount(amount)} for ${quarterMeta.period} BIR Form ${quarterMeta.formCode} was received. Ref: ${transactionId}. ${nextStep}`;

  await sendSms({ number: recipient, message });

  return { status: "sent", recipient };
}
