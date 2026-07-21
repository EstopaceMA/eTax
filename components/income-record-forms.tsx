"use client";

import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteIncomeRecord,
  updateIncomeRecordTotal,
  uploadIncomeRecord,
} from "@/app/actions/workspace";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function normalizeFilename(value: string) {
  return value.trim().toLowerCase();
}

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

export function IncomeRecordUploadForm({
  quarter,
  existingFilenames,
}: {
  quarter: number;
  existingFilenames: string[];
}) {
  const existing = new Set(existingFilenames.map(normalizeFilename));
  const [selectedFilename, setSelectedFilename] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <form
      action={uploadIncomeRecord}
      className="rounded-lg border border-dashed border-primary-300 bg-primary-50 p-4"
      onSubmit={(event) => {
        const fileInput = event.currentTarget.elements.namedItem("file");

        if (!(fileInput instanceof HTMLInputElement)) {
          return;
        }

        const file = fileInput.files?.[0];

        if (!file || !existing.has(normalizeFilename(file.name))) {
          return;
        }

        const shouldUpload = window.confirm(
          `You already uploaded "${file.name}" for this period. Upload another copy?`,
        );

        if (!shouldUpload) {
          event.preventDefault();
          setIsProcessing(false);
          return;
        }

        setIsProcessing(true);
      }}
    >
      {isProcessing ? (
        <div
          aria-live="polite"
          className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm">
            <Loader2 className="animate-spin" size={24} aria-hidden />
          </div>
          <div>
            <p className="break-all text-sm font-extrabold text-primary-950">
              Reading {selectedFilename || "income record"}
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-800">
              Uploading file and extracting total income...
            </p>
            <p className="mt-1 text-xs font-bold text-primary-700">
              This may take a few seconds.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input name="quarter" type="hidden" value={quarter} />
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-primary-900">
              Upload income record file
            </span>
            <input
              accept="image/*,application/pdf"
              className="block w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-grey-800 file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-primary-900"
              name="file"
              onChange={(event) => {
                setSelectedFilename(event.currentTarget.files?.[0]?.name ?? "");
              }}
              required
              type="file"
            />
          </label>
          <div className="self-end">
            <SubmitButton className="w-full md:w-auto" pendingLabel="Uploading...">
              <Upload size={18} aria-hidden />
              <span>Upload</span>
            </SubmitButton>
          </div>
        </div>
      )}
    </form>
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
        className="self-center text-xs font-bold uppercase text-grey-500"
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
        className="min-h-10 w-full px-3 sm:col-start-2"
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
      className="w-full"
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
