import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status";
import { getWorkspaceData } from "@/lib/data";
import { daysUntil, formatDate } from "@/lib/utils";

export default async function DeadlinesPage() {
  const { deadlines } = await getWorkspaceData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-primary-700">Deadlines</p>
        <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
          Upcoming compliance dates
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          Use these reminders to prepare early before completing a mock filing.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {deadlines.map((deadline) => (
          <Card key={deadline.id}>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                <CalendarDays size={24} aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-grey-900">{deadline.title}</h2>
                  <StatusBadge status={deadline.status} />
                </div>
                <p className="mt-2 text-sm font-bold text-grey-700">
                  {formatDate(deadline.due_date)} · {daysUntil(deadline.due_date)} days away
                </p>
                <p className="mt-3 text-sm leading-6 text-grey-600">{deadline.description}</p>
                <p className="mt-4 text-sm font-bold text-primary-700">{deadline.channel}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
