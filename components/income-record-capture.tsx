"use client";

import {
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { confirmIncomeRecord } from "@/app/actions/agentic";
import { uploadIncomeRecord } from "@/app/actions/workspace";
import { buttonClass } from "@/components/ui/button";

type Source = "camera" | "file";
type Result = Awaited<ReturnType<typeof uploadIncomeRecord>> | null;
type ConfirmationResult =
  | { ok: true }
  | { ok: false; error: string }
  | null;
type FilePreview = {
  name: string;
  size: number;
  type: string;
  url: string;
};

async function uploadAction(_previous: Result, formData: FormData) {
  return uploadIncomeRecord(formData);
}

async function confirmAction(
  _previous: ConfirmationResult,
  formData: FormData,
): Promise<ConfirmationResult> {
  const result = await confirmIncomeRecord(formData);

  return result ?? {
    ok: false,
    error: "The amount could not be saved. Try again.",
  };
}

function fileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function ConfirmationStep({
  onAddAnother,
  onDone,
  preview,
  quarter,
  result,
}: {
  onAddAnother: () => void;
  onDone: () => void;
  preview: FilePreview | null;
  quarter: number;
  result: Extract<Result, { ok: true }>;
}) {
  const [confirmation, confirmationAction, isConfirming] = useActionState<
    ConfirmationResult,
    FormData
  >(confirmAction, null);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (confirmation?.ok) {
    return (
      <div
        aria-live="polite"
        className="rounded-xl border border-success-500/30 bg-success-500/10 p-4"
      >
        <div className="flex items-start gap-2.5">
          <CheckCircle2
            aria-hidden
            className="mt-0.5 shrink-0 text-success-500"
            size={19}
          />
          <div className="min-w-0">
            <p className="break-all text-sm font-extrabold text-grey-900">
              {result.filename} saved
            </p>
            <p className="mt-0.5 text-sm text-grey-700">
              The confirmed amount now counts towards this quarter.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            className={buttonClass("secondary")}
            onClick={onAddAnother}
            type="button"
          >
            <Camera aria-hidden size={17} />
            Add another
          </button>
          <button className={buttonClass("primary")} onClick={onDone} type="button">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={confirmationAction} className="grid gap-3">
      <input name="id" type="hidden" value={result.id} />
      <input name="quarter" type="hidden" value={quarter} />
      <input name="source" type="hidden" value="capture-modal" />

      <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
        <div className="flex items-start gap-2.5">
          <CheckCircle2
            aria-hidden
            className="mt-0.5 shrink-0 text-primary-600"
            size={19}
          />
          <div className="min-w-0">
            <p className="break-all text-sm font-extrabold text-grey-900">
              {result.filename} is ready
            </p>
            <p className="mt-0.5 text-sm text-grey-700">
              Check the amount below, then confirm once to save it.
            </p>
          </div>
        </div>

        <label
          className="mt-3 grid gap-1.5 text-xs font-bold uppercase tracking-wide text-grey-600"
          htmlFor={`captured-total-${result.id}`}
        >
          Total income
          <input
            autoFocus
            className="min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 text-base font-bold text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            defaultValue={result.extractedTotalIncome ?? ""}
            id={`captured-total-${result.id}`}
            min="0"
            name="total_income"
            placeholder="0.00"
            required
            step="0.01"
            type="number"
          />
        </label>
      </div>

      {preview ? (
        <div className="overflow-hidden rounded-lg border border-grey-300 bg-white">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-grey-100 text-grey-600">
              <FileText aria-hidden size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-grey-800">
                {preview.name}
              </p>
              <p className="mt-0.5 text-xs text-grey-500">
                {preview.type === "application/pdf" ? "PDF" : "Image"} ·{" "}
                {fileSize(preview.size)}
              </p>
            </div>
            <button
              aria-expanded={previewOpen}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              onClick={() => setPreviewOpen((current) => !current)}
              type="button"
            >
              {previewOpen ? (
                <EyeOff aria-hidden size={16} />
              ) : (
                <Eye aria-hidden size={16} />
              )}
              {previewOpen ? "Hide" : "Preview"}
            </button>
          </div>
          {previewOpen ? (
            <div className="border-t border-grey-200 bg-grey-100 p-2">
              <object
                aria-label={`Preview of ${preview.name}`}
                className="h-64 w-full rounded-md bg-white"
                data={preview.url}
                type={preview.type}
              >
                <a
                  className="text-sm font-semibold text-primary-700 underline"
                  href={preview.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open file preview
                </a>
              </object>
            </div>
          ) : null}
        </div>
      ) : null}

      {confirmation && !confirmation.ok ? (
        <p
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 p-3 text-sm font-semibold text-grey-800"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 shrink-0 text-warning-500"
            size={17}
          />
          {confirmation.error}
        </p>
      ) : null}

      <button className={buttonClass("primary")} disabled={isConfirming} type="submit">
        {isConfirming ? (
          <Loader2 aria-hidden className="animate-spin" size={18} />
        ) : (
          <Check aria-hidden size={18} />
        )}
        {isConfirming ? "Saving..." : "Confirm and save"}
      </button>
    </form>
  );
}

export function IncomeRecordCapture({
  onDone,
  quarter,
}: {
  onDone: () => void;
  quarter: number;
}) {
  const [result, formAction, isPending] = useActionState<Result, FormData>(
    uploadAction,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState<FilePreview | null>(null);

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  function pick(source: Source) {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    // capture="environment" is set only on this path. Forcing it on the shared
    // input would drop application/pdf, so emailed invoices need the other
    // option.
    if (source === "camera") {
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
    } else {
      input.accept = "image/*,application/pdf";
      input.removeAttribute("capture");
    }

    input.click();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    // Choosing a source is the commitment; a second "upload" tap adds nothing.
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setFilename(file.name);
    setPreview({
      name: file.name,
      size: file.size,
      type: file.type,
      url: previewUrl,
    });
    formRef.current?.requestSubmit();
  }

  return (
    <div>
      <form action={formAction} ref={formRef}>
        <input name="quarter" type="hidden" value={quarter} />
        <input
          accept="image/*,application/pdf"
          aria-hidden
          className="sr-only"
          name="file"
          onChange={handleChange}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />

        {isPending ? (
          <div
            aria-live="polite"
            className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-primary-700">
              <Loader2 aria-hidden className="animate-spin" size={22} />
            </span>
            <div className="min-w-0">
              <p className="break-all text-sm font-extrabold text-primary-950">
                Reading {filename || "income record"}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-primary-800">
                Extracting the total. This may take a few seconds.
              </p>
            </div>
          </div>
        ) : result?.ok === true ? null : (
          <>
            {result && "error" in result ? (
              <p
                aria-live="polite"
                className="mb-3 flex items-start gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 p-3 text-sm font-semibold text-grey-800"
              >
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 shrink-0 text-warning-500"
                  size={17}
                />
                {result.error}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
            {/*
              Hidden for fine pointers: desktop browsers ignore the capture
              attribute and would just open a file picker.
            */}
            <button
              className="flex flex-col items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-6 text-center transition hover:border-primary-500 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 active:scale-[0.98] motion-reduce:transform-none pointer-fine:hidden"
              onClick={() => pick("camera")}
              type="button"
            >
              <span className="grid size-12 place-items-center rounded-full bg-primary-500 text-white">
                <Camera aria-hidden size={24} />
              </span>
              <span className="text-sm font-extrabold text-grey-900">Take a photo</span>
              <span className="text-xs font-semibold text-grey-600">
                Use your camera on a receipt or invoice
              </span>
            </button>
            <button
              className="flex flex-col items-center gap-2 rounded-xl border border-grey-300 bg-white px-4 py-6 text-center transition hover:border-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 active:scale-[0.98] motion-reduce:transform-none"
              onClick={() => pick("file")}
              type="button"
            >
              <span className="grid size-12 place-items-center rounded-full bg-grey-200 text-grey-700">
                <FileUp aria-hidden size={24} />
              </span>
              <span className="text-sm font-extrabold text-grey-900">Upload a file</span>
              <span className="text-xs font-semibold text-grey-600">
                Choose a JPG, PNG or PDF already on this device
              </span>
            </button>
            </div>
          </>
        )}
      </form>

      {!isPending && result?.ok === true ? (
        <ConfirmationStep
          key={result.id}
          onAddAnother={() => pick("camera")}
          onDone={onDone}
          preview={preview}
          quarter={quarter}
          result={result}
        />
      ) : null}
    </div>
  );
}
