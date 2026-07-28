import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import {
  filingYear,
  getQuarterMeta,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { getWorkspaceData, requireUser } from "@/lib/data";
import { buildIdentityFromSso } from "@/lib/pdf/1701q/identity-from-sso";
import { computeQuarterly1701Q } from "@/lib/tax/1701q-compute";
import { gather1701QInputs } from "@/lib/tax/1701q-inputs";
import { getEightPercentRule } from "@/lib/tax/rule-sets";
import { render1701Q } from "@/lib/pdf/1701q/render";

export const runtime = "nodejs";
// The identity block is per-taxpayer, so this response must never be cached.
export const dynamic = "force-dynamic";

const formDirectory = path.join(process.cwd(), "public", "bir_forms");

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  const quarter = parseFilingQuarter(request.nextUrl.searchParams.get("quarter"));
  const quarterMeta = getQuarterMeta(quarter);
  const download = request.nextUrl.searchParams.get("download") === "1";
  const flatten = request.nextUrl.searchParams.get("flatten") === "1";

  let pdfBytes: Uint8Array | Buffer;

  if (quarterMeta.formCode === "1701Q") {
    const user = await requireUser();
    const { ssoProfile, taxpayerProfile } = await getWorkspaceData();
    const formQuarter = quarterMeta.quarter as 1 | 2 | 3;

    const rule = await getEightPercentRule(quarterMeta.dueDate);
    const inputs = await gather1701QInputs({
      userId: user.id,
      quarter: formQuarter,
      taxpayerType: taxpayerProfile?.taxpayer_type,
      eightPercentElectedYear: taxpayerProfile?.eight_percent_elected_year,
      taxYear: filingYear,
    });
    const computation = computeQuarterly1701Q(inputs, rule.configuration);

    pdfBytes = await render1701Q(
      {
        year: String(filingYear),
        quarter: formQuarter,
        amendedReturn: false,
        identity: buildIdentityFromSso({
          ssoProfile,
          taxpayerProfile,
          claimingForeignTaxCredits: computation.foreignTaxCredits > 0,
        }),
        scheduleII: computation,
        scheduleIII: computation,
        taxPayable: computation.taxPayable,
        totalAmountPayable: computation.totalAmountPayable,
        signatureName: ssoProfile?.full_name ?? "",
      },
      { flatten },
    );
  } else {
    pdfBytes = await readFile(path.join(formDirectory, quarterMeta.pdfFile));
  }
  const filename = `etax-${quarterMeta.formCode.toLowerCase()}-${sanitizeFilenamePart(quarterMeta.period)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
