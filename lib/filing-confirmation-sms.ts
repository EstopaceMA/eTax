import "server-only";

import type { FilingQuarter } from "@/lib/filing-periods";
import { getQuarterMeta } from "@/lib/filing-periods";
import { normalizePhilippineMobileNumber } from "@/lib/emessage/philippines";
import { sendSms } from "@/lib/emessage/sms";
import type { SsoProfile } from "@/lib/types";

type SendFilingConfirmationSmsInput = {
  amountPayable: number;
  isPaid: boolean;
  quarter: FilingQuarter;
  ssoProfile: Pick<SsoProfile, "mobile"> | null;
};

export type FilingConfirmationSmsResult =
  | { status: "sent"; recipient: string }
  | { status: "skipped"; reason: string };

function formatPhpAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("The filing computation did not provide a valid amount payable.");
  }

  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    currencyDisplay: "code",
    style: "currency",
  }).format(amount);
}

export async function sendFilingConfirmationSms({
  amountPayable,
  isPaid,
  quarter,
  ssoProfile,
}: SendFilingConfirmationSmsInput): Promise<FilingConfirmationSmsResult> {
  const recipient = normalizePhilippineMobileNumber(
    ssoProfile?.mobile ?? null,
  );

  if (!recipient) {
    return { status: "skipped", reason: "missing_mobile_number" };
  }

  const quarterMeta = getQuarterMeta(quarter);
  const nextStep = isPaid
    ? "Your payment is also marked paid. Please use the eTax app to review your filing record."
    : `Payment of ${formatPhpAmount(amountPayable)} is still pending. Please use the eTax app to pay with eGovPay.`;
  const message = `eTax: Your ${quarterMeta.period} BIR Form ${quarterMeta.formCode} has been filed by eTax. ${nextStep}`;

  await sendSms({ number: recipient, message });

  return { status: "sent", recipient };
}
