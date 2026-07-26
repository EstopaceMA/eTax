import type { AgentTaskState, AgenticStep } from "@/lib/agentic/domain";

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
  input_snapshot: {
    period: string;
    totalIncome: number;
    recordIds: string[];
  };
  output_snapshot: {
    amountPayable: number;
    currency: "PHP";
  };
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
    status: "demo";
  };
  progress: number;
};
