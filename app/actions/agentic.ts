"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createExactApproval } from "@/lib/agentic/approvals";
import { appendAudit, refreshAgenticPlan } from "@/lib/agentic/orchestrator";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";

function filingUrl(view: string, notice?: string) {
  const params = new URLSearchParams({ quarter: "2", view });

  if (notice) {
    params.set("notice", notice);
  }

  return `/filing?${params.toString()}`;
}

export async function confirmIncomeRecord(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const amount = Number(String(formData.get("total_income") ?? "").replace(/,/g, ""));

  if (!id || !Number.isFinite(amount) || amount < 0) {
    redirect(filingUrl("records", "invalid-record"));
  }

  const { data, error } = await supabase
    .from("income_record_uploads")
    .update({
      total_income: amount,
      extraction_status: "confirmed",
      extraction_confidence: 1,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, original_filename")
    .single();

  if (error) {
    throw new Error(`Could not confirm extracted income: ${error.message}`);
  }

  await appendAudit(supabase, {
    userId: user.id,
    actorType: "user",
    actorId: user.id,
    action: "income_record.confirmed",
    targetType: "income_record",
    targetId: data.id,
    eventData: { amount, filename: data.original_filename },
  });
  await refreshAgenticPlan();
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect(filingUrl("records", "record-confirmed"));
}

export async function confirmComputationReview() {
  const user = await requireUser();
  const plan = await refreshAgenticPlan();

  if (plan.task.task_type !== "review_computation" || !plan.draft) {
    redirect(filingUrl("review", "review-not-ready"));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("return_drafts")
    .update({ state: "approved", updated_at: new Date().toISOString() })
    .eq("id", plan.draft.id)
    .eq("user_id", user.id)
    .eq("state", "review");

  if (error) {
    throw new Error(`Could not confirm the computation review: ${error.message}`);
  }

  await appendAudit(supabase, {
    userId: user.id,
    actorType: "user",
    actorId: user.id,
    action: "computation.reviewed",
    targetType: "return_draft",
    targetId: plan.draft.id,
    eventData: { computationRunId: plan.computation?.id, ruleId: plan.rule.id },
  });
  await refreshAgenticPlan();
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect(filingUrl("handoff", "review-confirmed"));
}

export async function approveFilingHandoff() {
  const user = await requireUser();
  const plan = await refreshAgenticPlan();

  if (plan.task.task_type !== "approve_handoff" || !plan.draft || !plan.computation) {
    redirect(filingUrl("handoff", "handoff-not-ready"));
  }

  const payload = {
    amountPayable: plan.computation.output_snapshot.amountPayable,
    computationRunId: plan.computation.id,
    effect: "Prepare a guided official-channel filing hand-off; do not submit.",
    form: "1701Q",
    period: plan.computation.input_snapshot.period,
    returnDraftId: plan.draft.id,
    ruleId: plan.rule.id,
    ruleVersion: plan.rule.version,
  };
  const approval = await createExactApproval({
    userId: user.id,
    task: plan.task,
    actionType: "filing_handoff",
    targetType: "return_draft",
    targetId: plan.draft.id,
    payload,
  });
  const supabase = await createClient();

  await Promise.all([
    supabase
      .from("return_drafts")
      .update({ state: "handed_off", updated_at: new Date().toISOString() })
      .eq("id", plan.draft.id)
      .eq("user_id", user.id),
    supabase
      .from("filing_obligations")
      .update({ status: "handed_off" })
      .eq("id", plan.task.filing_obligation_id)
      .eq("user_id", user.id),
  ]);
  await appendAudit(supabase, {
    userId: user.id,
    actorType: "system",
    actorId: "Filing Agent",
    action: "filing_handoff.prepared",
    targetType: "return_draft",
    targetId: plan.draft.id,
    eventData: { approvalId: approval.id, effect: payload.effect },
  });
  await refreshAgenticPlan();
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect(filingUrl("handoff", "handoff-approved"));
}

export async function recordFilingAcknowledgement(formData: FormData) {
  const user = await requireUser();
  const reference = String(formData.get("reference") ?? "").trim();

  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{5,79}$/.test(reference)) {
    redirect(filingUrl("handoff", "invalid-acknowledgement"));
  }

  const plan = await refreshAgenticPlan();

  if (plan.task.task_type !== "capture_acknowledgement" || !plan.draft) {
    redirect(filingUrl("handoff", "acknowledgement-not-ready"));
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const [draftResult, obligationResult] = await Promise.all([
    supabase
      .from("return_drafts")
      .update({
        state: "filed",
        acknowledgement_reference: reference,
        acknowledged_at: now,
        updated_at: now,
      })
      .eq("id", plan.draft.id)
      .eq("user_id", user.id),
    supabase
      .from("filing_obligations")
      .update({ status: "filed", payment_status: "approval_required" })
      .eq("id", plan.task.filing_obligation_id)
      .eq("user_id", user.id),
  ]);

  if (draftResult.error || obligationResult.error) {
    throw new Error(
      `Could not preserve filing acknowledgement: ${
        draftResult.error?.message ?? obligationResult.error?.message
      }`,
    );
  }

  await appendAudit(supabase, {
    userId: user.id,
    actorType: "user",
    actorId: user.id,
    action: "filing.acknowledgement_recorded",
    targetType: "return_draft",
    targetId: plan.draft.id,
    eventData: { reference },
  });
  await refreshAgenticPlan();
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect(filingUrl("payment", "acknowledgement-recorded"));
}

export async function uploadPaymentProof(formData: FormData) {
  const user = await requireUser();
  const plan = await refreshAgenticPlan();
  const file = formData.get("file");
  const reference = String(formData.get("reference") ?? "").trim();

  if (
    plan.task.task_type !== "capture_payment_proof" ||
    !(file instanceof File) ||
    file.size === 0 ||
    !reference
  ) {
    redirect(filingUrl("payment", "invalid-payment-proof"));
  }

  const supported = file.type.startsWith("image/") || file.type === "application/pdf";

  if (!supported || file.size > 10 * 1024 * 1024) {
    redirect(filingUrl("payment", "invalid-payment-proof"));
  }

  const supabase = await createClient();
  const { data: intent } = await supabase
    .from("payment_intents")
    .select("*")
    .eq("user_id", user.id)
    .eq("filing_obligation_id", plan.task.filing_obligation_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!intent) {
    redirect(filingUrl("payment", "payment-not-approved"));
  }

  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
  const storagePath = `${user.id}/${intent.id}/${randomUUID()}.${extension}`;
  const adminSupabase = createAdminClient();
  const upload = await adminSupabase.storage
    .from("payment-evidence")
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });

  if (upload.error) {
    throw new Error(`Could not upload payment proof: ${upload.error.message}`);
  }

  const { error: evidenceError } = await supabase.from("payment_evidence").insert({
    user_id: user.id,
    payment_intent_id: intent.id,
    original_filename: file.name,
    storage_path: storagePath,
    content_type: file.type,
    size_bytes: file.size,
    reference,
  });

  if (evidenceError) {
    throw new Error(`Could not save payment proof: ${evidenceError.message}`);
  }

  await Promise.all([
    supabase
      .from("payment_intents")
      .update({ state: "verified", provider_reference: reference, updated_at: new Date().toISOString() })
      .eq("id", intent.id)
      .eq("user_id", user.id),
    supabase
      .from("filing_obligations")
      .update({ status: "paid", payment_status: "paid" })
      .eq("id", plan.task.filing_obligation_id)
      .eq("user_id", user.id),
  ]);
  await appendAudit(supabase, {
    userId: user.id,
    actorType: "user",
    actorId: user.id,
    action: "payment.proof_recorded",
    targetType: "payment_intent",
    targetId: intent.id,
    eventData: { filename: file.name, reference },
  });
  await refreshAgenticPlan();
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect(filingUrl("payment", "payment-verified"));
}
