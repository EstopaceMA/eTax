"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import {
  getQuarterMeta,
  isFilingPeriodOpen,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { createEgovPayTransaction } from "@/lib/egovpay/client";
import { createClient } from "@/lib/supabase/server";
import { getTaxAmountPayable } from "@/lib/tax-amount-payable";

async function getAppOrigin() {
  const configuredOrigin = process.env.APP_BASE_URL?.trim();

  if (configuredOrigin) {
    return new URL(configuredOrigin).origin;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Could not determine the eTax application URL.");
  }

  return new URL(`${protocol}://${host}`).origin;
}

function paymentReviewUrl(quarter: number, payment: string) {
  return `/filing?quarter=${quarter}&view=payment&payment=${payment}`;
}

export async function createEgovPayCheckout(formData: FormData) {
  const user = await requireUser();
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const quarterMeta = getQuarterMeta(quarter);
  const fileBeforePay = String(formData.get("file_before_pay")) === "1";
  let destination = paymentReviewUrl(quarter, "unavailable");

  try {
    if (!isFilingPeriodOpen(quarterMeta.opensOn)) {
      throw new Error("The selected filing period is not open.");
    }

    const supabase = await createClient();
    const { data: obligation } = await supabase
      .from("filing_obligations")
      .select("id, payment_status")
      .eq("user_id", user.id)
      .in("period", [quarterMeta.period, ...(quarterMeta.periodAliases ?? [])])
      .maybeSingle();

    if (!obligation) {
      throw new Error("The selected filing obligation was not found.");
    }

    if (obligation.payment_status === "paid") {
      destination = paymentReviewUrl(quarter, "already-paid");
    } else {
      if (fileBeforePay) {
        await supabase
          .from("filing_obligations")
          .update({ status: "filed" })
          .eq("id", obligation.id)
          .eq("user_id", user.id);
      }

      const origin = await getAppOrigin();
      const callbackUrl = new URL("/api/egovpay/callback", origin);
      const transactionId = `ETAX-${quarterMeta.shortLabel}-${randomUUID()
        .replace(/-/g, "")
        .slice(0, 12)}`.toUpperCase();
      const redirectUrl = new URL("/api/egovpay/return", origin);

      redirectUrl.searchParams.set("quarter", String(quarter));
      redirectUrl.searchParams.set("txnid", transactionId);

      const checkout = await createEgovPayTransaction({
        amount: getTaxAmountPayable(),
        callbackUrl: callbackUrl.toString(),
        itemName: `BIR Form ${quarterMeta.formCode} ${quarterMeta.period} tax payment`,
        redirectUrl: redirectUrl.toString(),
        transactionId,
      });

      destination = checkout.url;
    }
  } catch (error) {
    console.error("Could not create eGovPay checkout.", error);
  }

  redirect(destination);
}
