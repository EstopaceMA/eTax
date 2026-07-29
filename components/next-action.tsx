import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChatbotIcon } from "@/components/chatbot-icon";
import { buttonClass } from "@/components/ui/button";
import { agenticSteps } from "@/lib/agentic/domain";
import type { AgenticPlan } from "@/lib/agentic/types";

export function NextAction({ plan }: { plan: AgenticPlan }) {
  const isComplete = plan.progress === 100;
  const stepIndex = agenticSteps.indexOf(plan.task.task_type);
  const stepLabel = isComplete
    ? "All steps done"
    : `Step ${stepIndex + 1} of ${agenticSteps.length}`;

  return (
    <section className="overflow-hidden rounded-xl border border-grey-300 bg-white shadow-[0_10px_28px_rgba(20,26,33,0.05)]">
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary-700">
            <ChatbotIcon size={20} />
            {isComplete ? "Journey complete" : "Next action"}
          </p>
          <span className="text-xs font-bold text-grey-600">{stepLabel}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-grey-200">
          <div
            className="h-full rounded-full bg-primary-500"
            style={{ width: `${Math.max(plan.progress, 4)}%` }}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h2 className="text-xl font-black leading-tight text-grey-900 md:text-2xl">
              {plan.task.title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-grey-600">
              {plan.task.reason}
            </p>
          </div>
          <Link
            className={`${buttonClass("primary")} w-full md:w-auto`}
            href={plan.task.action_href}
          >
            {plan.task.action_label}
            <ArrowRight aria-hidden size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
