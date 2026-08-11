import type {
  AgenticAnswerFact,
  AgenticAnswerTopic,
  AgenticBlock,
  AgenticChatHistoryItem,
  AgenticPlan,
  AgenticStage,
  AgenticTimelineItem,
  AgenticSnapshotResponse,
} from "@/lib/agentic/types";
import { computationPresentation } from "@/lib/agentic/computation-presentation";

const stepBlocks: Record<AgenticPlan["task"]["task_type"], AgenticBlock> = {
  collect_records: { type: "record_upload" },
  confirm_extraction: { type: "record_confirmation", recordIds: [] },
  review_computation: { type: "computation_review" },
  approve_handoff: { type: "filing_approval" },
  capture_acknowledgement: { type: "filing_acknowledgement" },
  approve_payment: { type: "payment_approval" },
};

const stages: Array<{
  id: AgenticStage;
  title: string;
  steps: AgenticPlan["task"]["task_type"][];
  activeNarration: string;
  completedNarration: string;
}> = [
  {
    id: "records",
    title: "Income records",
    steps: ["collect_records", "confirm_extraction"],
    activeNarration:
      "Let’s begin with your income records. Upload the evidence for this period, then confirm every extracted amount.",
    completedNarration:
      "Your income records are confirmed. I preserved the evidence used for this filing.",
  },
  {
    id: "review",
    title: "Review computation",
    steps: ["review_computation"],
    activeNarration:
      "Your records are ready. Review the computation, assumptions, and draft before anything is handed off.",
    completedNarration:
      "You reviewed the computation and exact return snapshot.",
  },
  {
    id: "handoff",
    title: "Filing hand-off",
    steps: ["approve_handoff", "capture_acknowledgement"],
    activeNarration:
      "The return is ready for a controlled filing hand-off. Approval applies only to the snapshot shown here.",
    completedNarration:
      "The filing hand-off is acknowledged and its reference is preserved.",
  },
  {
    id: "payment",
    title: "Payment",
    steps: ["approve_payment"],
    activeNarration:
      "Filing is acknowledged. Payment needs its own separate approval before this journey is complete.",
    completedNarration:
      "Payment is complete. This filing journey is finished.",
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    style: "currency",
  }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function readableStatus(value: string | null) {
  return value ? value.replaceAll("_", " ") : "Not started";
}

function stageSummary(stage: AgenticStage, plan: AgenticPlan) {
  const computationCopy = computationPresentation(plan.rule);
  const totalIncome = plan.records.reduce(
    (sum, record) => sum + Number(record.total_income ?? 0),
    0,
  );

  if (stage === "records") {
    return [
      { label: "Confirmed records", value: String(plan.records.length) },
      { label: "Recorded income", value: money(totalIncome) },
    ];
  }

  if (stage === "review") {
    return [
      { label: "Form", value: `BIR Form ${plan.period.formCode}` },
      { label: "Period", value: plan.period.period },
      {
        label: "Income base",
        value: money(plan.computation?.input_snapshot.totalIncome ?? totalIncome),
      },
      {
        label: computationCopy.factAmountLabel,
        value: money(plan.computation?.output_snapshot.amountPayable ?? 0),
      },
      { label: "Rule", value: computationCopy.ruleLabel },
    ];
  }

  if (stage === "handoff") {
    return [
      { label: "Return snapshot", value: "Approved for guided hand-off" },
      {
        label: "Acknowledgement",
        value: plan.draft?.acknowledgement_reference ?? "Captured",
      },
    ];
  }

  return [
    { label: "Payment approval", value: "Approved separately" },
    { label: "Payment status", value: "Paid" },
    ...(plan.payment.reference
      ? [{ label: "Payment reference", value: plan.payment.reference }]
      : []),
  ];
}

function timelineForPlan(plan: AgenticPlan): AgenticTimelineItem[] {
  const activeStage = stages.find(({ steps }) => steps.includes(plan.task.task_type));
  const timeline: AgenticTimelineItem[] = [];

  for (const stage of stages) {
    const stageTasks = plan.tasks.filter(({ task_type }) =>
      stage.steps.includes(task_type),
    );
    const completed =
      stageTasks.length === stage.steps.length &&
      stageTasks.every(({ state }) => state === "completed");

    if (completed) {
      timeline.push({
        id: stage.id,
        stage: stage.id,
        state: "completed",
        title: stage.title,
        narration: stage.completedNarration,
        summary: stageSummary(stage.id, plan),
        block: null,
      });
      continue;
    }

    if (stage.id !== activeStage?.id) {
      break;
    }

    const block = !plan.period.isOpen
      ? {
          type: "locked_period" as const,
          opensOn: plan.period.opensOn,
          reason: plan.period.lockedReason ?? "This filing period is not open.",
        }
      : plan.task.state === "exception"
        ? {
            type: "exception" as const,
            message:
              plan.task.blocker ?? "This filing needs review before it can continue.",
          }
        : plan.task.task_type === "approve_payment" &&
            plan.payment.approvalRecorded &&
            !plan.payment.completed
          ? ({ type: "payment_pending" } as const)
          : stepBlocks[plan.task.task_type];

    timeline.push({
      id: stage.id,
      stage: stage.id,
      state: !plan.period.isOpen
        ? "locked"
        : plan.task.state === "exception"
          ? "exception"
          : "active",
      title: stage.title,
      narration:
        block.type === "payment_pending"
          ? "Your payment hand-off is open. This filing completes automatically when eGovPay confirms the payment."
          : stage.activeNarration,
      summary: stageSummary(stage.id, plan),
      block:
        block.type === "record_confirmation"
          ? {
              ...block,
              recordIds: plan.records
                .filter(({ extraction_status }) => extraction_status !== "confirmed")
                .map(({ id }) => id),
            }
          : block,
    });
    break;
  }

  return timeline;
}

export function buildAgenticSnapshot(plan: AgenticPlan): AgenticSnapshotResponse {
  const timeline = timelineForPlan(plan);
  const blocks = timeline.flatMap(({ block }) => (block ? [block] : []));

  const narration = !plan.period.isOpen
    ? `${plan.period.label} is ready to preview. Actions unlock on ${plan.period.opensOn}.`
    : plan.progress === 100
      ? `${plan.period.period} is complete. Filing acknowledgement and payment confirmation are recorded.`
      : `${plan.task.owner_agent} is ready to help with the next step: ${plan.task.title}.`;

  return {
    narration,
    blocks,
    timeline,
    plan,
    snapshotVersion: plan.snapshotVersion,
  };
}

export function isAgenticTaskRequest(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const asksForInformation = /^(what|when|where|why|who|how|can you explain)\b/.test(
    normalized,
  );
  const asksForAction =
    /\b(file|filing|prepare|continue|resume|start|upload|review|approve|pay|payment|record|finish)\b/.test(
      normalized,
    );

  return asksForAction || (!asksForInformation && /\b(q[1-4]|quarter|annual|tax return)\b/.test(normalized));
}

const answerTopics: AgenticAnswerTopic[] = [
  "summary",
  "records",
  "computation",
  "deadline",
  "filing",
  "payment",
  "blocker",
  "next_step",
];

const topicPatterns: Array<{
  topic: AgenticAnswerTopic;
  pattern: RegExp;
}> = [
  {
    topic: "blocker",
    pattern: /\b(blocked|blocker|exception|stuck|cannot|can't)\b/i,
  },
  {
    topic: "next_step",
    pattern: /\b(next|what now|do next|continue from here)\b/i,
  },
  {
    topic: "payment",
    pattern: /\b(payment|paid|pay|proof|receipt|provider reference)\b/i,
  },
  {
    topic: "computation",
    pattern: /\b(computation|calculation|total|amount|owe|liability|6%|six percent|rule)\b/i,
  },
  {
    topic: "filing",
    pattern: /\b(filing|filed|hand-?off|acknowledg(?:e)?ment|submitted|submission)\b/i,
  },
  {
    topic: "records",
    pattern: /\b(record|records|file|files|document|documents|income|uploaded)\b/i,
  },
  {
    topic: "deadline",
    pattern: /\b(deadline|due|form|open|opens|period)\b/i,
  },
  {
    topic: "summary",
    pattern: /\b(summary|status|progress|where am i|overview)\b/i,
  },
];

export function isAgenticAnswerTopic(value: unknown): value is AgenticAnswerTopic {
  return typeof value === "string" && answerTopics.includes(value as AgenticAnswerTopic);
}

function topicFromText(value: string) {
  return topicPatterns.find(({ pattern }) => pattern.test(value))?.topic ?? null;
}

export function isAgenticCourtesy(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[!.,]+$/g, "")
    .trim();

  return /^(thanks?|thank you(?: so much| very much)?|salamat(?: po)?|ok(?:ay)?|got it|all good)$/.test(
    normalized,
  );
}

export function classifyAgenticChatRequest(
  question: string,
  history: AgenticChatHistoryItem[] = [],
):
  | { kind: "workflow" }
  | { kind: "data"; topic: AgenticAnswerTopic }
  | { kind: "courtesy" }
  | { kind: "switch_to_ask" } {
  const normalized = question.trim().toLowerCase();

  if (isAgenticCourtesy(normalized)) {
    return { kind: "courtesy" };
  }

  const topic = topicFromText(normalized);
  const personal =
    /\b(my|mine|this filing|this return|current|selected|did i|do i|have i|am i|i uploaded|i owe|for me)\b/i.test(
      normalized,
    );
  const informationRequest =
    /^(what|when|where|why|which|how much|how many|is|are|did|do|have|has|show|tell|give|summarize|can you (?:show|tell))\b/i.test(
      normalized,
    ) || normalized.endsWith("?");
  const inherentlyContextual =
    topic === "next_step" ||
    topic === "blocker" ||
    topic === "summary" ||
    /^(status|summary|progress|what now|what's next|whats next)$/i.test(normalized);
  const selectedStateQuestion =
    informationRequest &&
    /\b(status|complete|completed|ready|recorded|verified|stored|confirmed|uploaded|how much)\b/i.test(
      normalized,
    );
  const directDataRequest =
    /^(show|tell|give|summarize)\b/i.test(normalized) &&
    /\b(computation|calculation|total|amount|status|summary|records?|income|deadline|due|proof|acknowledg(?:e)?ment|next step|blocker)\b/i.test(
      normalized,
    );
  const correctionRequest = /\b(i mean|actually|rather|to clarify)\b/i.test(normalized);

  if (
    topic &&
    (inherentlyContextual ||
      selectedStateQuestion ||
      directDataRequest ||
      correctionRequest ||
      (informationRequest && personal))
  ) {
    return { kind: "data", topic };
  }

  if (isAgenticTaskRequest(question)) {
    return { kind: "workflow" };
  }

  const followUp =
    normalized.split(/\s+/).length <= 6 &&
    (/^(and|what about|how about|why|when|how much|how many|is it|did it|that|it)\b/i.test(
      normalized,
    ) ||
      /^(what|what do you mean|can you clarify|explain that|sorry)\??$/i.test(
        normalized,
      ));

  if (followUp) {
    const previousTopic =
      [...history]
        .reverse()
        .map(({ content, role, topic: historyTopic }) =>
          isAgenticAnswerTopic(historyTopic)
            ? historyTopic
            : role === "user"
              ? topicFromText(content)
              : null,
        )
        .find((historyTopic) => historyTopic !== null);

    if (previousTopic) {
      return { kind: "data", topic: previousTopic };
    }
  }

  return { kind: "switch_to_ask" };
}

export function buildAgenticDataAnswer(
  plan: AgenticPlan,
  topic: AgenticAnswerTopic,
): {
  answer: string;
  facts: AgenticAnswerFact[];
  sourcePeriod: string;
  topic: AgenticAnswerTopic;
} {
  const confirmedRecords = plan.records.filter(
    ({ extraction_status, total_income }) =>
      extraction_status === "confirmed" && total_income !== null,
  );
  const confirmedIncome = confirmedRecords.reduce(
    (sum, record) => sum + Number(record.total_income),
    0,
  );
  const unconfirmedCount = plan.records.length - confirmedRecords.length;
  let answer: string;
  let facts: AgenticAnswerFact[];

  if (topic === "records") {
    answer =
      plan.records.length === 0
        ? "No income records are stored for this period yet. Add a record in the Records stage to begin."
        : unconfirmedCount > 0
          ? "Some records still need confirmation, so only confirmed income is included below."
          : "All stored income records for this period are confirmed.";
    facts = [
      { label: "Stored records", value: String(plan.records.length) },
      { label: "Confirmed records", value: String(confirmedRecords.length) },
      { label: "Needs confirmation", value: String(unconfirmedCount) },
      { label: "Confirmed income", value: money(confirmedIncome) },
      ...plan.records.slice(0, 5).map(({ original_filename, extraction_status }) => ({
        label: original_filename,
        value: readableStatus(extraction_status),
      })),
      ...(plan.records.length > 5
        ? [
            {
              label: "Additional records",
              value: String(plan.records.length - 5),
            },
          ]
        : []),
    ];
  } else if (topic === "computation") {
    const computationCopy = computationPresentation(plan.rule);
    answer = plan.computation
      ? computationCopy.explanation
      : "A computation is not available yet. Confirm every income record before the Review stage can prepare one.";
    facts = plan.computation
      ? [
          {
            label: "Income base",
            value: money(plan.computation.input_snapshot.totalIncome),
          },
          {
            label: computationCopy.factAmountLabel,
            value: money(plan.computation.output_snapshot.amountPayable),
          },
          { label: "Rule", value: computationCopy.ruleLabel },
          { label: "Rule version", value: plan.rule.version },
        ]
      : [
          { label: "Confirmed records", value: String(confirmedRecords.length) },
          { label: "Needs confirmation", value: String(unconfirmedCount) },
        ];
  } else if (topic === "deadline") {
    answer = "These are the configured filing details for the selected period.";
    facts = [
      { label: "Form", value: `BIR Form ${plan.period.formCode}` },
      { label: "Period", value: plan.period.period },
      { label: "Opens", value: date(plan.period.opensOn) },
      { label: "Due date", value: date(plan.period.dueDate) },
      { label: "Availability", value: plan.period.isOpen ? "Open" : "Preview only" },
    ];
  } else if (topic === "filing") {
    answer = plan.draft?.acknowledgement_reference
      ? "The filing hand-off has an acknowledgement recorded for this period."
      : "No filing acknowledgement is recorded yet. External navigation alone does not mark this return as filed.";
    facts = [
      { label: "Filing status", value: readableStatus(plan.obligation.status) },
      { label: "Draft status", value: readableStatus(plan.draft?.state ?? null) },
      {
        label: "Acknowledgement",
        value: plan.draft?.acknowledgement_reference ?? "Not recorded",
      },
    ];
  } else if (topic === "payment") {
    answer = plan.payment.completed
      ? "Payment is complete for this period. No receipt upload is required."
      : plan.payment.approvalRecorded
        ? "The separate payment hand-off is open for the amount shown below. Payment completes automatically after the payment channel confirms it."
        : "No payment approval is recorded. Filing approval does not authorize payment.";
    facts = [
      { label: "Payment status", value: readableStatus(plan.obligation.payment_status) },
      ...(plan.payment.amount !== null
        ? [{ label: "Payment amount", value: money(plan.payment.amount) }]
        : []),
      {
        label: "Separate approval",
        value: plan.payment.approvalRecorded ? "Recorded" : "Not recorded",
      },
      {
        label: "Payment hand-off",
        value: readableStatus(plan.payment.intentState),
      },
      {
        label: "Payment confirmation",
        value: plan.payment.completed ? "Confirmed" : "Waiting",
      },
      { label: "Payment reference", value: plan.payment.reference ?? "Not recorded" },
    ];
  } else if (topic === "blocker") {
    answer = plan.task.blocker
      ? "The current workflow cannot advance until this blocker is resolved."
      : "No workflow blocker is recorded for the selected period.";
    facts = [
      { label: "Current task", value: plan.task.title },
      { label: "Blocker", value: plan.task.blocker ?? "None" },
      { label: "Task state", value: readableStatus(plan.task.state) },
    ];
  } else if (topic === "next_step") {
    answer =
      plan.progress === 100
        ? "This filing journey is complete. Its acknowledgement and payment confirmation remain in the filing record."
        : "The next permitted step comes from the authoritative filing workflow shown above.";
    facts = [
      { label: "Current task", value: plan.task.title },
      { label: "Next action", value: plan.task.action_label },
      { label: "Progress", value: `${plan.progress}%` },
    ];
  } else {
    answer = "Here is the latest authoritative summary for the selected filing period.";
    facts = [
      { label: "Period", value: plan.period.period },
      { label: "Form", value: `BIR Form ${plan.period.formCode}` },
      { label: "Filing status", value: readableStatus(plan.obligation.status) },
      { label: "Payment status", value: readableStatus(plan.obligation.payment_status) },
      { label: "Current task", value: plan.task.title },
      { label: "Progress", value: `${plan.progress}%` },
    ];
  }

  return {
    answer,
    facts,
    sourcePeriod: plan.period.period,
    topic,
  };
}

export function quarterFromAgenticRequest(value: string) {
  const normalized = value.toLowerCase();

  if (/\b(annual|q4|fourth quarter|4th quarter)\b/.test(normalized)) {
    return 4;
  }

  if (/\b(q3|third quarter|3rd quarter)\b/.test(normalized)) {
    return 3;
  }

  if (/\b(q2|second quarter|2nd quarter)\b/.test(normalized)) {
    return 2;
  }

  if (/\b(q1|first quarter|1st quarter)\b/.test(normalized)) {
    return 1;
  }

  return null;
}
