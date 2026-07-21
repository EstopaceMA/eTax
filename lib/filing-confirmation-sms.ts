import "server-only";

import type { FilingQuarter } from "@/lib/filing-periods";
import { getQuarterMeta } from "@/lib/filing-periods";
import { getTaxAmountPayable } from "@/lib/tax-amount-payable";
import { normalizePhilippineMobileNumber } from "@/lib/emessage/philippines";
import { sendSms } from "@/lib/emessage/sms";
import type { TaxpayerProfile } from "@/lib/types";

type SendFilingConfirmationSmsInput = {
  isPaid: boolean;
  quarter: FilingQuarter;
  taxpayerProfile: Pick<TaxpayerProfile, "mobile_number"> | null;
};

export type FilingConfirmationSmsResult =
  | { status: "sent"; recipient: string }
  | { status: "skipped"; reason: string };

function formatPhpAmount(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    currencyDisplay: "code",
    style: "currency",
  }).format(amount);
}

export async function sendFilingConfirmationSms({
  isPaid,
  quarter,
  taxpayerProfile,
}: SendFilingConfirmationSmsInput): Promise<FilingConfirmationSmsResult> {
  const recipient = normalizePhilippineMobileNumber(
    taxpayerProfile?.mobile_number ?? null,
  );

  if (!recipient) {
    return { status: "skipped", reason: "missing_mobile_number" };
  }

  const quarterMeta = getQuarterMeta(quarter);
  const nextStep = isPaid
    ? "Your payment is also marked paid. Please use the eTax app to review your filing record."
    : `Payment of ${formatPhpAmount(getTaxAmountPayable())} is still pending. Please use the eTax app to pay with eGovPay.`;
  const message = `eTax: Your ${quarterMeta.period} BIR Form ${quarterMeta.formCode} has been filed by eTax. ${nextStep}`;

  await sendSms({ number: recipient, message });

  return { status: "sent", recipient };
}
