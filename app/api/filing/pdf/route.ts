import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getQuarterMeta, parseFilingQuarter } from "@/lib/filing-periods";

export const runtime = "nodejs";

const formDirectory = path.join(process.cwd(), "public", "bir_forms");

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const supabase = await createClient();
  const quarter = parseFilingQuarter(request.nextUrl.searchParams.get("quarter"));
  const quarterMeta = getQuarterMeta(quarter);
  const download = request.nextUrl.searchParams.get("download") === "1";

  const { error: generatedError } = await supabase
    .from("filing_obligations")
    .update({ generated_pdf_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("period", quarterMeta.period);

  if (
    generatedError &&
    !generatedError.message.includes("generated_pdf_at") &&
    !generatedError.message.includes("schema cache")
  ) {
    console.error("Could not mark filing PDF as generated.", generatedError);
  }

  await supabase
    .from("filing_obligations")
    .update({ status: "ready" })
    .eq("user_id", user.id)
    .eq("period", quarterMeta.period)
    .eq("status", "draft");

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
