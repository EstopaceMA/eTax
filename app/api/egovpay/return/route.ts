import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getQuarterMeta, parseFilingQuarter } from "@/lib/filing-periods";
import { sendEgovPayPaymentReceiptSms } from "@/lib/egovpay/payment-receipt-sms";
import { createClient } from "@/lib/supabase/server";

function paymentSuccessUrl(request: NextRequest, quarter: number, sms: string) {
  const url = new URL("/filing", request.url);

  url.searchParams.set("quarter", String(quarter));
  url.searchParams.set("view", "payment");
  url.searchParams.set("payment", "success");
  url.searchParams.set("sms", sms);

  return url;
}

function smsCookieName(transactionId: string) {
  const digest = createHash("sha256").update(transactionId).digest("hex").slice(0, 24);

  return `egovpay_sms_${digest}`;
}

export async function GET(request: NextRequest) {
  const quarter = parseFilingQuarter(request.nextUrl.searchParams.get("quarter"));
  const transactionId = request.nextUrl.searchParams.get("txnid")?.trim() ?? "";
  let smsStatus = "skipped";

  if (!/^ETAX-[A-Z0-9-]{4,40}$/.test(transactionId)) {
    return NextResponse.redirect(paymentSuccessUrl(request, quarter, "invalid-ref"));
  }

  const cookieStore = await cookies();
  const cookieName = smsCookieName(transactionId);

  if (cookieStore.get(cookieName)?.value === "sent") {
    return NextResponse.redirect(paymentSuccessUrl(request, quarter, "already-sent"));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      smsStatus = "signed-out";
    } else {
      const quarterMeta = getQuarterMeta(quarter);
      const { data: taxpayerProfile } = await supabase
        .from("taxpayer_profiles")
        .select("mobile_number")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: obligation } = await supabase
        .from("filing_obligations")
        .select("id, status")
        .eq("user_id", user.id)
        .in("period", [quarterMeta.period, ...(quarterMeta.periodAliases ?? [])])
        .maybeSingle();

      if (!obligation) {
        smsStatus = "missing-filing";
      } else {
        await supabase
          .from("filing_obligations")
          .update({ payment_status: "paid" })
          .eq("id", obligation.id)
          .eq("user_id", user.id);

        const result = await sendEgovPayPaymentReceiptSms({
          isFiled: obligation.status === "filed" || obligation.status === "paid",
          quarter,
          taxpayerProfile,
          transactionId,
        });

        smsStatus = result.status === "sent" ? "sent" : result.reason;
      }
    }
  } catch (error) {
    console.error("Could not send eGovPay payment receipt SMS.", error);
    smsStatus = "failed";
  }

  const response = NextResponse.redirect(paymentSuccessUrl(request, quarter, smsStatus));

  if (smsStatus === "sent") {
    response.cookies.set(cookieName, "sent", {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}
