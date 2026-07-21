import { updateFilingStatus } from "@/app/actions/workspace";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { getWorkspaceData } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const filingStatuses = ["draft", "ready", "filed", "paid"];
const paymentStatuses = ["unpaid", "paid", "not_required"];

export default async function FilingPage() {
  const { filingObligations } = await getWorkspaceData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-primary-700">Filing tracker</p>
        <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
          Track filing and payment status
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          Update this as you complete simulated filing and payment steps.
        </p>
      </div>
      <div className="space-y-4">
        {filingObligations.map((obligation) => (
          <Card key={obligation.id}>
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-grey-900">
                    {obligation.form_name}
                  </h2>
                  <StatusBadge status={obligation.status} />
                  <StatusBadge status={obligation.payment_status} />
                </div>
                <p className="mt-2 text-sm font-bold text-grey-700">
                  {obligation.period} · due {formatDate(obligation.due_date)}
                </p>
              </div>
              <form
                action={updateFilingStatus}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input name="id" type="hidden" value={obligation.id} />
                <label>
                  <span className="sr-only">Filing status</span>
                  <select
                    className="min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-800"
                    defaultValue={obligation.status}
                    name="status"
                  >
                    {filingStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Payment status</span>
                  <select
                    className="min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-800"
                    defaultValue={obligation.payment_status}
                    name="payment_status"
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={buttonClass("primary")} type="submit">
                  Save status
                </button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
