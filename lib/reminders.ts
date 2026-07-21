import type { FilingObligation, PaymentStatus } from "@/lib/types";

export const defaultReminderDays = [7, 5, 3, 1];
export const manilaTimeZone = "Asia/Manila";

export type ReminderScenario =
  | "workspace"
  | "not_generated"
  | "generated_unpaid"
  | "generated_paid_unfiled"
  | "complete"
  | "mixed";

export type ReminderFiling = Pick<
  FilingObligation,
  "id" | "form_name" | "period" | "due_date" | "status" | "payment_status"
> & {
  generated_pdf_at?: string | null;
};

export type ReminderEvaluation = {
  filing: ReminderFiling;
  daysUntilDue: number;
  generated: boolean;
  filed: boolean;
  paid: boolean;
  shouldSend: boolean;
  stateLabel: string;
  reason: string;
  message: string | null;
};

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getTodayInManila(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: manilaTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysUntilDue(asOfDate: string, dueDate: string) {
  return Math.round((parseDateOnly(dueDate) - parseDateOnly(asOfDate)) / 86_400_000);
}

export function parseReminderDays(value: string | null | undefined) {
  const days = (value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 365);

  return [...new Set(days.length > 0 ? days : defaultReminderDays)].sort((a, b) => b - a);
}

function isGenerated(filing: ReminderFiling) {
  return Boolean(filing.generated_pdf_at) || filing.status !== "draft";
}

function isFiled(status: ReminderFiling["status"]) {
  return status === "filed" || status === "paid";
}

function isPaid(paymentStatus: PaymentStatus) {
  return paymentStatus === "paid";
}

function stateLabel(generated: boolean, filed: boolean, paid: boolean) {
  if (generated && filed && paid) {
    return "Generated, filed, and paid";
  }

  if (generated && paid && !filed) {
    return "Generated and paid, not filed";
  }

  if (generated && !filed && !paid) {
    return "Generated, not filed or paid";
  }

  if (!generated && !filed && !paid) {
    return "Not generated, not filed or paid";
  }

  if (filed && !paid) {
    return "Filed, not paid";
  }

  return "Needs review";
}

function messageForFiling({
  filing,
  days,
  generated,
  filed,
  paid,
}: {
  filing: ReminderFiling;
  days: number;
  generated: boolean;
  filed: boolean;
  paid: boolean;
}) {
  const deadline = days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;

  if (generated && filed && paid) {
    return null;
  }

  if (generated && paid && !filed) {
    return `eTax reminder: Your ${filing.period} ${filing.form_name} is paid but not marked filed. The deadline is ${deadline}. Please use the eTax app to mark it as filed once submitted.`;
  }

  if (generated && !filed && !paid) {
    return `eTax reminder: Your ${filing.period} ${filing.form_name} PDF is prepared but not filed or paid. The deadline is ${deadline}. Please use the eTax app to complete filing and payment.`;
  }

  if (filed && !paid) {
    return `eTax reminder: Your ${filing.period} ${filing.form_name} is filed but not marked paid. The deadline is ${deadline}. Please use the eTax app to update your payment status.`;
  }

  return `eTax reminder: Your ${filing.period} ${filing.form_name} deadline is ${deadline}. Please use the eTax app to generate your form, file, and pay before it is due.`;
}

export function evaluateReminders({
  asOfDate,
  reminderDays,
  filings,
}: {
  asOfDate: string;
  reminderDays: number[];
  filings: ReminderFiling[];
}): ReminderEvaluation[] {
  return filings.map((filing) => {
    const days = daysUntilDue(asOfDate, filing.due_date);
    const generated = isGenerated(filing);
    const filed = isFiled(filing.status);
    const paid = isPaid(filing.payment_status);
    const message = messageForFiling({ filing, days, generated, filed, paid });
    const matchesReminderDay = reminderDays.includes(days);
    const shouldSend = matchesReminderDay && message !== null;

    return {
      filing,
      daysUntilDue: days,
      generated,
      filed,
      paid,
      shouldSend,
      stateLabel: stateLabel(generated, filed, paid),
      reason: shouldSend
        ? `Matches ${days}-day reminder window`
        : message === null
          ? "Already generated, filed, and paid"
          : `Not in reminder window (${days} days from due date)`,
      message,
    };
  });
}

export function applyReminderScenario(
  filings: ReminderFiling[],
  scenario: ReminderScenario,
): ReminderFiling[] {
  if (scenario === "workspace") {
    return filings;
  }

  return filings.map((filing, index) => {
    if (scenario === "mixed") {
      const scenarios: ReminderScenario[] = [
        "not_generated",
        "generated_unpaid",
        "generated_paid_unfiled",
        "complete",
      ];
      return applyReminderScenario([filing], scenarios[index % scenarios.length])[0];
    }

    const generated_pdf_at = scenario === "not_generated" ? null : "2026-08-01T00:00:00Z";

    if (scenario === "complete") {
      return {
        ...filing,
        generated_pdf_at,
        status: "filed",
        payment_status: "paid",
      };
    }

    if (scenario === "generated_paid_unfiled") {
      return {
        ...filing,
        generated_pdf_at,
        status: "ready",
        payment_status: "paid",
      };
    }

    if (scenario === "generated_unpaid") {
      return {
        ...filing,
        generated_pdf_at,
        status: "ready",
        payment_status: "unpaid",
      };
    }

    return {
      ...filing,
      generated_pdf_at,
      status: "draft",
      payment_status: "unpaid",
    };
  });
}
