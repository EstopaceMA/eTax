import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { filingYear, getQuarterMeta, parseFilingQuarter } from "@/lib/filing-periods";
import type { TaxpayerProfile } from "@/lib/types";

export const runtime = "nodejs";

const formDirectory = path.join(process.cwd(), "public", "bir_forms");

function drawText(page: PDFPage, text: string | null | undefined, x: number, y: number, size = 8) {
  if (!text) {
    return;
  }

  page.drawText(text, {
    x,
    y,
    size,
    color: rgb(0.05, 0.08, 0.12),
  });
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const supabase = await createClient();
  const quarter = parseFilingQuarter(request.nextUrl.searchParams.get("quarter"));
  const quarterMeta = getQuarterMeta(quarter);
  const download = request.nextUrl.searchParams.get("download") === "1";

  const [{ data: profile }, { data: taxpayerProfile }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("taxpayer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const pdfBytes = await readFile(path.join(formDirectory, quarterMeta.pdfFile));
  const pdf = await PDFDocument.load(pdfBytes);
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.getPage(0);
  const taxpayer = taxpayerProfile as TaxpayerProfile | null;
  const tin = taxpayer?.tin_status ?? "";
  const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "";

  page.setFont(helvetica);
  drawText(page, String(filingYear), 484, 839, 9);
  drawText(page, quarterMeta.shortLabel, 210, 814, 9);
  drawText(page, fullName, 108, 727, 8);
  drawText(page, tin, 72, 748, 8);
  drawText(page, taxpayer?.rdo, 432, 748, 8);
  drawText(page, user.email, 108, 704, 7);
  drawText(page, taxpayer?.mobile_number, 432, 704, 7);
  drawText(page, taxpayer?.taxpayer_type, 108, 681, 7);
  drawText(page, taxpayer?.work_type, 108, 666, 7);

  page.setFont(bold);
  page.drawText("eTax preview", {
    x: 458,
    y: 58,
    size: 8,
    color: rgb(0, 0.47, 0.4),
  });
  page.setFont(helvetica);
  page.drawText(`Auto-filled from profile data for ${quarterMeta.label}.`, {
    x: 360,
    y: 45,
    size: 7,
    color: rgb(0.31, 0.36, 0.42),
  });

  const filledBytes = await pdf.save();
  const filename = `etax-${quarterMeta.formCode.toLowerCase()}-${sanitizeFilenamePart(quarterMeta.period)}.pdf`;

  return new NextResponse(Buffer.from(filledBytes), {
    headers: {
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
