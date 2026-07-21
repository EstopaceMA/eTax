import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { getWorkspaceData } from "@/lib/data";

export default async function MockFilingPage() {
  const { mockFilingModules } = await getWorkspaceData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-primary-700">Mock filing</p>
        <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
          Practice the filing flow
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          eTax keeps filing inside this project as a safe simulation. Review
          the steps, then use the filing tracker to update mock filing and
          payment status.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {mockFilingModules.map((module) => (
          <Card key={module.id}>
            <h2 className="text-xl font-extrabold text-grey-900">{module.name}</h2>
            <p className="mt-3 min-h-20 text-sm leading-6 text-grey-600">
              {module.description}
            </p>
            <Link className={buttonClass("secondary")} href="/filing">
              Open filing tracker
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
