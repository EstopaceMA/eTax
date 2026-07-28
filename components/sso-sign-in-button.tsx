"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SsoSignInButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-grey-300 bg-white px-4 py-2 text-sm font-bold text-grey-800",
        "shadow-[0_2px_6px_rgba(20,26,33,0.08)] transition",
        "hover:border-primary-500 hover:shadow-[0_6px_16px_rgba(7,92,247,0.16)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:border-grey-300",
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin text-primary-700"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              d="M4 12a8 8 0 0 1 8-8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>
          <span>Signing in with eGovPH…</span>
        </>
      ) : (
        <>
          <span>Sign in with</span>
          <Image
            alt="eGovPH"
            className="h-5 w-auto"
            height={213}
            priority
            src="/egov-sso-logo.png"
            width={743}
          />
        </>
      )}
    </button>
  );
}
