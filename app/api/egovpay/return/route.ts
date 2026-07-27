import { NextRequest, NextResponse } from "next/server";
import { parseFilingQuarter } from "@/lib/filing-periods";
import { createClient } from "@/lib/supabase/server";

function paymentReturnUrl(request: NextRequest, quarter: number, payment: string) {
  const url = new URL("/filing", request.url);

  url.searchParams.set("quarter", String(quarter));
  url.searchParams.set("view", "payment");
  url.searchParams.set("payment", payment);

  return url;
}

export async function GET(request: NextRequest) {
  const quarter = parseFilingQuarter(request.nextUrl.searchParams.get("quarter"));
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
    .select("id, filing_obligation_id")
    .eq("user_id", user.id)
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (!intent) {
    return NextResponse.redirect(paymentReturnUrl(request, quarter, "missing-intent"));
  }

  await Promise.all([
    supabase
      .from("payment_intents")
      .update({ state: "pending_verification", updated_at: new Date().toISOString() })
      .eq("id", intent.id)
      .eq("user_id", user.id),
    supabase
      .from("filing_obligations")
      .update({ payment_status: "pending_verification" })
      .eq("id", intent.filing_obligation_id)
      .eq("user_id", user.id),
    supabase.from("audit_events").insert({
      user_id: user.id,
      actor_type: "external",
      actor_id: "eGovPay test return",
      action: "payment.returned_unverified",
      target_type: "payment_intent",
      target_id: intent.id,
      event_data: { transactionId },
    }),
  ]);

  return NextResponse.redirect(paymentReturnUrl(request, quarter, "proof-required"));
}
