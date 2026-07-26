import { createHash } from "node:crypto";

export const DEMO_RULE_ID = "demo-fixed-liability-q2-2026";
export const DEMO_RULE_VERSION = "demo-2026.07.1";
export const DEMO_TAX_AMOUNT = 7_440;

export const agenticSteps = [
  "collect_records",
  "confirm_extraction",
  "review_computation",
  "approve_handoff",
  "capture_acknowledgement",
  "approve_payment",
  "capture_payment_proof",
] as const;

export type AgenticStep = (typeof agenticSteps)[number];
export type AgentTaskState =
  | "proposed"
  | "gathering"
  | "blocked"
  | "ready_for_review"
  | "approved"
  | "executing"
  | "completed"
  | "exception";

export type WorkflowFacts = {
  uploadCount: number;
  unconfirmedCount: number;
  hasComputation: boolean;
  hasDraft: boolean;
  draftReviewed: boolean;
  handoffApproved: boolean;
  acknowledgementCaptured: boolean;
  paymentApproved: boolean;
  paymentVerified: boolean;
  hasException?: boolean;
};

export type DemoComputationInput = {
  period: string;
  totalIncome: number;
  recordIds: string[];
};

export type DemoComputation = {
  amountPayable: number;
  currency: "PHP";
  ruleId: typeof DEMO_RULE_ID;
  ruleVersion: typeof DEMO_RULE_VERSION;
  assumptions: string[];
  warnings: string[];
  trace: Array<{ label: string; value: string | number }>;
};

export function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function computeDemoLiability(input: DemoComputationInput): DemoComputation {
  return {
    amountPayable: DEMO_TAX_AMOUNT,
    currency: "PHP",
    ruleId: DEMO_RULE_ID,
    ruleVersion: DEMO_RULE_VERSION,
    assumptions: [
      "This controlled pilot uses a fixed Q2 2026 demo liability.",
      "The result is not a production tax calculation or an official BIR assessment.",
    ],
    warnings: [
      "A Philippine tax professional must approve production rules before release.",
    ],
    trace: [
      { label: "Covered period", value: input.period },
      { label: "Confirmed income records", value: input.recordIds.length },
      { label: "Recorded income", value: input.totalIncome },
      { label: "Demo fixed liability", value: DEMO_TAX_AMOUNT },
      { label: "Rounding", value: "PHP, 2 decimal places" },
    ],
  };
}

export function nextAgenticStep(facts: WorkflowFacts): AgenticStep {
  if (facts.hasException) {
    return "collect_records";
  }

  if (facts.uploadCount === 0) {
    return "collect_records";
  }

  if (facts.unconfirmedCount > 0) {
    return "confirm_extraction";
  }

  if (!facts.hasComputation || !facts.hasDraft || !facts.draftReviewed) {
    return "review_computation";
  }

  if (!facts.handoffApproved) {
    return "approve_handoff";
  }

  if (!facts.acknowledgementCaptured) {
    return "capture_acknowledgement";
  }

  if (!facts.paymentApproved) {
    return "approve_payment";
  }

  return "capture_payment_proof";
}

export function approvalPayloadHash(input: {
  userId: string;
  actionType: string;
  targetId: string;
  payload: unknown;
}) {
  return stableHash({
    actionType: input.actionType,
    payload: input.payload,
    targetId: input.targetId,
    userId: input.userId,
  });
}

export function isApprovalExpired(expiresAt: string, now = new Date()) {
  return new Date(expiresAt).getTime() <= now.getTime();
}
