"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  deleteIncomeRecord,
  updateIncomeRecordTotal,
} from "@/app/actions/workspace";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SubmitButton({
  ariaLabel,
  className,
  children,
  pendingLabel,
  variant = "primary",
}: {
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
  pendingLabel: string;
  variant?: Parameters<typeof buttonClass>[0];
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={pending ? pendingLabel : ariaLabel}
      className={cn(buttonClass(variant), className)}
      disabled={pending}
      type="submit"
    >
      {pending ? <Loader2 className="animate-spin" size={18} aria-hidden /> : children}
      <span>{pending ? pendingLabel : null}</span>
    </button>
  );
}

export function IncomeRecordTotalForm({
  id,
  quarter,
  storagePath,
  totalIncome,
}: {
  id: string;
  quarter: number;
  storagePath: string;
  totalIncome: number | null;
}) {
  const inputId = `income-total-${id}`;

  return (
    <form action={updateIncomeRecordTotal} className="grid gap-2 sm:contents">
      <input name="id" type="hidden" value={id} />
      <input name="quarter" type="hidden" value={quarter} />
      <input name="storage_path" type="hidden" value={storagePath} />
      <label
        className="self-center text-xs font-bold uppercase text-grey-500 sm:col-span-2"
        htmlFor={inputId}
      >
        Total income
      </label>
      <input
        className="min-h-10 w-full rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:col-span-2"
        defaultValue={totalIncome ?? ""}
        id={inputId}
        min="0"
        name="total_income"
        placeholder="0.00"
        step="0.01"
        type="number"
      />
      <SubmitButton
        ariaLabel="Save total income"
        className="min-h-10 w-full px-3 sm:col-start-2 sm:row-start-3"
        pendingLabel="Saving..."
        variant="secondary"
      >
        <Save size={16} aria-hidden />
        <span>Save</span>
      </SubmitButton>
    </form>
  );
}

export function DeleteIncomeRecordForm({
  id,
  quarter,
  storagePath,
  filename,
}: {
  id: string;
  quarter: number;
  storagePath: string;
  filename: string;
}) {
  return (
    <form
      action={deleteIncomeRecord}
      className="w-full sm:col-start-1 sm:row-start-3"
      onSubmit={(event) => {
        const shouldDelete = window.confirm(`Delete "${filename}" from this filing period?`);

        if (!shouldDelete) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={id} />
      <input name="quarter" type="hidden" value={quarter} />
      <input name="storage_path" type="hidden" value={storagePath} />
      <SubmitButton
        ariaLabel={`Delete ${filename}`}
        className="min-h-10 w-full px-3"
        pendingLabel="Deleting..."
        variant="secondary"
      >
        <Trash2 size={16} aria-hidden />
        <span>Delete</span>
      </SubmitButton>
    </form>
  );
}
