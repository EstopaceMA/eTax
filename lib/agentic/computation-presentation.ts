import type { AgenticPlan } from "@/lib/agentic/types";

type ComputationRule = AgenticPlan["rule"];

export function computationPresentation(rule: ComputationRule) {
  if (rule.status === "demo") {
    return {
      amountLabel: "Demo amount",
      factAmountLabel: "Illustrative amount",
      ruleLabel: "Illustrative 6% gross-income demo rule",
      explanation:
        "The current amount is a controlled pilot computation. It is illustrative and is not an official BIR assessment.",
      disclosure:
        "Illustrative 6% demo rule only. No deductions, credits, prior payments, or official assessment.",
    };
  }

  return {
    amountLabel: "Tax payable",
    factAmountLabel: "Tax payable",
    ruleLabel: rule.title,
    explanation: `The current amount is the stored tax computation for this filing under ${rule.title}. Review its assumptions and warnings before approval.`,
    disclosure: `Computed under ${rule.title}. Source: ${rule.sourceTitle}. Review the full trace, assumptions, and warnings before approval.`,
  };
}
