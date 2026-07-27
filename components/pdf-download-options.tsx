"use client";

import { useState } from "react";
import { CircleHelp, Download } from "lucide-react";

import { buttonClass } from "@/components/ui/button";

export function PdfDownloadOptions({
  formCode,
  pdfUrl,
}: {
  formCode: string;
  pdfUrl: string;
}) {
  const [flatten, setFlatten] = useState(false);
  const resolvedUrl = `${pdfUrl}&flatten=${flatten ? "1" : "0"}`;

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
      <div className="aspect-[3/4] overflow-hidden rounded-lg border border-grey-300 bg-grey-100">
        <iframe
          className="h-full w-full"
          key={resolvedUrl}
          src={`${resolvedUrl}#zoom=page-width&pagemode=none`}
          title={`BIR Form ${formCode} preview`}
        />
      </div>
    </>
  );
}
