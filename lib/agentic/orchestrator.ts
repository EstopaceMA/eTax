import { cache } from "react";
import {
  agenticSteps,
  computeDemoLiability,
  DEMO_RULE_ID,
  DEMO_RULE_VERSION,
  nextAgenticStep,
  stableHash,
  type AgenticStep,
  type WorkflowFacts,
} from "@/lib/agentic/domain";
import type {
  AgenticPlan,
  AgentTask,
  ComputationRun,
  ReturnDraft,
} from "@/lib/agentic/types";
import { getQuarterMeta } from "@/lib/filing-periods";
import { createClient } from "@/lib/supabase/server";
import type { FilingObligation, IncomeRecordUpload } from "@/lib/types";

const supportedQuarter = 2;
const taskMetadata: Record<
  AgenticStep,
  {
    ownerAgent: string;
    risk: "low" | "medium" | "high" | "material";
    title: string;
    reason: string;
    actionLabel: string;
    href: string;
    expectedOutput: string[];
  }
> = {
  collect_records: {
    ownerAgent: "Bookkeeping Agent",
    risk: "low",
    title: "Add this quarter's income records",
    reason: "The filing workspace needs evidence before it can prepare a review.",
    actionLabel: "Add records",
    href: "/filing?quarter=2&view=records",
    expectedOutput: ["At least one income record"],
  },
  confirm_extraction: {
    ownerAgent: "Document Agent",
    risk: "medium",
    title: "Confirm extracted income",
    reason: "Extracted values remain provisional until you verify them.",
    actionLabel: "Review records",
    href: "/filing?quarter=2&view=records",
    expectedOutput: ["Confirmed amount for every record"],
  },
  review_computation: {
    ownerAgent: "Computation Agent",
    risk: "high",
    title: "Review the demo computation",
    reason: "Check the records, assumptions, trace, and fixed pilot liability.",
    actionLabel: "Review computation",
    href: "/filing?quarter=2&view=review",
    expectedOutput: ["Reviewed return snapshot"],
  },
  approve_handoff: {
    ownerAgent: "Filing Agent",
    risk: "material",
    title: "Approve the filing hand-off",
    reason: "Approval applies only to the exact return snapshot shown in review.",
    actionLabel: "Review hand-off",
    href: "/filing?quarter=2&view=handoff",
    expectedOutput: ["Payload-bound filing approval"],
  },
  capture_acknowledgement: {
    ownerAgent: "Filing Agent",
    risk: "material",
    title: "Record the filing acknowledgement",
    reason: "A hand-off is not a completed filing until acknowledgement evidence is saved.",
    actionLabel: "Add acknowledgement",
    href: "/filing?quarter=2&view=handoff",
    expectedOutput: ["Official-channel acknowledgement reference"],
  },
  approve_payment: {
    ownerAgent: "Payment Agent",
    risk: "material",
    title: "Approve the separate payment hand-off",
    reason: "Filing approval never authorizes payment.",
    actionLabel: "Review payment",
    href: "/filing?quarter=2&view=payment",
    expectedOutput: ["Payload-bound payment approval"],
  },
  capture_payment_proof: {
    ownerAgent: "Payment Agent",
    risk: "material",
    title: "Add payment proof",
    reason: "Gateway navigation alone cannot verify that the liability was paid.",
    actionLabel: "Add proof",
    href: "/filing?quarter=2&view=payment",
    expectedOutput: ["Payment reference and proof"],
  },
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function appendAudit(
  supabase: SupabaseClient,
  input: {
    userId: string;
    actorType: "user" | "agent" | "system" | "external";
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    eventData?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("audit_events").insert({
    user_id: input.userId,
    actor_type: input.actorType,
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    event_data: input.eventData ?? {},
  });

  if (error) {
    throw new Error(`Could not append audit event: ${error.message}`);
  }
}

function taskState(
  step: AgenticStep,
  activeStep: AgenticStep,
  facts: WorkflowFacts,
): {
  state: AgentTask["state"];
  blocker: string | null;
  confidence: number;
} {
  const stepIndex = agenticSteps.indexOf(step);
  const activeIndex = agenticSteps.indexOf(activeStep);

  if (facts.paymentVerified || stepIndex < activeIndex) {
    return { state: "completed", blocker: null, confidence: 1 };
  }

  if (stepIndex > activeIndex) {
    return {
      state: "blocked",
      blocker: `Complete “${taskMetadata[activeStep].title}” first.`,
      confidence: 1,
    };
  }

  if (facts.hasException) {
    return {
      state: "exception",
      blocker: "An open exception needs review before the workflow can continue.",
      confidence: 0.25,
    };
  }

  const confidence =
    step === "confirm_extraction" ? 0.75 : step === "collect_records" ? 0.5 : 1;

  return { state: "ready_for_review", blocker: null, confidence };
}

async function prepareComputation(
  supabase: SupabaseClient,
  userId: string,
  obligation: FilingObligation,
  records: IncomeRecordUpload[],
) {
  if (
    records.length === 0 ||
    records.some(
      (record) => record.extraction_status !== "confirmed" || record.total_income === null,
    )
  ) {
    return { computation: null, draft: null };
  }

  const input = {
    period: obligation.period,
    recordIds: records.map(({ id }) => id).sort(),
    totalIncome: records.reduce((sum, record) => sum + Number(record.total_income), 0),
  };
  const inputHash = stableHash(input);
  const result = computeDemoLiability(input);
  const { data: existingComputation } = await supabase
    .from("computation_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("filing_obligation_id", obligation.id)
    .eq("rule_set_id", DEMO_RULE_ID)
    .eq("input_hash", inputHash)
    .maybeSingle();

  let computation = existingComputation as ComputationRun | null;

  if (!computation) {
    const { data, error } = await supabase
      .from("computation_runs")
      .insert({
        user_id: userId,
        filing_obligation_id: obligation.id,
        rule_set_id: DEMO_RULE_ID,
        input_hash: inputHash,
        input_snapshot: input,
        output_snapshot: {
          amountPayable: result.amountPayable,
          currency: result.currency,
        },
        trace: result.trace,
        assumptions: result.assumptions,
        warnings: result.warnings,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Could not persist computation run: ${error.message}`);
    }

    computation = data as ComputationRun;
    await appendAudit(supabase, {
      userId,
      actorType: "agent",
      actorId: "Computation Agent",
      action: "computation.prepared",
      targetType: "computation_run",
      targetId: computation.id,
      eventData: {
        inputHash,
        ruleId: DEMO_RULE_ID,
        ruleVersion: DEMO_RULE_VERSION,
      },
    });
  }

  const { data: existingDraft } = await supabase
    .from("return_drafts")
    .select("*")
    .eq("user_id", userId)
    .eq("filing_obligation_id", obligation.id)
    .eq("computation_run_id", computation.id)
    .maybeSingle();
  let draft = existingDraft as ReturnDraft | null;

  if (!draft) {
    const { data, error } = await supabase
      .from("return_drafts")
      .insert({
        user_id: userId,
        filing_obligation_id: obligation.id,
        computation_run_id: computation.id,
        state: "review",
        review_snapshot: {
          amountPayable: result.amountPayable,
          currency: result.currency,
          form: "1701Q",
          period: obligation.period,
          recordCount: records.length,
          totalIncome: input.totalIncome,
        },
        validations: [
          {
            code: "records_confirmed",
            status: "pass",
            message: "Every included income record has a confirmed amount.",
          },
          {
            code: "demo_rule",
            status: "warning",
            message: "This draft uses a fixed pilot liability, not a production tax rule.",
          },
        ],
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Could not persist return draft: ${error.message}`);
    }

    draft = data as ReturnDraft;
    await appendAudit(supabase, {
      userId,
      actorType: "agent",
      actorId: "Filing Agent",
      action: "return_draft.prepared",
      targetType: "return_draft",
      targetId: draft.id,
      eventData: { computationRunId: computation.id, version: draft.version },
    });
  }

  return { computation, draft };
}

export async function refreshAgenticPlan(): Promise<AgenticPlan> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to refresh the agentic plan.");
  }

  const quarter = getQuarterMeta(supportedQuarter);
  const { data: obligationData, error: obligationError } = await supabase
    .from("filing_obligations")
    .select("*")
    .eq("user_id", user.id)
    .eq("period", quarter.period)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (obligationError || !obligationData) {
    throw new Error(
      obligationError?.message ?? "The Q2 2026 filing obligation was not found.",
    );
  }

  const obligation = obligationData as FilingObligation;
  const [
    recordsResult,
    openExceptionResult,
    paymentIntentResult,
    paymentEvidenceResult,
  ] = await Promise.all([
    supabase
      .from("income_record_uploads")
      .select("*")
      .eq("user_id", user.id)
      .in("period", [quarter.period, ...(quarter.periodAliases ?? [])])
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_exceptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("filing_obligation_id", obligation.id)
      .eq("state", "open")
      .limit(1),
    supabase
      .from("payment_intents")
      .select("*")
      .eq("user_id", user.id)
      .eq("filing_obligation_id", obligation.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("payment_evidence")
      .select("id, payment_intent_id")
      .eq("user_id", user.id),
  ]);

  if (recordsResult.error) {
    throw new Error(`Could not load agent evidence: ${recordsResult.error.message}`);
  }

  const records = (recordsResult.data as IncomeRecordUpload[] | null) ?? [];
  const { computation, draft } = await prepareComputation(
    supabase,
    user.id,
    obligation,
    records,
  );
  const paymentIntent = paymentIntentResult.data?.[0] as
    | { id: string; state: string }
    | undefined;
  const paymentVerified =
    paymentIntent?.state === "verified" ||
    (paymentEvidenceResult.data ?? []).some(
      ({ payment_intent_id }) => payment_intent_id === paymentIntent?.id,
    );
  const facts: WorkflowFacts = {
    uploadCount: records.length,
    unconfirmedCount: records.filter(
      (record) => record.extraction_status !== "confirmed" || record.total_income === null,
    ).length,
    hasComputation: Boolean(computation),
    hasDraft: Boolean(draft),
    draftReviewed: Boolean(draft && draft.state !== "review"),
    handoffApproved: Boolean(
      draft &&
        ["handed_off", "pending_verification", "filed"].includes(draft.state),
    ),
    acknowledgementCaptured: Boolean(draft?.acknowledgement_reference),
    paymentApproved: Boolean(paymentIntent),
    paymentVerified,
    hasException: (openExceptionResult.data?.length ?? 0) > 0,
  };
  const activeStep = nextAgenticStep(facts);

  const taskRows = agenticSteps.map((step) => {
    const metadata = taskMetadata[step];
    const status = taskState(step, activeStep, facts);

    return {
      user_id: user.id,
      filing_obligation_id: obligation.id,
      task_type: step,
      owner_agent: metadata.ownerAgent,
      state: status.state,
      risk_level: metadata.risk,
      confidence: status.confidence,
      title:
        facts.paymentVerified && step === "capture_payment_proof"
          ? "Q2 filing journey complete"
          : metadata.title,
      reason:
        facts.paymentVerified && step === "capture_payment_proof"
          ? "Filing acknowledgement and payment proof are both preserved."
          : metadata.reason,
      blocker: status.blocker,
      action_label:
        facts.paymentVerified && step === "capture_payment_proof"
          ? "View filing"
          : metadata.actionLabel,
      action_href:
        facts.paymentVerified && step === "capture_payment_proof"
          ? "/filing?quarter=2&view=review"
          : metadata.href,
      evidence:
        step === "confirm_extraction"
          ? records.map(({ id, original_filename, extraction_status }) => ({
              id,
              filename: original_filename,
              status: extraction_status,
            }))
          : [],
      expected_output: metadata.expectedOutput,
      rule_set_id: [
        "review_computation",
        "approve_handoff",
        "capture_acknowledgement",
      ].includes(step)
        ? DEMO_RULE_ID
        : null,
      completed_at: status.state === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
  });

  const { data: tasksData, error: tasksError } = await supabase
    .from("agent_tasks")
    .upsert(taskRows, {
      onConflict: "user_id,filing_obligation_id,task_type",
    })
    .select("*");

  if (tasksError) {
    throw new Error(`Could not update agent tasks: ${tasksError.message}`);
  }

  const tasks = (tasksData as AgentTask[]).sort(
    (a, b) => agenticSteps.indexOf(a.task_type) - agenticSteps.indexOf(b.task_type),
  );
  const task =
    tasks.find(({ task_type }) => task_type === activeStep) ??
    tasks.at(-1);

  if (!task) {
    throw new Error("The agent did not produce a next action.");
  }

  const completedCount = tasks.filter(({ state }) => state === "completed").length;

  return {
    task,
    tasks,
    computation,
    draft,
    rule: {
      id: DEMO_RULE_ID,
      version: DEMO_RULE_VERSION,
      title: "Q2 2026 controlled demo liability",
      sourceTitle: "eTaxPH controlled pilot fixture - not an official tax authority",
      status: "demo",
    },
    progress: Math.round((completedCount / agenticSteps.length) * 100),
  };
}

export const getAgenticPlan = cache(refreshAgenticPlan);

export { appendAudit };
