import Link from "next/link";
import { ArrowRight, Bot, ShieldCheck } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { AgenticPlan } from "@/lib/agentic/types";

export function NextAction({ plan }: { plan: AgenticPlan }) {
  const isComplete = plan.progress === 100;

  return (
    <section className="overflow-hidden rounded-lg border border-primary-200 bg-white shadow-[0_12px_32px_rgba(7,92,247,0.08)]">
      <div className="h-1 bg-primary-500" />
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary-700">
            <Bot aria-hidden size={16} />
            {isComplete ? "Journey complete" : "Next action"}
          </p>
          <span className="text-sm font-extrabold text-grey-900">{plan.progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-grey-200">
          <div
            className="h-full rounded-full bg-primary-500"
            style={{ width: `${Math.max(plan.progress, 4)}%` }}
          />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-bold text-grey-500">{plan.task.owner_agent}</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-grey-900 md:text-3xl">
              {plan.task.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-grey-600">
              {plan.task.reason}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-grey-100 px-2.5 py-1 text-grey-700">
                {plan.task.risk_level} risk
              </span>
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-primary-700">
                {Math.round(plan.task.confidence * 100)}% confidence
              </span>
            </div>
          </div>
          <Link className={`${buttonClass("primary")} w-full md:w-auto`} href={plan.task.action_href}>
            {plan.task.action_label}
            <ArrowRight aria-hidden size={18} />
          </Link>
        </div>
      </div>
      <div className="flex items-start gap-2 border-t border-grey-300 bg-grey-50 px-4 py-3 text-xs leading-5 text-grey-600 md:px-5">
        <ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-primary-500" size={15} />
        Agents may prepare reversible work. Filing, payment, and material changes require your exact approval.
      </div>
    </section>
  );
}
