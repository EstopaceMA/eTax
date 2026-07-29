"use client";

import { Camera } from "lucide-react";
import { openCapture } from "@/components/capture-shell";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Opens the capture modal. Used wherever adding a record should be offered. */
export function CaptureTrigger({ className }: { className?: string }) {
  return (
    <button
      className={cn(buttonClass("primary"), className)}
      onClick={openCapture}
      type="button"
    >
      <Camera aria-hidden size={18} />
      Add income record
    </button>
  );
}
