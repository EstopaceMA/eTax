import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status";
import { NextAction } from "@/components/next-action";
import { QuarterSummary } from "@/components/quarter-summary";
import { getAgenticPlan } from "@/lib/agentic/orchestrator";
import { getWorkspaceData } from "@/lib/data";
import { daysUntil, formatDate, peso } from "@/lib/utils";

function deadlineDistance(date: string) {
  const days = daysUntil(date);

  if (days === 0) {
    return "Due today";
  }

  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }

  return `${days} days away`;
}

export default async function DashboardPage() {
  const [data, plan] = await Promise.all([
    getWorkspaceData(),
    getAgenticPlan(),
  ]);

  const records = plan.records;
  const totalIncome = records.reduce(
    (sum, record) => sum + (record.total_income ?? 0),
    0,
  );
  // The quarter's own deadline is already the headline of QuarterSummary, so
  // only anything beyond it earns a second mention.
  const otherDeadlines = data.deadlines.filter(
    (deadline) => deadline.due_date !== plan.period.dueDate,
  );
  const recordsHref = `/records?quarter=${plan.period.quarter}`;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">{plan.period.label} tax summary</h1>

      <QuarterSummary plan={plan} />
      <NextAction plan={plan} />

      <section
        className={
          otherDeadlines.length > 0
            ? "grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"
            : "grid gap-4"
        }
      >
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-grey-900">
                Income records
              </h2>
              <p className="mt-0.5 text-sm text-grey-600">
                {records.length} record{records.length === 1 ? "" : "s"}
                {records.length > 0 ? ` · ${peso(totalIncome)} total` : ""}
              </p>
            </div>
            <Link className="text-sm font-bold text-primary-700" href={recordsHref}>
              Manage
            </Link>
          </div>

          {records.length === 0 ? (
            <Link
              className="mt-4 flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-grey-300 bg-grey-100 px-4 py-8 text-center transition hover:border-primary-500 hover:bg-primary-50"
              href={recordsHref}
            >
              <span className="text-sm font-bold text-grey-800">
                No income records yet
              </span>
              <span className="text-xs text-grey-600">
                Upload one to start your {plan.period.shortLabel} estimate.
              </span>
            </Link>
          ) : (
            <ul className="mt-4 space-y-2">
              {records.slice(0, 4).map((record) => (
                <li
                  className="flex items-center gap-3 rounded-lg border border-grey-300 bg-grey-100 px-3 py-2.5"
                  key={record.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-grey-900">
                      {record.original_filename}
                    </p>
                    <p className="text-xs text-grey-600">{record.period}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-grey-900">
                    {peso(record.total_income ?? 0)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {otherDeadlines.length > 0 ? (
          <Card>
            <h2 className="text-lg font-extrabold text-grey-900">
              Other deadlines
            </h2>
            <ul className="mt-4 space-y-3">
              {otherDeadlines.slice(0, 4).map((deadline) => (
                <li key={deadline.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-grey-900">
                      {deadline.title}
                    </p>
                    <StatusBadge status={deadline.status} />
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-grey-600">
                    {formatDate(deadline.due_date)} ·{" "}
                    {deadlineDistance(deadline.due_date)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
