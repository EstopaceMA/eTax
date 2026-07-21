"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/data";
import { extractInvoiceTotalFromDocument } from "@/lib/egov/document-extractor";
import { sendFilingConfirmationSms } from "@/lib/filing-confirmation-sms";
import { getPeriodSlug, getQuarterMeta, parseFilingQuarter } from "@/lib/filing-periods";
import type { ChecklistStatus, FilingStatus, PaymentStatus } from "@/lib/types";

export async function updateChecklistItem(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ChecklistStatus;

  await supabase
    .from("document_checklist_items")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

export async function updateFilingStatus(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as FilingStatus;
  const paymentStatus = String(formData.get("payment_status")) as PaymentStatus;

  await supabase
    .from("filing_obligations")
    .update({ status, payment_status: paymentStatus })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/filing");
  revalidatePath("/dashboard");
}

export async function fileTaxReturn(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const quarterMeta = getQuarterMeta(quarter);
  let smsStatus = "skipped";

  const { data: obligation } = await supabase
    .from("filing_obligations")
    .select("id, payment_status, status")
    .eq("user_id", user.id)
    .in("period", [quarterMeta.period, ...(quarterMeta.periodAliases ?? [])])
    .maybeSingle();

  if (!obligation) {
    redirect(`/filing?quarter=${quarter}&view=bir-form&filing=missing`);
  }

  if (obligation.status === "filed" || obligation.status === "paid") {
    redirect(`/filing?quarter=${quarter}&view=bir-form&filing=already-filed`);
  }

  await supabase
    .from("filing_obligations")
    .update({ status: "filed" })
    .eq("id", obligation.id)
    .eq("user_id", user.id);

  try {
    const { data: taxpayerProfile } = await supabase
      .from("taxpayer_profiles")
      .select("mobile_number")
      .eq("user_id", user.id)
      .maybeSingle();
    const result = await sendFilingConfirmationSms({
      isPaid: obligation.payment_status === "paid",
      quarter,
      taxpayerProfile,
    });

    smsStatus = result.status === "sent" ? "sent" : result.reason;
  } catch (error) {
    console.error("Could not send filing confirmation SMS.", error);
    smsStatus = "failed";
  }

  revalidatePath("/filing");
  revalidatePath("/dashboard");
  redirect(`/filing?quarter=${quarter}&view=bir-form&filing=filed&sms=${smsStatus}`);
}

export async function uploadIncomeRecord(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const quarterMeta = getQuarterMeta(quarter);
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const supportedDocument =
    file.type.startsWith("image/") || file.type === "application/pdf";

  if (!supportedDocument) {
    return;
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg";
  const safeFilename = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const storagePath = `${user.id}/${getPeriodSlug(quarterMeta.period)}/${randomUUID()}-${safeFilename || "income-record"}.${extension}`;
  const uploadBody = Buffer.from(await file.arrayBuffer());
  let extractedTotalIncome: number | null = null;

  try {
    const extraction = await extractInvoiceTotalFromDocument(file, uploadBody);
    extractedTotalIncome = extraction.totalIncome;
  } catch (error) {
    console.error("Could not extract invoice total from income record.", error);
  }

  const { data: bucket } = await adminSupabase.storage.getBucket("income-records");

  if (!bucket) {
    const { error: bucketError } = await adminSupabase.storage.createBucket(
      "income-records",
      {
        public: false,
      },
    );

    if (bucketError) {
      throw new Error(`Could not prepare income record storage: ${bucketError.message}`);
    }
  }

  const { error: uploadError } = await adminSupabase.storage
    .from("income-records")
    .upload(storagePath, uploadBody, {
      contentType: file.type,
      upsert: false,
  });

  if (uploadError) {
    throw new Error(`Could not upload income record image: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("income_record_uploads").insert({
    user_id: user.id,
    quarter,
    period: quarterMeta.period,
    original_filename: file.name,
    storage_path: storagePath,
    content_type: file.type,
    size_bytes: file.size,
    total_income: extractedTotalIncome,
  });

  if (insertError) {
    const missingMetadataTable =
      insertError.message.includes("income_record_uploads") &&
      insertError.message.includes("schema cache");

    if (!missingMetadataTable) {
      throw new Error(`Could not save income record metadata: ${insertError.message}`);
    }
  }

  if (extractedTotalIncome !== null) {
    const { error: metadataError } = await adminSupabase.storage
      .from("income-records")
      .upload(
        `${storagePath}.metadata.json`,
        Buffer.from(JSON.stringify({ total_income: extractedTotalIncome })),
        {
          contentType: "application/json",
          upsert: true,
        },
      );

    if (metadataError) {
      console.error("Could not save extracted income record metadata.", metadataError);
    }
  }

  revalidatePath(`/filing?quarter=${quarter}&view=documents`);
  revalidatePath("/filing");
}

export async function updateIncomeRecordTotal(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const id = String(formData.get("id"));
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const storagePath = String(formData.get("storage_path") ?? "");
  const rawTotalIncome = String(formData.get("total_income") ?? "").trim();

  const totalIncome =
    rawTotalIncome.length === 0 ? null : Number(rawTotalIncome.replace(/,/g, ""));

  if (totalIncome !== null && (!Number.isFinite(totalIncome) || totalIncome < 0)) {
    return;
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const isOwnStoragePath = storagePath.startsWith(`${user.id}/`);

  if (isUuid) {
    const { error } = await supabase
      .from("income_record_uploads")
      .update({ total_income: totalIncome })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      const missingMetadataTable =
        error.message.includes("income_record_uploads") && error.message.includes("schema cache");

      if (!missingMetadataTable) {
        throw new Error(`Could not update total income: ${error.message}`);
      }
    }
  }

  if (isOwnStoragePath) {
    const metadataPath = `${storagePath}.metadata.json`;
    const { error: metadataError } = await adminSupabase.storage
      .from("income-records")
      .upload(
        metadataPath,
        Buffer.from(JSON.stringify({ total_income: totalIncome })),
        {
          contentType: "application/json",
          upsert: true,
        },
      );

    if (metadataError) {
      throw new Error(`Could not save total income metadata: ${metadataError.message}`);
    }
  }

  revalidatePath(`/filing?quarter=${quarter}&view=documents`);
  revalidatePath("/filing");
}

export async function deleteIncomeRecord(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const id = String(formData.get("id"));
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const storagePath = String(formData.get("storage_path") ?? "");
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const isOwnStoragePath = storagePath.startsWith(`${user.id}/`);

  if (isUuid) {
    const { error } = await supabase
      .from("income_record_uploads")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      const missingMetadataTable =
        error.message.includes("income_record_uploads") &&
        error.message.includes("schema cache");

      if (!missingMetadataTable) {
        throw new Error(`Could not delete income record metadata: ${error.message}`);
      }
    }
  }

  if (isOwnStoragePath) {
    const { error } = await adminSupabase
      .storage
      .from("income-records")
      .remove([storagePath, `${storagePath}.metadata.json`]);

    if (error) {
      throw new Error(`Could not delete income record file: ${error.message}`);
    }
  }

  revalidatePath(`/filing?quarter=${quarter}&view=documents`);
  revalidatePath("/filing");
  revalidatePath("/dashboard");
}
