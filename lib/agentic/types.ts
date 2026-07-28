import type { AgentTaskState, AgenticStep } from "@/lib/agentic/domain";
import type { FilingQuarter } from "@/lib/filing-periods";
import type { FilingObligation, IncomeRecordUpload } from "@/lib/types";
import type { QuarterlyComputation } from "@/lib/tax/1701q-compute";

export type AgentTask = {
  id: string;
  user_id: string;
  filing_obligation_id: string;
  task_type: AgenticStep;
  owner_agent: string;
  state: AgentTaskState;
  risk_level: "low" | "medium" | "high" | "material";
  confidence: number;
  title: string;
  reason: string;
  blocker: string | null;
  action_label: string;
  action_href: string;
  evidence: unknown[];
  expected_output: unknown[];
  rule_set_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ComputationRun = {
  id: string;
  filing_obligation_id: string;
  rule_set_id: string;
  input_hash: string;
  /**
   * Always carries period/totalIncome/recordIds; the real 1701Q rule adds the
   * gathered quarterly inputs (quarter, grossPriorQuarters, taxPaidPriorQuarters,
   * taxpayerCategory, eightPercentElected) alongside them.
   */
  input_snapshot: {
    period: string;
    totalIncome: number;
    recordIds: string[];
  } & Record<string, unknown>;
  /**
   * Always carries amountPayable/currency; the real 1701Q rule adds every
   * Schedule II/III line (47-63) alongside them.
   */
  output_snapshot: {
    amountPayable: number;
    currency: "PHP";
  } & Partial<QuarterlyComputation>;
  trace: Array<{ label: string; value: string | number }>;
  assumptions: string[];
  warnings: string[];
  created_at: string;
};

export type ReturnDraft = {
  id: string;
  filing_obligation_id: string;
  computation_run_id: string;
  version: number;
  state:
    | "review"
    | "approved"
    | "handed_off"
    | "pending_verification"
    | "filed"
    | "exception";
  review_snapshot: Record<string, unknown>;
  validations: Array<{ code: string; status: "pass" | "warning" | "blocked"; message: string }>;
  acknowledgement_reference: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgenticPlan = {
  task: AgentTask;
  tasks: AgentTask[];
  computation: ComputationRun | null;
  draft: ReturnDraft | null;
  rule: {
    id: string;
    version: string;
    title: string;
    sourceTitle: string;
    status: "demo" | "active";
  };
  progress: number;
  period: {
    quarter: FilingQuarter;
    label: string;
    shortLabel: string;
    period: string;
    opensOn: string;
    dueDate: string;
    formCode: "1701Q" | "1701A";
    formTitle: string;
    isOpen: boolean;
    lockedReason: string | null;
  };
  obligation: FilingObligation;
  records: IncomeRecordUpload[];
  payment: {
    intentState: string | null;
    approvalRecorded: boolean;
    proofStored: boolean;
    amount: number | null;
    currency: "PHP" | null;
    reference: string | null;
    proofFilename: string | null;
  };
  snapshotVersion: string;
};

export type AgenticBlock =
  | {
      type: "period_selection";
      periods: Array<{
        quarter: FilingQuarter;
        label: string;
        period: string;
        formCode: "1701Q" | "1701A";
        isOpen: boolean;
      }>;
    }
  | { type: "locked_period"; opensOn: string; reason: string }
  | { type: "record_upload" }
  | { type: "record_confirmation"; recordIds: string[] }
  | { type: "computation_review" }
  | { type: "filing_approval" }
  | { type: "filing_acknowledgement" }
  | { type: "payment_approval" }
  | { type: "payment_proof" }
  | { type: "exception"; message: string };

export type AgenticStage = "records" | "review" | "handoff" | "payment";
export type AgenticStageState = "completed" | "active" | "locked" | "exception";

export type AgenticTimelineItem = {
  id: AgenticStage;
  stage: AgenticStage;
  state: AgenticStageState;
  title: string;
  narration: string;
  summary: Array<{ label: string; value: string }>;
  block: AgenticBlock | null;
};

export type AgenticSnapshotResponse = {
  narration: string;
  blocks: AgenticBlock[];
  timeline: AgenticTimelineItem[];
  plan: AgenticPlan;
  snapshotVersion: string;
};

export type AgenticAnswerTopic =
  | "summary"
  | "records"
  | "computation"
  | "deadline"
  | "filing"
  | "payment"
  | "blocker"
  | "next_step";

export type AgenticAnswerFact = {
  label: string;
  value: string;
};

export type AgenticChatHistoryItem = {
  role: "agent" | "user";
  content: string;
  topic?: AgenticAnswerTopic;
};

export type AgenticSessionSummary = {
  id: string;
  title: string;
  activeQuarter: FilingQuarter | null;
  activeContextId: string | null;
  activePeriod: string | null;
  filingStatus: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
};

type AgenticSessionEventBase = {
  id: string;
  sequenceNumber: number;
  content: string;
  contextId: string | null;
  quarter: FilingQuarter | null;
  createdAt: string;
};

export type AgenticSessionEvent =
  | (AgenticSessionEventBase & {
      role: "user";
      kind: "user_text";
    })
  | (AgenticSessionEventBase & {
      role: "assistant";
      kind: "assistant_text";
    })
  | (AgenticSessionEventBase & {
      role: "assistant";
      kind: "assistant_data";
      facts: AgenticAnswerFact[];
      topic: AgenticAnswerTopic;
    })
  | (AgenticSessionEventBase & {
      role: "assistant";
      kind: "switch_to_ask";
    })
  | (AgenticSessionEventBase & {
      role: "assistant";
      kind: "period_selection";
    })
  | (AgenticSessionEventBase & {
      role: "assistant";
      kind: "period_context";
    })
  | (AgenticSessionEventBase & {
      role: "assistant";
      kind: "workflow_stage";
      stage: AgenticStage;
      snapshotVersion: string;
    });

export type AgenticSessionSnapshot = {
  quarter: FilingQuarter;
  snapshot: AgenticSnapshotResponse;
};

export type AgenticSessionDetail = {
  session: AgenticSessionSummary;
  events: AgenticSessionEvent[];
  snapshots: AgenticSessionSnapshot[];
  olderCursor: number | null;
};

export type AgenticChatResponse =
  | (AgenticSnapshotResponse & {
      kind: "workflow";
      sessionDetail: AgenticSessionDetail;
    })
  | (AgenticSnapshotResponse & {
      kind: "data";
      answer: string;
      facts: AgenticAnswerFact[];
      sourcePeriod: string;
      topic: AgenticAnswerTopic;
      sessionDetail: AgenticSessionDetail;
    })
  | {
      kind: "switch_to_ask";
      answer: string;
      switchToAsk: true;
      sessionDetail: AgenticSessionDetail;
    }
  | {
      kind: "period_selection";
      answer: string;
      block: Extract<AgenticBlock, { type: "period_selection" }>;
      sessionDetail: AgenticSessionDetail;
    };
