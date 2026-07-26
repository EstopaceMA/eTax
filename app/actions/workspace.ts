"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/data";
import { extractInvoiceTotalFromDocument } from "@/lib/egov/document-extractor";
import { appendAudit, refreshAgenticPlan } from "@/lib/agentic/orchestrator";
import { getPeriodSlug, getQuarterMeta, parseFilingQuarter } from "@/lib/filing-periods";
import type { FilingQuarter } from "@/lib/filing-periods";
import type { ChecklistStatus, FilingStatus, PaymentStatus } from "@/lib/types";

async function blockLockedRecordChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  quarter: FilingQuarter,
  recordId: string,
) {
  const quarterMeta = getQuarterMeta(quarter);
  const { data: obligation } = await supabase
    .from("filing_obligations")
    .select("id")
    .eq("user_id", userId)
    .eq("period", quarterMeta.period)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!obligation) {
    return false;
  }

  const { data: lockedDraft } = await supabase
    .from("return_drafts")
    .select("id")
    .eq("user_id", userId)
    .eq("filing_obligation_id", obligation.id)
    .in("state", ["handed_off", "pending_verification", "filed"])
    .limit(1)
    .maybeSingle();

  if (!lockedDraft) {
    return false;
  }

  const { data: existingException } = await supabase
    .from("agent_exceptions")
    .select("id")
    .eq("user_id", userId)
    .eq("filing_obligation_id", obligation.id)
    .eq("exception_type", "locked_record_change")
    .eq("state", "open")
    .limit(1)
    .maybeSingle();

  if (!existingException) {
    await supabase.from("agent_exceptions").insert({
      user_id: userId,
      filing_obligation_id: obligation.id,
      exception_type: "locked_record_change",
      title: "A handed-off return includes this record",
      detail: "The requested record change was blocked to preserve the approved return snapshot.",
      state: "open",
      recovery_action: "Review the affected period and create a controlled adjustment.",
    });
  }

  await appendAudit(supabase, {
    userId,
    actorType: "system",
    actorId: "Assurance Agent",
    action: "income_record.change_blocked",
    targetType: "income_record",
    targetId: recordId,
    eventData: { returnDraftId: lockedDraft.id },
  });

  return true;
}

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
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  redirect(`/filing?quarter=${quarter}&view=handoff`);
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
  let extractedText: string | null = null;

  try {
    const extraction = await extractInvoiceTotalFromDocument(file, uploadBody);
    extractedTotalIncome = extraction.totalIncome;
    extractedText = extraction.extractedText;
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
    extraction_status: extractedTotalIncome === null ? "needs_review" : "provisional",
    extraction_confidence: extractedTotalIncome === null ? null : 0.75,
    extracted_text: extractedText,
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

  await appendAudit(supabase, {
    userId: user.id,
    actorType: "user",
    actorId: user.id,
    action: "income_record.uploaded",
    targetType: "income_record",
    targetId: storagePath,
    eventData: {
      extractionStatus: extractedTotalIncome === null ? "needs_review" : "provisional",
      filename: file.name,
      period: quarterMeta.period,
    },
  });
  await refreshAgenticPlan();
  revalidatePath(`/filing?quarter=${quarter}&view=records`);
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

  if (await blockLockedRecordChange(supabase, user.id, quarter, id)) {
    revalidatePath("/filing");
    redirect(`/filing?quarter=${quarter}&view=records&notice=record-locked`);
  }

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
      .update({
        total_income: totalIncome,
        extraction_status: "provisional",
        extraction_confidence: totalIncome === null ? null : 0.75,
        confirmed_at: null,
      })
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

  await appendAudit(supabase, {
    userId: user.id,
    actorType: "user",
    actorId: user.id,
    action: "income_record.amount_updated",
    targetType: "income_record",
    targetId: id,
    eventData: { totalIncome, verificationState: "provisional" },
  });
  await refreshAgenticPlan();
  revalidatePath(`/filing?quarter=${quarter}&view=records`);
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

  if (await blockLockedRecordChange(supabase, user.id, quarter, id)) {
    revalidatePath("/filing");
    redirect(`/filing?quarter=${quarter}&view=records&notice=record-locked`);
  }

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

  await appendAudit(supabase, {
    userId: user.id,
    actorType: "user",
    actorId: user.id,
    action: "income_record.deleted",
    targetType: "income_record",
    targetId: id,
    eventData: { storagePath },
  });
  await refreshAgenticPlan();
  revalidatePath(`/filing?quarter=${quarter}&view=records`);
  revalidatePath("/filing");
  revalidatePath("/dashboard");
}
