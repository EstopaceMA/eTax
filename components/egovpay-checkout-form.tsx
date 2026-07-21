"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createEgovPayCheckout } from "@/app/actions/payment";
import { buttonClass } from "@/components/ui/button";

function CheckoutButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "primary" | "soft";
}) {
  const { pending } = useFormStatus();

  return (
    <button className={buttonClass(variant)} disabled={pending} type="submit">
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin" size={18} />
      ) : (
        <CreditCard aria-hidden size={18} />
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}

export function EgovPayCheckoutForm({
  fileBeforePay = false,
  label = "Proceed",
  pendingLabel = "Opening eGovPay...",
  quarter,
  variant = "primary",
}: {
  fileBeforePay?: boolean;
  label?: string;
  pendingLabel?: string;
  quarter: number;
  variant?: "primary" | "soft";
}) {
  return (
    <form action={createEgovPayCheckout} className="grid">
      <input name="quarter" type="hidden" value={quarter} />
      {fileBeforePay ? (
        <input name="file_before_pay" type="hidden" value="1" />
      ) : null}
      <CheckoutButton label={label} pendingLabel={pendingLabel} variant={variant} />
    </form>
  );
}
