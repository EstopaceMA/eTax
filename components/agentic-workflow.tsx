"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  approveFilingHandoff,
  confirmComputationReview,
  confirmIncomeRecord,
  recordFilingAcknowledgement,
  uploadPaymentProof,
} from "@/app/actions/agentic";
import { buttonClass } from "@/components/ui/button";
import type { AgentTask, AgenticPlan } from "@/lib/agentic/types";
import type { IncomeRecordUpload } from "@/lib/types";

function PendingButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: Parameters<typeof buttonClass>[0];
}) {
  const { pending } = useFormStatus();

  return (
    <button className={`${buttonClass(variant)} w-full sm:w-auto`} disabled={pending} type="submit">
      {pending ? <Loader2 aria-hidden className="animate-spin" size={18} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}

export function JourneyProgress({ tasks }: { tasks: AgentTask[] }) {
  const visible = tasks.filter(({ task_type }) =>
    [
      "collect_records",
      "review_computation",
      "approve_handoff",
      "approve_payment",
    ].includes(task_type),
  );
  const shortLabel: Record<string, string> = {
    collect_records: "Records",
    review_computation: "Review",
    approve_handoff: "Hand-off",
    approve_payment: "Payment",
  };

  return (
    <ol className="grid grid-cols-4 border-y border-grey-300 bg-white" aria-label="Filing journey">
      {visible.map((task) => {
        const complete = task.state === "completed";
        const active = task.state === "ready_for_review" || task.state === "exception";

        return (
          <li
            className={[
              "relative flex min-w-0 flex-col items-center gap-1 px-1 py-3 text-center",
              active ? "text-primary-700" : complete ? "text-success-500" : "text-grey-400",
            ].join(" ")}
            key={task.id}
          >
            {complete ? (
              <CheckCircle2 aria-hidden size={18} strokeWidth={2.4} />
            ) : active ? (
              <Circle aria-hidden className="fill-primary-500 text-primary-500" size={18} />
            ) : (
              <Circle aria-hidden size={18} />
            )}
            <span className="truncate text-[11px] font-bold sm:text-xs">
              {shortLabel[task.task_type]}
            </span>
            {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary-500" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function ConfirmIncomeRecordForm({ record }: { record: IncomeRecordUpload }) {
  return (
    <form action={confirmIncomeRecord} className="grid gap-2">
      <input name="id" type="hidden" value={record.id} />
      <label className="text-xs font-bold uppercase text-grey-500" htmlFor={`confirm-${record.id}`}>
        Confirmed amount
      </label>
      <input
        className="min-h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm font-bold text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        defaultValue={record.total_income ?? ""}
        id={`confirm-${record.id}`}
        min="0"
        name="total_income"
        required
        step="0.01"
        type="number"
      />
      <PendingButton pendingLabel="Confirming..." variant="secondary">
        <Check aria-hidden size={17} />
        Confirm value
      </PendingButton>
    </form>
  );
}

export function ConfirmComputationForm() {
  return (
    <form action={confirmComputationReview}>
      <PendingButton pendingLabel="Saving review...">
        <FileCheck2 aria-hidden size={18} />
        I reviewed this demo computation
      </PendingButton>
    </form>
  );
}

export function ApproveHandoffForm() {
  return (
    <form action={approveFilingHandoff}>
      <PendingButton pendingLabel="Recording approval...">
        <ShieldCheck aria-hidden size={18} />
        Approve exact hand-off
      </PendingButton>
    </form>
  );
}

export function FilingAcknowledgementForm() {
  return (
    <form action={recordFilingAcknowledgement} className="grid gap-3">
      <label className="grid gap-2 text-sm font-bold text-grey-800">
        Acknowledgement reference
        <input
          className="min-h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          minLength={6}
          name="reference"
          placeholder="e.g. BIR-ACK-2026-0001"
          required
        />
      </label>
      <PendingButton pendingLabel="Saving acknowledgement...">
        <CheckCircle2 aria-hidden size={18} />
        Save acknowledgement
      </PendingButton>
    </form>
  );
}

export function PaymentProofForm() {
  return (
    <form action={uploadPaymentProof} className="grid gap-3">
      <label className="grid gap-2 text-sm font-bold text-grey-800">
        Payment reference
        <input
          className="min-h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          name="reference"
          placeholder="Transaction or receipt reference"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-grey-800">
        Receipt or payment proof
        <input
          accept="image/*,application/pdf"
          className="block w-full rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm font-semibold text-grey-800 file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-primary-900"
          name="file"
          required
          type="file"
        />
      </label>
      <p className="flex items-start gap-2 text-xs leading-5 text-grey-600">
        <AlertTriangle aria-hidden className="mt-0.5 shrink-0 text-warning-500" size={15} />
        Uploading proof verifies this controlled pilot record. Gateway navigation alone does not.
      </p>
      <PendingButton pendingLabel="Uploading proof...">
        <Upload aria-hidden size={18} />
        Save payment proof
      </PendingButton>
    </form>
  );
}

export function AgentPlanSummary({ plan }: { plan: AgenticPlan }) {
  return (
    <div className="border-l-4 border-primary-500 bg-primary-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-primary-700">
            Next action · {plan.task.owner_agent}
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-grey-900">{plan.task.title}</h2>
          <p className="mt-1 text-sm leading-6 text-grey-700">{plan.task.reason}</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary-700">
          {Math.round(plan.task.confidence * 100)}% confidence
        </span>
      </div>
      {plan.task.blocker ? (
        <p className="mt-3 text-sm font-semibold text-error-500">{plan.task.blocker}</p>
      ) : null}
    </div>
  );
}
