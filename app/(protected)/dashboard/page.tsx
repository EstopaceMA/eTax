import Link from "next/link";
import {
  CalendarClock,
  FileWarning,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { getWorkspaceData } from "@/lib/data";
import { daysUntil, formatDate, readinessPercentage } from "@/lib/utils";

export default async function DashboardPage() {
  const data = await getWorkspaceData();
  const requiredItems = data.checklistItems.filter((item) => item.required);
  const completedRequired = requiredItems.filter(
    (item) => item.status === "complete",
  );
  const readiness = readinessPercentage(requiredItems.length, completedRequired.length);
  const nextDeadline = data.deadlines[0];
  const missingItems = data.checklistItems.filter(
    (item) => item.status === "missing",
  );
  const currentFiling = data.filingObligations[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-primary-700">
            Taxpayer compliance workspace
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
            Compliance dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-grey-600">
            Track what is ready, what is missing, and what still needs attention
            before filing.
          </p>
        </div>
        <Link className={buttonClass("primary")} href="/documents">
          Review checklist
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <ShieldCheck className="text-primary-500" size={28} aria-hidden />
          <p className="mt-4 text-sm font-bold text-grey-500">Readiness</p>
          <p className="font-display text-5xl font-black text-grey-900">
            {readiness}%
          </p>
        </Card>
        <Card>
          <CalendarClock className="text-warning-500" size={28} aria-hidden />
          <p className="mt-4 text-sm font-bold text-grey-500">Next deadline</p>
          <p className="mt-1 text-xl font-extrabold text-grey-900">
            {nextDeadline ? `${daysUntil(nextDeadline.due_date)} days` : "No date"}
          </p>
        </Card>
        <Card>
          <FileWarning className="text-error-500" size={28} aria-hidden />
          <p className="mt-4 text-sm font-bold text-grey-500">Missing items</p>
          <p className="mt-1 text-xl font-extrabold text-grey-900">{missingItems.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-grey-500">Current filing</p>
          <p className="mt-4 text-xl font-extrabold text-grey-900">
            {currentFiling?.period ?? "No filing"}
          </p>
          {currentFiling ? (
            <div className="mt-3">
              <StatusBadge status={currentFiling.status} />
            </div>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-grey-900">
                Preparation checklist
              </h2>
              <p className="mt-1 text-sm text-grey-600">
                The most important items to complete before filing.
              </p>
            </div>
            <Link className="text-sm font-bold text-primary-700" href="/documents">
              View all
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {data.checklistItems.slice(0, 4).map((item) => (
              <div className="flex gap-4 rounded-xl bg-grey-100 p-4" key={item.id}>
                <div className="mt-1 h-3 w-3 rounded-full bg-primary-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-grey-900">{item.title}</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-grey-600">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-extrabold text-grey-900">Next deadline</h2>
          {nextDeadline ? (
            <div className="mt-5">
              <StatusBadge status={nextDeadline.status} />
              <p className="mt-4 text-2xl font-extrabold text-grey-900">
                {nextDeadline.title}
              </p>
              <p className="mt-2 text-sm text-grey-600">
                Due {formatDate(nextDeadline.due_date)} through {nextDeadline.channel}.
              </p>
              <p className="mt-4 text-sm leading-6 text-grey-600">
                {nextDeadline.description}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-grey-600">No upcoming deadlines.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
