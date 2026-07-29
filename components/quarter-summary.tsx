import { CalendarDays } from "lucide-react";
import type { AgenticPlan } from "@/lib/agentic/types";
import { daysUntil, formatDate, peso, pesoNumber } from "@/lib/utils";

function deadlineDistance(dueDate: string) {
  const days = daysUntil(dueDate);

  if (days === 0) {
    return "due today";
  }

  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }

  return `${days} days left`;
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-2 py-2.5 text-center ring-1 ring-grey-300">
      <p className="text-[10px] font-bold uppercase tracking-wide text-grey-600">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-bold tabular-nums text-grey-900">
        {value}
      </p>
    </div>
  );
}

/**
 * The dashboard hero: what the quarter costs and when it is due.
 *
 * Everything here comes from the plan the dashboard already loads, so this adds
 * no queries. `amountPayable` is BIR 1701Q item 63, which goes negative when
 * credits exceed the tax due — that is an overpayment carried forward, not an
 * error, so it is shown as a credit rather than a negative bill.
 */
export function QuarterSummary({ plan }: { plan: AgenticPlan }) {
  const output = plan.computation?.output_snapshot ?? null;
  const payable = output?.amountPayable ?? null;
  const carriedCredit = payable !== null && payable < 0 ? Math.abs(payable) : 0;
  const amountDue = payable === null ? null : Math.max(payable, 0);

  const income =
    output?.totalIncomeThisQuarter ?? plan.computation?.input_snapshot.totalIncome;
  const taxDue = output?.taxDue;
  const credits = output?.totalTaxCreditsPayments;
  const hasBreakdown =
    income !== undefined && taxDue !== undefined && credits !== undefined;

  return (
    <section className="rounded-xl bg-gradient-to-b from-primary-50 to-white p-4 ring-1 ring-primary-200 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-500 px-2.5 py-1 text-[11px] font-bold text-white">
            {plan.period.shortLabel}
          </span>
          {plan.rule.status === "demo" ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
              Illustrative rule
            </span>
          ) : null}
        </div>
        <span className="text-[11px] font-semibold text-grey-600">
          BIR {plan.period.formCode}
        </span>
      </div>

      <p className="mt-4 text-[13px] font-semibold text-grey-600">
        {carriedCredit > 0 ? "Nothing to pay this quarter" : "Estimated tax payable"}
      </p>

      {amountDue === null ? (
        <>
          <p className="mt-1 text-[40px] font-black leading-none tracking-tight text-grey-400">
            &mdash;
          </p>
          <p className="mt-2 text-[13px] leading-snug text-grey-600">
            We will estimate this once your income records for the quarter are
            confirmed.
          </p>
        </>
      ) : (
        // Steps down on narrow screens: a seven-figure amount at 40px is wider
        // than a phone viewport once page and card padding are taken out.
        <p className="mt-1 flex items-baseline gap-1.5 text-grey-900">
          <span className="text-xl font-bold text-primary-500 sm:text-2xl">₱</span>
          <span className="min-w-0 break-all text-[32px] font-black leading-none tracking-tight tabular-nums sm:text-[40px]">
            {pesoNumber(amountDue)}
          </span>
        </p>
      )}

      {carriedCredit > 0 ? (
        <p className="mt-2 text-[13px] font-semibold text-grey-700">
          {peso(carriedCredit)} in credits carries forward to next quarter.
        </p>
      ) : null}

      {hasBreakdown ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Figure label="Income" value={peso(income)} />
          <Figure label="Tax due" value={peso(taxDue)} />
          <Figure label="Credits" value={peso(credits)} />
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-white px-3.5 py-3 ring-1 ring-grey-300">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-500">
          <CalendarDays aria-hidden size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-grey-900">
            File by {formatDate(plan.period.dueDate)}
          </p>
          <p className="text-[11px] font-semibold text-grey-600">
            {deadlineDistance(plan.period.dueDate)} &middot; {plan.records.length}{" "}
            income record{plan.records.length === 1 ? "" : "s"} this quarter
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] leading-snug text-grey-600">
        An estimate until you file. eTax never files or moves money without your
        approval.
      </p>
    </section>
  );
}
