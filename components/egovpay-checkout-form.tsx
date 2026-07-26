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
  label = "Proceed",
  pendingLabel = "Opening eGovPay...",
  quarter,
  variant = "primary",
}: {
  label?: string;
  pendingLabel?: string;
  quarter: number;
  variant?: "primary" | "soft";
}) {
  return (
    <form action={createEgovPayCheckout} className="grid">
      <input name="quarter" type="hidden" value={quarter} />
      <CheckoutButton label={label} pendingLabel={pendingLabel} variant={variant} />
    </form>
  );
}
