import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { ConfirmIncomeRecordForm } from "@/components/agentic-workflow";
import { IncomeRecordCapture } from "@/components/income-record-capture";
import { StatusBadge } from "@/components/status";
import { Card } from "@/components/ui/card";
import { getAgenticPlan } from "@/lib/agentic/orchestrator";
import { requireUser } from "@/lib/data";
import { peso } from "@/lib/utils";

/**
 * Capture owns exactly the first two steps of the pipeline — collect_records and
 * confirm_extraction — so the centre tab has a destination that matches its
 * glyph. The full tracker at /filing keeps review, hand-off and payment.
 */
export default async function CapturePage() {
  // getAgenticPlan throws on a missing session where requireUser redirects, so
  // this runs first to keep an unauthenticated hit on /sign-in rather than an
  // error boundary.
  await requireUser();
  const plan = await getAgenticPlan();
  const records = plan.records;
  const unconfirmed = records.filter(
    (record) => record.extraction_status !== "confirmed",
  );
  const confirmed = records.filter(
    (record) => record.extraction_status === "confirmed",
  );
  const filingHref = `/filing?quarter=${plan.period.quarter}&view=records`;

  return (
    <div className="space-y-4">
      <header>
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-grey-600 transition hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/dashboard"
        >
          <ArrowLeft aria-hidden size={17} />
          Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-black leading-tight text-grey-900 md:text-3xl">
          Add income record
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-grey-600">
          Photograph a receipt or upload an invoice for {plan.period.shortLabel}.
          eTax reads the total, then you confirm it.
        </p>
      </header>

      {plan.period.isOpen ? (
        <IncomeRecordCapture
          existingFilenames={records.map(
            ({ original_filename }) => original_filename,
          )}
          quarter={plan.period.quarter}
        />
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-warning-500/30 bg-warning-500/10 p-4 text-sm text-grey-700">
          <AlertTriangle aria-hidden className="mt-0.5 shrink-0 text-warning-500" size={18} />
          {plan.period.lockedReason}
        </div>
      )}

      {unconfirmed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-grey-900">
            Needs your confirmation ({unconfirmed.length})
          </h2>
          {unconfirmed.map((record) => (
            <Card className="space-y-3" key={record.id}>
              <div className="min-w-0">
                <StatusBadge status={record.extraction_status} />
                <h3 className="mt-2 break-all font-extrabold text-grey-900">
                  {record.original_filename}
                </h3>
                <p className="mt-0.5 text-sm text-grey-600">
                  {record.total_income === null
                    ? "No total could be read. Enter it yourself."
                    : `eTax read ${peso(record.total_income)}. Check it against the document.`}
                </p>
              </div>
              <ConfirmIncomeRecordForm
                quarter={plan.period.quarter}
                record={record}
                returnTo="capture"
              />
            </Card>
          ))}
        </section>
      ) : null}

      {confirmed.length > 0 ? (
        <Card>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                aria-hidden
                className="mt-0.5 shrink-0 text-success-500"
                size={19}
              />
              <div>
                <p className="text-sm font-extrabold text-grey-900">
                  {confirmed.length} record{confirmed.length === 1 ? "" : "s"}{" "}
                  confirmed for {plan.period.shortLabel}
                </p>
                <p className="mt-0.5 text-sm text-grey-600">
                  {peso(
                    confirmed.reduce(
                      (sum, record) => sum + (record.total_income ?? 0),
                      0,
                    ),
                  )}{" "}
                  of confirmed income.
                </p>
              </div>
            </div>
            <Link
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary-700 transition hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2"
              href={filingHref}
            >
              Filing workspace
              <ArrowRight aria-hidden size={17} />
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
