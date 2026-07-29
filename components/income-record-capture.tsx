"use client";

import { Camera, FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadIncomeRecord } from "@/app/actions/workspace";

type Source = "camera" | "file";

function normalizeFilename(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Pending panel and options live inside the form so useFormStatus resets them
 * when the action settles.
 */
function CaptureOptions({
  filename,
  onPick,
}: {
  filename: string;
  onPick: (source: Source) => void;
}) {
  const { pending } = useFormStatus();

  if (pending) {
    return (
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
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/*
        capture="environment" is applied only to this path. Forcing it on the
        shared input would drop application/pdf, so emailed invoices need the
        other option. The camera option is hidden for fine pointers because the
        capture attribute is ignored there and would just open a file picker.
      */}
      <button
        className="flex flex-col items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-6 text-center transition hover:border-primary-500 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 active:scale-[0.98] motion-reduce:transform-none pointer-fine:hidden"
        onClick={() => onPick("camera")}
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
        onClick={() => onPick("file")}
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
  );
}

export function IncomeRecordCapture({
  existingFilenames,
  quarter,
}: {
  existingFilenames: string[];
  quarter: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const existing = new Set(existingFilenames.map(normalizeFilename));

  function pick(source: Source) {
    const input = inputRef.current;

    if (!input) {
      return;
    }

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
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (
      existing.has(normalizeFilename(file.name)) &&
      !window.confirm(
        `You already uploaded "${file.name}" for this period. Upload another copy?`,
      )
    ) {
      input.value = "";
      return;
    }

    setFilename(file.name);
    // Choosing a source is the commitment; a second "upload" tap adds nothing.
    formRef.current?.requestSubmit();
  }

  return (
    <form action={uploadIncomeRecord} ref={formRef}>
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
      <CaptureOptions filename={filename} onPick={pick} />
    </form>
  );
}
