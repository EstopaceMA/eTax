import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { getWorkspaceData } from "@/lib/data";

export default async function RoadmapPage() {
  const { roadmapSteps, mockFilingModules } = await getWorkspaceData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-primary-700">Compliance Roadmap</p>
        <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
          First, next, and later
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          This stepper is the main eTax workflow: prepare in the app, then
          continue into a mocked filing step when you are ready.
        </p>
      </div>
      <Card>
        <ol className="space-y-5">
          {roadmapSteps.map((step, index) => {
            const filingModule = mockFilingModules.find(
              (item) => item.key === step.handoff_key,
            );

            return (
              <li className="grid gap-4 md:grid-cols-[56px_1fr_auto]" key={step.id}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 font-display text-2xl font-black text-primary-900">
                  {index + 1}
                </div>
                <div className="rounded-2xl bg-grey-100 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-grey-900">{step.title}</h2>
                    <StatusBadge status={step.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-grey-600">{step.description}</p>
                </div>
                {filingModule ? (
                  <Link className={buttonClass("secondary")} href="/mock-filing">
                    {filingModule.name}
                  </Link>
                ) : (
                  <Link className={buttonClass("soft")} href="/documents">
                    Review items
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
