"use client";

import { Check, CheckCircle2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  approveFilingHandoff,
  confirmComputationReview,
  confirmIncomeRecord,
  recordFilingAcknowledgement,
} from "@/app/actions/agentic";
import { buttonClass } from "@/components/ui/button";
import type { AgenticPlan } from "@/lib/agentic/types";
import type { IncomeRecordUpload } from "@/lib/types";

async function confirmIncomeRecordFormAction(formData: FormData) {
  await confirmIncomeRecord(formData);
}

async function confirmComputationFormAction(formData: FormData) {
  await confirmComputationReview(formData);
}

async function approveHandoffFormAction(formData: FormData) {
  await approveFilingHandoff(formData);
}

async function acknowledgementFormAction(formData: FormData) {
  await recordFilingAcknowledgement(formData);
}

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

export function ConfirmIncomeRecordForm({
  quarter,
  record,
  returnTo,
}: {
  quarter: number;
  record: IncomeRecordUpload;
  /** Where to land after confirming. Defaults to the filing workspace. */
  returnTo?: "records";
}) {
  return (
    <form action={confirmIncomeRecordFormAction} className="grid gap-2">
      <input name="id" type="hidden" value={record.id} />
      <input name="quarter" type="hidden" value={quarter} />
      {returnTo ? <input name="return_to" type="hidden" value={returnTo} /> : null}
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

export function ConfirmComputationForm({
  isDemo,
  quarter,
}: {
  isDemo: boolean;
  quarter: number;
}) {
  return (
    <form action={confirmComputationFormAction}>
      <input name="quarter" type="hidden" value={quarter} />
      <PendingButton pendingLabel="Saving review...">
        <FileCheck2 aria-hidden size={18} />
        {isDemo ? "I reviewed this demo computation" : "I reviewed this tax computation"}
      </PendingButton>
    </form>
  );
}

export function ApproveHandoffForm({ quarter }: { quarter: number }) {
  return (
    <form action={approveHandoffFormAction}>
      <input name="quarter" type="hidden" value={quarter} />
      <PendingButton pendingLabel="Recording approval...">
        <ShieldCheck aria-hidden size={18} />
        Approve exact hand-off
      </PendingButton>
    </form>
  );
}

export function FilingAcknowledgementForm({ quarter }: { quarter: number }) {
  return (
    <form action={acknowledgementFormAction} className="grid gap-3">
      <input name="quarter" type="hidden" value={quarter} />
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

export function AgentPlanSummary({ plan }: { plan: AgenticPlan }) {
  return (
    <div className="rounded-lg border-l-4 border-primary-500 bg-primary-50 px-4 py-4">
      {/* No owner agent or confidence score: a percentage on a tax obligation
          hands our uncertainty to someone who cannot act on it. */}
      <p className="text-xs font-bold uppercase text-primary-700">Next action</p>
      <h2 className="mt-1 text-lg font-extrabold text-grey-900">{plan.task.title}</h2>
      <p className="mt-1 text-sm leading-6 text-grey-700">{plan.task.reason}</p>
      {plan.task.blocker ? (
        <p className="mt-3 text-sm font-semibold text-error-500">{plan.task.blocker}</p>
      ) : null}
    </div>
  );
}
