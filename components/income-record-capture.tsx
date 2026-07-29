"use client";

import Link from "next/link";
import { Camera, CheckCircle2, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { uploadIncomeRecord } from "@/app/actions/workspace";
import { buttonClass } from "@/components/ui/button";

type Source = "camera" | "file";
type Result = Awaited<ReturnType<typeof uploadIncomeRecord>> | null;

async function uploadAction(_previous: Result, formData: FormData) {
  return uploadIncomeRecord(formData);
}

export function IncomeRecordCapture({ quarter }: { quarter: number }) {
  const [result, formAction, isPending] = useActionState<Result, FormData>(
    uploadAction,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [filename, setFilename] = useState("");

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
    setFilename(file.name);
    formRef.current?.requestSubmit();
  }

  return (
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
      ) : result && "ok" in result ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-success-500/30 bg-success-500/10 p-4"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 aria-hidden className="mt-0.5 shrink-0 text-success-500" size={19} />
            <div className="min-w-0">
              <p className="break-all text-sm font-extrabold text-grey-900">
                {result.filename} recorded
              </p>
              <p className="mt-0.5 text-sm text-grey-700">
                Check the total against the document before it counts towards
                your return.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              className={buttonClass("secondary")}
              onClick={() => pick("camera")}
              type="button"
            >
              <Camera aria-hidden size={17} />
              Add another
            </button>
            <Link className={buttonClass("primary")} href={`/records?quarter=${quarter}`}>
              Verify total
            </Link>
          </div>
        </div>
      ) : (
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
  );
}
