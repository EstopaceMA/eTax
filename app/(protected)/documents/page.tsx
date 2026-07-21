import { updateChecklistItem } from "@/app/actions/workspace";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { getWorkspaceData } from "@/lib/data";

export default async function DocumentsPage() {
  const { checklistItems } = await getWorkspaceData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-primary-700">Documents</p>
        <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
          Filing preparation checklist
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          Mark preparation items complete before moving into the mock filing
          flow.
        </p>
      </div>
      <div className="space-y-4">
        {checklistItems.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-grey-900">{item.title}</h2>
                  <StatusBadge status={item.status} />
                  <span className="rounded-full bg-grey-200 px-3 py-1 text-xs font-bold text-grey-700">
                    {item.required ? "Required" : "Optional"}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-grey-600">
                  {item.description}
                </p>
              </div>
              <form action={updateChecklistItem}>
                <input name="id" type="hidden" value={item.id} />
                <input
                  name="status"
                  type="hidden"
                  value={item.status === "complete" ? "missing" : "complete"}
                />
                <button className={buttonClass(item.status === "complete" ? "secondary" : "primary")} type="submit">
                  {item.status === "complete" ? "Mark missing" : "Mark complete"}
                </button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
