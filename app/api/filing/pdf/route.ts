import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getQuarterMeta, parseFilingQuarter } from "@/lib/filing-periods";

export const runtime = "nodejs";

const formDirectory = path.join(process.cwd(), "public", "bir_forms");

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  const quarter = parseFilingQuarter(request.nextUrl.searchParams.get("quarter"));
  const quarterMeta = getQuarterMeta(quarter);
  const download = request.nextUrl.searchParams.get("download") === "1";

  const pdfBytes = await readFile(path.join(formDirectory, quarterMeta.pdfFile));
  const filename = `etax-${quarterMeta.formCode.toLowerCase()}-${sanitizeFilenamePart(quarterMeta.period)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
