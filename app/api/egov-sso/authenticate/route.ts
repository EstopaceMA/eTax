import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForToken, fetchSsoProfile } from "@/lib/egov-sso/client";
import { saveSsoProfile } from "@/lib/egov-sso/store";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    exchange_code?: string;
  } | null;

  const exchangeCode = body?.exchange_code;

  if (!exchangeCode) {
    return NextResponse.json(
      { error: "Missing exchange_code." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await exchangeCodeForToken(exchangeCode);
    const profile = await fetchSsoProfile(accessToken);
    const savedProfile = await saveSsoProfile(profile);

    return NextResponse.json({ profile: savedProfile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO auth failed." },
      { status: 502 },
    );
  }
}
