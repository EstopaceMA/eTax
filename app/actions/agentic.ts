"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createExactApproval } from "@/lib/agentic/approvals";
import { appendAudit, refreshAgenticPlan } from "@/lib/agentic/orchestrator";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import {
  filingQuarters,
  getQuarterMeta,
  isFilingPeriodOpen,
  parseFilingQuarter,
  type FilingQuarter,
} from "@/lib/filing-periods";

function filingUrl(quarter: FilingQuarter, view: string, notice?: string) {
  const params = new URLSearchParams({ quarter: String(quarter), view });

  if (notice) {
    params.set("notice", notice);
  }

  return `/filing?${params.toString()}`;
}

function isChatCommand(formData: FormData) {
  return formData.get("source") === "agentic-chat";
}

export async function confirmIncomeRecord(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const quarterMeta = getQuarterMeta(quarter);
  const allowedPeriods =
    quarter === 4
      ? filingQuarters.flatMap(({ period, periodAliases = [] }) => [period, ...periodAliases])
      : [quarterMeta.period, ...(quarterMeta.periodAliases ?? [])];
  const amount = Number(String(formData.get("total_income") ?? "").replace(/,/g, ""));

  if (!isFilingPeriodOpen(quarterMeta.opensOn)) {
    if (isChatCommand(formData)) {
      return { ok: false as const, error: "This filing period has not opened yet." };
    }
    redirect(filingUrl(quarter, "records", "period-locked"));
  }

  if (!id || !Number.isFinite(amount) || amount < 0) {
    if (isChatCommand(formData)) {
      return { ok: false as const, error: "Enter a valid confirmed amount." };
    }
    redirect(filingUrl(quarter, "records", "invalid-record"));
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
    .in("period", allowedPeriods)
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
  await refreshAgenticPlan(quarter);
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  revalidatePath("/records");
  if (isChatCommand(formData)) {
    return { ok: true as const };
  }
  // Confirming from /records stays there so the rest of the queue can be worked
  // through. Compared against a literal rather than used as a path, so a forged
  // field cannot turn this into an open redirect.
  if (String(formData.get("return_to")) === "records") {
    redirect(`/records?quarter=${quarter}`);
  }
  redirect(filingUrl(quarter, "records", "record-confirmed"));
}

export async function confirmComputationReview(formData: FormData) {
  const user = await requireUser();
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const plan = await refreshAgenticPlan(quarter);

  if (plan.task.task_type !== "review_computation" || !plan.draft) {
    if (isChatCommand(formData)) {
      return { ok: false as const, error: "The computation is not ready for review." };
    }
    redirect(filingUrl(quarter, "review", "review-not-ready"));
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
  await refreshAgenticPlan(quarter);
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  if (isChatCommand(formData)) {
    return { ok: true as const };
  }
  redirect(filingUrl(quarter, "handoff", "review-confirmed"));
}

export async function approveFilingHandoff(formData: FormData) {
  const user = await requireUser();
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const quarterMeta = getQuarterMeta(quarter);
  const plan = await refreshAgenticPlan(quarter);

  if (plan.task.task_type !== "approve_handoff" || !plan.draft || !plan.computation) {
    if (isChatCommand(formData)) {
      return { ok: false as const, error: "The filing hand-off is not ready." };
    }
    redirect(filingUrl(quarter, "handoff", "handoff-not-ready"));
  }

  const payload = {
    amountPayable: plan.computation.output_snapshot.amountPayable,
    computationRunId: plan.computation.id,
    effect: "Prepare a guided official-channel filing hand-off; do not submit.",
    form: quarterMeta.formCode,
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
  await refreshAgenticPlan(quarter);
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  if (isChatCommand(formData)) {
    return { ok: true as const };
  }
  redirect(filingUrl(quarter, "handoff", "handoff-approved"));
}

export async function recordFilingAcknowledgement(formData: FormData) {
  const user = await requireUser();
  const quarter = parseFilingQuarter(String(formData.get("quarter")));
  const reference = String(formData.get("reference") ?? "").trim();

  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{5,79}$/.test(reference)) {
    if (isChatCommand(formData)) {
      return { ok: false as const, error: "Enter a valid acknowledgement reference." };
    }
    redirect(filingUrl(quarter, "handoff", "invalid-acknowledgement"));
  }

  const plan = await refreshAgenticPlan(quarter);

  if (plan.task.task_type !== "capture_acknowledgement" || !plan.draft) {
    if (isChatCommand(formData)) {
      return { ok: false as const, error: "The acknowledgement step is not ready." };
    }
    redirect(filingUrl(quarter, "handoff", "acknowledgement-not-ready"));
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
  await refreshAgenticPlan(quarter);
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  if (isChatCommand(formData)) {
    return { ok: true as const };
  }
  redirect(filingUrl(quarter, "payment", "acknowledgement-recorded"));
}
