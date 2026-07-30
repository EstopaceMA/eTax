"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IncomeRecordCapture } from "@/components/income-record-capture";

export const OPEN_CAPTURE_EVENT = "etax:open-capture";

export function openCapture() {
  window.dispatchEvent(new Event(OPEN_CAPTURE_EVENT));
}

/**
 * Capture is interruption-driven: an invoice arrives and the user wants it
 * recorded in a few taps without losing their place. A modal keeps them where
 * they were and stays batch-friendly — photograph several in a row, then verify
 * the extracted totals together on /records.
 */
export function CaptureShell({ quarter }: { quarter: number }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function open() {
      setIsOpen(true);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener(OPEN_CAPTURE_EVENT, open);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener(OPEN_CAPTURE_EVENT, open);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-surface-inverse/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby="capture-title"
        aria-modal="true"
        className="relative max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-grey-300 bg-white p-4 shadow-[0_-12px_44px_rgba(20,26,33,0.24)] sm:max-h-[90dvh] sm:rounded-2xl sm:shadow-[0_24px_70px_rgba(20,26,33,0.24)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-grey-900" id="capture-title">
              Add income record
            </h2>
            <p className="mt-0.5 text-sm text-grey-600">
              eTax reads the total, then you verify it on Records.
            </p>
          </div>
          <button
            aria-label="Close"
            className="grid size-11 shrink-0 place-items-center rounded-full text-grey-600 transition hover:bg-grey-100 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X aria-hidden size={20} />
          </button>
        </div>
        <div className="mt-4">
          <IncomeRecordCapture quarter={quarter} />
        </div>
      </section>
    </div>
  );
}
