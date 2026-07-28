"use client";

import { useEffect, useState } from "react";
import { CircleHelp, Download, X, ZoomIn } from "lucide-react";

import { buttonClass } from "@/components/ui/button";

export function PdfDownloadOptions({
  formCode,
  pdfUrl,
}: {
  formCode: string;
  pdfUrl: string;
}) {
  const [flatten, setFlatten] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const resolvedUrl = `${pdfUrl}&flatten=${flatten ? "1" : "0"}`;

  useEffect(() => {
    if (!zoomed) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setZoomed(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [zoomed]);

  return (
    <>
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-grey-300 bg-white px-3 text-sm font-bold text-grey-800">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            checked={flatten}
            className="h-4 w-4 accent-primary-600"
            onChange={(event) => setFlatten(event.target.checked)}
            type="checkbox"
          />
          Flatten PDF
        </label>
        <span className="group relative inline-flex">
          <button
            aria-describedby="flatten-pdf-help"
            aria-label="What happens when Flatten PDF is checked?"
            className="inline-flex size-7 items-center justify-center rounded-full text-grey-500 transition hover:bg-grey-100 hover:text-grey-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            type="button"
          >
            <CircleHelp aria-hidden size={16} />
          </button>
          <span
            className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-64 rounded-md border border-grey-300 bg-white p-3 text-xs font-semibold leading-5 text-grey-700 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
            id="flatten-pdf-help"
            role="tooltip"
          >
            Checked: the PDF fields are turned into fixed text for a final copy. Leave it
            unchecked while reviewing or editing the form.
          </span>
        </span>
      </div>
      <a className={`${buttonClass("secondary")} w-full`} href={`${resolvedUrl}&download=1`}>
        <Download aria-hidden size={18} />
        Download draft PDF
      </a>
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-grey-300 bg-grey-100">
        <iframe
          className="h-full w-full"
          key={resolvedUrl}
          src={`${resolvedUrl}#zoom=page-width&pagemode=none`}
          title={`BIR Form ${formCode} preview`}
        />
        <button
          aria-label={`Zoom BIR Form ${formCode}`}
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border border-grey-300 bg-white/95 text-grey-700 shadow-[0_4px_12px_rgba(20,26,33,0.16)] backdrop-blur transition hover:border-primary-500 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          onClick={() => setZoomed(true)}
          type="button"
        >
          <ZoomIn aria-hidden size={18} />
        </button>
      </div>
      {zoomed ? (
        <div
          aria-label={`BIR Form ${formCode} zoomed preview`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-grey-900/70 p-3 backdrop-blur-sm md:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setZoomed(false);
            }
          }}
          role="dialog"
        >
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_rgba(20,26,33,0.35)]">
            <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-grey-300 px-4">
              <p className="truncate text-sm font-bold text-grey-900">
                BIR Form {formCode}
              </p>
              <button
                aria-label="Close zoomed preview"
                className="inline-flex size-9 items-center justify-center rounded-full text-grey-600 transition hover:bg-grey-100 hover:text-grey-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                onClick={() => setZoomed(false)}
                type="button"
              >
                <X aria-hidden size={18} />
              </button>
            </div>
            <iframe
              className="h-full w-full flex-1 bg-grey-100"
              key={`zoom-${resolvedUrl}`}
              src={`${resolvedUrl}#zoom=page-width&pagemode=none`}
              title={`BIR Form ${formCode} zoomed preview`}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
