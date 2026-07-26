"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createExactApproval } from "@/lib/agentic/approvals";
import { appendAudit, refreshAgenticPlan } from "@/lib/agentic/orchestrator";
import { requireUser } from "@/lib/data";
import {
  getQuarterMeta,
  isFilingPeriodOpen,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { createEgovPayTransaction } from "@/lib/egovpay/client";
import { createClient } from "@/lib/supabase/server";

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
  let destination = paymentReviewUrl(quarter, "unavailable");

  try {
    if (!isFilingPeriodOpen(quarterMeta.opensOn)) {
      throw new Error("The selected filing period is not open.");
    }

    const plan = await refreshAgenticPlan();

    if (
      quarter !== 2 ||
      plan.task.task_type !== "approve_payment" ||
      !plan.computation ||
      !plan.draft?.acknowledgement_reference
    ) {
      throw new Error("The payment hand-off is not ready for approval.");
    }

    const supabase = await createClient();
    const { data: obligation } = await supabase
      .from("filing_obligations")
      .select("id, payment_status, status")
      .eq("user_id", user.id)
      .eq("period", quarterMeta.period)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!obligation) {
      throw new Error("The selected filing obligation was not found.");
    }

    if (obligation.payment_status === "paid") {
      destination = paymentReviewUrl(quarter, "already-paid");
    } else {
      const origin = await getAppOrigin();
      const callbackUrl = new URL("/api/egovpay/callback", origin);
      const transactionId = `ETAX-${quarterMeta.shortLabel}-${randomUUID()
        .replace(/-/g, "")
        .slice(0, 12)}`.toUpperCase();
      const redirectUrl = new URL("/api/egovpay/return", origin);

      redirectUrl.searchParams.set("quarter", String(quarter));
      redirectUrl.searchParams.set("txnid", transactionId);
      const amount = plan.computation.output_snapshot.amountPayable;
      const approval = await createExactApproval({
        userId: user.id,
        task: plan.task,
        actionType: "payment_handoff",
        targetType: "filing_obligation",
        targetId: obligation.id,
        payload: {
          amount,
          channel: "eGovPay test gateway",
          currency: "PHP",
          filingAcknowledgement: plan.draft.acknowledgement_reference,
          period: quarterMeta.period,
          taxType: `BIR Form ${quarterMeta.formCode}`,
        },
      });
      const { data: paymentIntent, error: intentError } = await supabase
        .from("payment_intents")
        .insert({
          user_id: user.id,
          filing_obligation_id: obligation.id,
          approval_id: approval.id,
          transaction_id: transactionId,
          amount,
          currency: "PHP",
          channel: "eGovPay test gateway",
          state: "approved",
        })
        .select("*")
        .single();

      if (intentError) {
        throw new Error(`Could not create the approved payment intent: ${intentError.message}`);
      }

      const checkout = await createEgovPayTransaction({
        amount,
        callbackUrl: callbackUrl.toString(),
        itemName: `BIR Form ${quarterMeta.formCode} ${quarterMeta.period} tax payment`,
        redirectUrl: redirectUrl.toString(),
        transactionId,
      });

      await Promise.all([
        supabase
          .from("payment_intents")
          .update({ state: "handed_off", updated_at: new Date().toISOString() })
          .eq("id", paymentIntent.id)
          .eq("user_id", user.id),
        supabase
          .from("filing_obligations")
          .update({ payment_status: "handed_off" })
          .eq("id", obligation.id)
          .eq("user_id", user.id),
      ]);
      await appendAudit(supabase, {
        userId: user.id,
        actorType: "system",
        actorId: "Payment Agent",
        action: "payment_handoff.opened",
        targetType: "payment_intent",
        targetId: paymentIntent.id,
        eventData: { amount, transactionId },
      });
      destination = checkout.url;
    }
  } catch (error) {
    console.error("Could not create eGovPay checkout.", error);
  }

  redirect(destination);
}
