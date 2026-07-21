"use client";

import { FileText, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { fileTaxReturn } from "@/app/actions/workspace";
import { buttonClass } from "@/components/ui/button";

function FileButton() {
  const { pending } = useFormStatus();

  return (
    <button className={buttonClass("soft")} disabled={pending} type="submit">
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin" size={18} />
      ) : (
        <FileText aria-hidden size={18} />
      )}
      {pending ? "Filing..." : "File"}
    </button>
  );
}

export function FileTaxReturnForm({ quarter }: { quarter: number }) {
  return (
    <form action={fileTaxReturn} className="grid">
      <input name="quarter" type="hidden" value={quarter} />
      <FileButton />
    </form>
  );
}
