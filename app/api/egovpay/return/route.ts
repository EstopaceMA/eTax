import { NextRequest, NextResponse } from "next/server";
import { getQuarterMeta, parseFilingQuarter } from "@/lib/filing-periods";
import { createClient } from "@/lib/supabase/server";
import { getSsoMobile } from "@/lib/egov-sso/store";
import { sendEgovPayPaymentReceiptSms } from "@/lib/egovpay/payment-receipt-sms";

function paymentReturnUrl(request: NextRequest, quarter: number, payment: string) {
  const url = new URL("/filing", request.url);

  url.searchParams.set("quarter", String(quarter));
  url.searchParams.set("view", "payment");
  url.searchParams.set("payment", payment);

  return url;
}

export async function GET(request: NextRequest) {
  const quarter = parseFilingQuarter(request.nextUrl.searchParams.get("quarter"));
  const quarterMeta = getQuarterMeta(quarter);
  const transactionId = request.nextUrl.searchParams.get("txnid")?.trim() ?? "";

  if (!/^ETAX-[A-Z0-9-]{4,40}$/.test(transactionId)) {
    return NextResponse.redirect(paymentReturnUrl(request, quarter, "invalid-reference"));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(paymentReturnUrl(request, quarter, "signed-out"));
  }

  const { data: intent } = await supabase
    .from("payment_intents")
    .select("id, filing_obligation_id, state, amount")
    .eq("user_id", user.id)
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (!intent) {
    return NextResponse.redirect(paymentReturnUrl(request, quarter, "missing-intent"));
  }

  const { data: obligation } = await supabase
    .from("filing_obligations")
    .select("id, status")
    .eq("id", intent.filing_obligation_id)
    .eq("user_id", user.id)
    .eq("period", quarterMeta.period)
    .maybeSingle();

  if (!obligation) {
    return NextResponse.redirect(paymentReturnUrl(request, quarter, "missing-intent"));
  }

  const wasAlreadyFiled = obligation.status === "filed";

  if (intent.state === "verified") {
    return NextResponse.redirect(paymentReturnUrl(request, quarter, "completed"));
  }

  const now = new Date().toISOString();
  const [intentResult, obligationResult] = await Promise.all([
    supabase
      .from("payment_intents")
      .update({
        state: "verified",
        provider_reference: transactionId,
        updated_at: now,
      })
      .eq("id", intent.id)
      .eq("user_id", user.id),
    supabase
      .from("filing_obligations")
      .update({ status: "paid", payment_status: "paid", updated_at: now })
      .eq("id", intent.filing_obligation_id)
      .eq("user_id", user.id),
  ]);

  if (intentResult.error || obligationResult.error) {
    return NextResponse.redirect(paymentReturnUrl(request, quarter, "update-failed"));
  }

  await supabase.from("audit_events").insert({
    user_id: user.id,
    actor_type: "external",
    actor_id: "eGovPay test return",
    action: "payment.completed",
    target_type: "payment_intent",
    target_id: intent.id,
    event_data: { transactionId },
  });

  // A failed SMS should never block the payment from being recorded.
  try {
    const ssoProfile = await getSsoMobile(user.id);
    await sendEgovPayPaymentReceiptSms({
      amount: Number(intent.amount),
      quarter,
      isFiled: wasAlreadyFiled,
      ssoProfile,
      transactionId,
    });
  } catch (error) {
    console.error("Could not send payment receipt SMS:", error);
  }

  return NextResponse.redirect(paymentReturnUrl(request, quarter, "completed"));
}
