import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import {
  filingYear,
  getQuarterMeta,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { getWorkspaceData } from "@/lib/data";
import { DUMMY_1701Q } from "@/lib/pdf/1701q/dummy-data";
import { buildIdentityFromSso } from "@/lib/pdf/1701q/identity-from-sso";
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

  const { ssoProfile, taxpayerProfile } = await getWorkspaceData();
  const pdfBytes =
    quarterMeta.formCode === "1701Q"
      ? await render1701Q(
          {
            ...DUMMY_1701Q,
            // Amounts still come from the fixture; the identity block is real.
            identity: buildIdentityFromSso({
              ssoProfile,
              taxpayerProfile,
              claimingForeignTaxCredits:
                DUMMY_1701Q.scheduleIII.foreignTaxCredits > 0,
            }),
            year: String(filingYear),
            quarter: quarterMeta.quarter as 1 | 2 | 3,
          },
          { flatten },
        )
      : await readFile(path.join(formDirectory, quarterMeta.pdfFile));
  const filename = `etax-${quarterMeta.formCode.toLowerCase()}-${sanitizeFilenamePart(quarterMeta.period)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
