import Link from "next/link";
import {
  CalendarClock,
  ImageUp,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { getWorkspaceData } from "@/lib/data";
import { daysUntil, formatDate, readinessPercentage } from "@/lib/utils";

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
  const data = await getWorkspaceData();
  const requiredItems = data.checklistItems.filter((item) => item.required);
  const completedRequired = requiredItems.filter(
    (item) => item.status === "complete",
  );
  const readiness = readinessPercentage(requiredItems.length, completedRequired.length);
  const nextDeadline = data.deadlines[0];
  const currentFiling =
    data.filingObligations.find((filing) => filing.due_date === nextDeadline?.due_date) ??
    data.filingObligations[0];
  const currentUploads = data.incomeRecordUploads.filter(
    (upload) => upload.period === currentFiling?.period,
  );
  const totalIncome = currentUploads.reduce(
    (sum, upload) => sum + (upload.total_income ?? 0),
    0,
  );

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
        <Link className={buttonClass("primary")} href="/filing?view=documents">
          Upload income records
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
            {nextDeadline ? deadlineDistance(nextDeadline.due_date) : "No date"}
          </p>
        </Card>
        <Card>
          <ImageUp className="text-info-500" size={28} aria-hidden />
          <p className="mt-4 text-sm font-bold text-grey-500">Income records</p>
          <p className="mt-1 text-xl font-extrabold text-grey-900">
            {currentUploads.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-grey-500">Active filing</p>
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
                Income records
              </h2>
              <p className="mt-1 text-sm text-grey-600">
                Uploaded images and saved totals for the active filing period.
              </p>
            </div>
            <Link className="text-sm font-bold text-primary-700" href="/filing?view=documents">
              Manage
            </Link>
          </div>
          <div className="mt-6 rounded-xl bg-primary-50 p-4">
            <p className="text-sm font-bold text-primary-900">Total income recorded</p>
            <p className="mt-2 text-3xl font-extrabold text-grey-900">
              PHP {totalIncome.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {currentUploads.slice(0, 3).map((upload) => (
              <div className="rounded-xl bg-grey-100 p-4" key={upload.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="break-all font-bold text-grey-900">
                    {upload.original_filename}
                  </h3>
                  <p className="text-sm font-extrabold text-grey-900">
                    PHP {(upload.total_income ?? 0).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <p className="mt-1 text-sm leading-6 text-grey-600">{upload.period}</p>
              </div>
            ))}
            {currentUploads.length === 0 ? (
              <div className="rounded-xl bg-grey-100 p-4 text-sm font-semibold text-grey-600">
                No income record images uploaded for the active filing period yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-extrabold text-grey-900">Next filing deadline</h2>
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
              {currentFiling ? (
                <div className="mt-5 rounded-xl bg-grey-100 p-4">
                  <p className="text-sm font-bold text-grey-500">Matched filing</p>
                  <p className="mt-1 font-extrabold text-grey-900">
                    {currentFiling.form_name}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={currentFiling.status} />
                    <StatusBadge status={currentFiling.payment_status} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-grey-600">No upcoming deadlines.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
