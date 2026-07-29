import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function daysUntil(date: string) {
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

/** Format an amount as Philippine peso, e.g. "₱1,200.00". */
export function peso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

/**
 * Format the number part only, e.g. "1,200.00". Use when the ₱ sign is rendered
 * as a separate styled element: at large bold sizes the U+20B1 glyph's
 * left-extending bars otherwise read like a strikethrough through the digits.
 */
export function pesoNumber(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function readinessPercentage(total: number, complete: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((complete / total) * 100);
}
