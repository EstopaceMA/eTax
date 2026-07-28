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
import {
  filingQuarters,
  filingYear,
  getQuarterMeta,
  isFilingPeriodOpen,
  type FilingQuarter,
} from "@/lib/filing-periods";
import { createClient } from "@/lib/supabase/server";
import type { FilingObligation, IncomeRecordUpload } from "@/lib/types";
import { computeQuarterly1701Q } from "@/lib/tax/1701q-compute";
import { gather1701QInputs } from "@/lib/tax/1701q-inputs";
import {
  getEightPercentRule,
  type EightPercentRuleConfig,
  type TaxRuleSet,
} from "@/lib/tax/rule-sets";

const taskMetadata: Record<
  AgenticStep,
  {
    ownerAgent: string;
    risk: "low" | "medium" | "high" | "material";
    title: string;
    reason: string;
    actionLabel: string;
    expectedOutput: string[];
  }
> = {
  collect_records: {
    ownerAgent: "Bookkeeping Agent",
    risk: "low",
    title: "Add this quarter's income records",
    reason: "The filing workspace needs evidence before it can prepare a review.",
    actionLabel: "Add records",
    expectedOutput: ["At least one income record"],
  },
  confirm_extraction: {
    ownerAgent: "Document Agent",
    risk: "medium",
    title: "Confirm extracted income",
    reason: "Extracted values remain provisional until you verify them.",
    actionLabel: "Review records",
    expectedOutput: ["Confirmed amount for every record"],
  },
  review_computation: {
    ownerAgent: "Computation Agent",
    risk: "high",
    title: "Review the demo computation",
    reason: "Check the records, assumptions, trace, and illustrative pilot liability.",
    actionLabel: "Review computation",
    expectedOutput: ["Reviewed return snapshot"],
  },
  approve_handoff: {
    ownerAgent: "Filing Agent",
    risk: "material",
    title: "Approve the filing hand-off",
    reason: "Approval applies only to the exact return snapshot shown in review.",
    actionLabel: "Review hand-off",
    expectedOutput: ["Payload-bound filing approval"],
  },
  capture_acknowledgement: {
    ownerAgent: "Filing Agent",
    risk: "material",
    title: "Record the filing acknowledgement",
    reason: "A hand-off is not a completed filing until acknowledgement evidence is saved.",
    actionLabel: "Add acknowledgement",
    expectedOutput: ["Official-channel acknowledgement reference"],
  },
  approve_payment: {
    ownerAgent: "Payment Agent",
    risk: "material",
    title: "Approve the separate payment hand-off",
    reason: "Filing approval never authorizes payment.",
    actionLabel: "Review payment",
    expectedOutput: ["Payload-bound payment approval"],
  },
  capture_payment_proof: {
    ownerAgent: "Payment Agent",
    risk: "material",
    title: "Add payment proof",
    reason: "Gateway navigation alone cannot verify that the liability was paid.",
    actionLabel: "Add proof",
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
  periodOpen: boolean,
): {
  state: AgentTask["state"];
  blocker: string | null;
  confidence: number;
} {
  const stepIndex = agenticSteps.indexOf(step);
  const activeIndex = agenticSteps.indexOf(activeStep);

  if (!periodOpen) {
    return {
      state: "blocked",
      blocker: "This filing period has not opened yet.",
      confidence: 1,
    };
  }

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
  quarterMeta: { quarter: number; formCode: "1701Q" | "1701A"; dueDate: string },
  activeRule: TaxRuleSet<EightPercentRuleConfig> | null,
) {
  if (
    records.length === 0 ||
    records.some(
      (record) => record.extraction_status !== "confirmed" || record.total_income === null,
    )
  ) {
    return { computation: null, draft: null };
  }

  let ruleId: string;
  let ruleVersion: string;
  let input: Record<string, unknown>;
  let outputSnapshot: Record<string, unknown>;
  let trace: Array<{ label: string; value: string | number }>;
  let assumptions: string[];
  let warnings: string[];

  // 1701Q (quarters 1-3): the real 8% computation, per RA 10963 (TRAIN) / RR 8-2018.
  // 1701A (quarter 4, annual) has no verified computation yet, so it still runs
  // the illustrative demo rule below rather than an unresearched guess.
  if (quarterMeta.formCode === "1701Q" && activeRule) {
    const { data: taxpayerProfileRow } = await supabase
      .from("taxpayer_profiles")
      .select("taxpayer_type, eight_percent_elected_year")
      .eq("user_id", userId)
      .maybeSingle();

    const gathered = await gather1701QInputs({
      userId,
      quarter: quarterMeta.quarter as 1 | 2 | 3,
      taxpayerType:
        (taxpayerProfileRow as { taxpayer_type?: string } | null)?.taxpayer_type ?? null,
      eightPercentElectedYear:
        (taxpayerProfileRow as { eight_percent_elected_year?: number } | null)
          ?.eight_percent_elected_year ?? null,
      taxYear: filingYear,
    });
    const result = computeQuarterly1701Q(gathered, activeRule.configuration);

    ruleId = activeRule.id;
    ruleVersion = activeRule.version;
    input = {
      period: obligation.period,
      recordIds: records.map(({ id }) => id).sort(),
      totalIncome: gathered.grossThisQuarter,
      ...gathered,
    };
    outputSnapshot = {
      ...result,
      amountPayable: result.taxPayable,
      currency: activeRule.configuration.currency,
    };
    trace = [
      { label: "Covered period", value: obligation.period },
      { label: "Confirmed income records", value: records.length },
      { label: "Sales/receipts this quarter (Item 47)", value: result.salesRevenuesReceiptsFees },
      {
        label: "Taxable income, prior quarters (Item 50)",
        value: result.taxableIncomePreviousQuarters,
      },
      { label: "Cumulative taxable income (Item 51)", value: result.cumulativeTaxableIncome },
      { label: "Allowable reduction (Item 52)", value: result.allowableReduction },
      { label: "Taxable income to date (Item 53)", value: result.taxableIncomeToDate },
      { label: "Tax rate", value: `${(Number(activeRule.configuration.rate) * 100).toFixed(0)}%` },
      { label: "Tax due (Item 54)", value: result.taxDue },
      {
        label: "Credited: prior quarters paid (Item 56)",
        value: result.taxPaymentsPreviousQuarters,
      },
      { label: "Tax payable (Item 63)", value: result.taxPayable },
      {
        label: "Rounding",
        value:
          activeRule.configuration.rounding === "whole_peso"
            ? "PHP, whole pesos"
            : "PHP, 2 decimal places",
      },
    ];
    assumptions = [
      ...result.assumptions,
      `Computed under ${activeRule.title} (${activeRule.sourceTitle}).`,
    ];
    warnings = result.warnings;
  } else {
    const demoInput = {
      period: obligation.period,
      recordIds: records.map(({ id }) => id).sort(),
      totalIncome: records.reduce((sum, record) => sum + Number(record.total_income), 0),
    };
    const result = computeDemoLiability(demoInput);

    ruleId = DEMO_RULE_ID;
    ruleVersion = DEMO_RULE_VERSION;
    input = demoInput;
    outputSnapshot = { amountPayable: result.amountPayable, currency: result.currency };
    trace = result.trace;
    assumptions = result.assumptions;
    warnings = result.warnings;
  }

  const inputHash = stableHash(input);
  const { data: existingComputation } = await supabase
    .from("computation_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("filing_obligation_id", obligation.id)
    .eq("rule_set_id", ruleId)
    .eq("input_hash", inputHash)
    .maybeSingle();

  let computation = existingComputation as ComputationRun | null;

  if (!computation) {
    const { data, error } = await supabase
      .from("computation_runs")
      .insert({
        user_id: userId,
        filing_obligation_id: obligation.id,
        rule_set_id: ruleId,
        input_hash: inputHash,
        input_snapshot: input,
        output_snapshot: outputSnapshot,
        trace,
        assumptions,
        warnings,
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
        ruleId,
        ruleVersion,
      },
    });
  }

  const result = {
    amountPayable: computation.output_snapshot.amountPayable,
    currency: computation.output_snapshot.currency,
  };

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
          form: quarterMeta.formCode,
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
          ruleId === DEMO_RULE_ID
            ? {
                code: "demo_rule",
                status: "warning" as const,
                message:
                  "This draft uses an illustrative 6% pilot rule, not a production tax rule.",
              }
            : {
                code: "rule_applied",
                status: warnings.length > 0 ? ("warning" as const) : ("pass" as const),
                message:
                  warnings[0] ??
                  `Computed under ${ruleVersion} of the 8% income tax option (RA 10963 / RR 8-2018).`,
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

function deduplicateAnnualRecords(records: IncomeRecordUpload[]) {
  const seen = new Set<string>();

  return records.filter((record) => {
    const key = record.content_hash ? `hash:${record.content_hash}` : `id:${record.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function taskView(step: AgenticStep) {
  if (step === "collect_records" || step === "confirm_extraction") {
    return "records";
  }

  if (step === "review_computation") {
    return "review";
  }

  if (step === "approve_handoff" || step === "capture_acknowledgement") {
    return "handoff";
  }

  return "payment";
}

export async function refreshAgenticPlan(
  selectedQuarter: FilingQuarter = 2,
): Promise<AgenticPlan> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to refresh the agentic plan.");
  }

  const quarter = getQuarterMeta(selectedQuarter);
  const periodOpen = isFilingPeriodOpen(quarter.opensOn);
  // 1701A (annual, quarter 4) has no verified computation yet; only 1701Q
  // quarters look up the real 8% rule.
  const activeRule =
    quarter.formCode === "1701Q" ? await getEightPercentRule(quarter.dueDate) : null;
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
      obligationError?.message ?? `The ${quarter.period} filing obligation was not found.`,
    );
  }

  const obligation = obligationData as FilingObligation;
  const recordPeriods =
    selectedQuarter === 4
      ? filingQuarters.flatMap(({ period, periodAliases = [] }) => [period, ...periodAliases])
      : [quarter.period, ...(quarter.periodAliases ?? [])];
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
      .in("period", recordPeriods)
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
      .select("id, payment_intent_id, reference, original_filename, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (recordsResult.error) {
    throw new Error(`Could not load agent evidence: ${recordsResult.error.message}`);
  }

  if (paymentIntentResult.error || paymentEvidenceResult.error) {
    throw new Error(
      paymentIntentResult.error?.message ??
        paymentEvidenceResult.error?.message ??
        "Could not load payment evidence.",
    );
  }

  const loadedRecords = (recordsResult.data as IncomeRecordUpload[] | null) ?? [];
  const records =
    selectedQuarter === 4 ? deduplicateAnnualRecords(loadedRecords) : loadedRecords;
  const { computation, draft } = periodOpen
    ? await prepareComputation(
        supabase,
        user.id,
        obligation,
        records,
        quarter,
        activeRule,
      )
    : { computation: null, draft: null };
  const paymentIntent = paymentIntentResult.data?.[0] as
    | {
        id: string;
        state: string;
        amount: number | string;
        currency: string;
        provider_reference: string | null;
      }
    | undefined;
  const paymentProof = (paymentEvidenceResult.data ?? []).find(
    ({ payment_intent_id }) => payment_intent_id === paymentIntent?.id,
  );
  const paymentVerified =
    paymentIntent?.state === "verified" ||
    Boolean(paymentProof);
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
  const realTaxComputationApplies = quarter.formCode === "1701Q" && Boolean(activeRule);

  const taskRows = agenticSteps.map((step) => {
    const metadata = taskMetadata[step];
    const status = taskState(step, activeStep, facts, periodOpen);
    const computationRuleSetId = computation?.rule_set_id ?? null;
    const reviewTitle = realTaxComputationApplies
      ? "Review the tax computation"
      : metadata.title;
    const reviewReason = realTaxComputationApplies
      ? "Check the records, assumptions, trace, and computed liability."
      : metadata.reason;

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
          ? `${quarter.period} filing journey complete`
          : step === "review_computation"
            ? reviewTitle
          : metadata.title,
      reason:
        facts.paymentVerified && step === "capture_payment_proof"
          ? "Filing acknowledgement and payment proof are both preserved."
          : step === "review_computation"
            ? reviewReason
          : metadata.reason,
      blocker: status.blocker,
      action_label:
        facts.paymentVerified && step === "capture_payment_proof"
          ? "View filing"
          : metadata.actionLabel,
      action_href:
        facts.paymentVerified && step === "capture_payment_proof"
          ? `/filing?quarter=${selectedQuarter}&view=review`
          : `/filing?quarter=${selectedQuarter}&view=${taskView(step)}`,
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
        ? computationRuleSetId
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
    rule: activeRule
      ? {
          id: activeRule.id,
          version: activeRule.version,
          title: `${quarter.period} — ${activeRule.title}`,
          sourceTitle: activeRule.sourceTitle,
          status: "active",
        }
      : {
          id: DEMO_RULE_ID,
          version: DEMO_RULE_VERSION,
          title: `${quarter.period} illustrative six-percent liability`,
          sourceTitle: "eTaxPH controlled pilot fixture - not an official tax authority",
          status: "demo",
        },
    progress: Math.round((completedCount / agenticSteps.length) * 100),
    period: {
      quarter: selectedQuarter,
      label: quarter.label,
      shortLabel: quarter.shortLabel,
      period: quarter.period,
      opensOn: quarter.opensOn,
      dueDate: quarter.dueDate,
      formCode: quarter.formCode,
      formTitle: quarter.formTitle,
      isOpen: periodOpen,
      lockedReason: periodOpen
        ? null
        : `${quarter.label} opens on ${quarter.opensOn}. You can preview the journey now.`,
    },
    obligation,
    records,
    payment: {
      intentState: paymentIntent?.state ?? null,
      approvalRecorded: Boolean(paymentIntent),
      proofStored: paymentVerified,
      amount: paymentIntent ? Number(paymentIntent.amount) : null,
      currency: paymentIntent?.currency === "PHP" ? "PHP" : null,
      reference: paymentProof?.reference ?? paymentIntent?.provider_reference ?? null,
      proofFilename: paymentProof?.original_filename ?? null,
    },
    snapshotVersion: stableHash({
      activeStep,
      computationId: computation?.id ?? null,
      draftId: draft?.id ?? null,
      obligationStatus: obligation.status,
      paymentIntentState: paymentIntent?.state ?? null,
      paymentProofId: paymentProof?.id ?? null,
      paymentStatus: obligation.payment_status,
      period: quarter.period,
      recordIds: records.map(({ id, updated_at }) => [id, updated_at]),
    }),
  };
}

export const getAgenticPlan = cache(refreshAgenticPlan);

export { appendAudit };
