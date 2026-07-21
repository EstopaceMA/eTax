import { signOut } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWorkspaceData } from "@/lib/data";

export default async function ProfilePage() {
  const { profile, taxpayerProfile } = await getWorkspaceData();
  const fields = [
    ["Name", profile?.full_name ?? "Not provided"],
    ["Email", profile?.email ?? "Not provided"],
    ["Taxpayer type", taxpayerProfile?.taxpayer_type ?? "Not provided"],
    ["Work type", taxpayerProfile?.work_type ?? "Not provided"],
    ["Registration status", taxpayerProfile?.registration_status ?? "Not provided"],
    ["TIN status", taxpayerProfile?.tin_status ?? "Not provided"],
    ["Mobile number", taxpayerProfile?.mobile_number ?? "Not provided"],
    ["RDO", taxpayerProfile?.rdo ?? "Not provided"],
    ["Filing frequency", taxpayerProfile?.filing_frequency ?? "Not provided"],
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-grey-300 bg-grey-50 p-4 shadow-[0_10px_28px_rgba(20,26,33,0.05)] md:p-5">
        <p className="text-xs font-bold uppercase text-primary-700">Tax profile</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-grey-900 md:text-4xl">
          Taxpayer profile details
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          Keep this aligned with your working tax details before using readiness
          and filing checklists. Your category starts from onboarding and can
          later support more tailored workflows.
        </p>
      </div>
      <Card>
        <dl className="grid gap-3 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div className="rounded-lg border border-grey-300 bg-grey-100 p-4" key={label}>
              <dt className="text-xs font-bold uppercase text-grey-500">{label}</dt>
              <dd className="mt-2 break-words font-semibold text-grey-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-grey-900">Account access</h2>
            <p className="mt-1 text-sm leading-6 text-grey-600">
              Sign out of this eTax workspace on this device.
            </p>
          </div>
          <form action={signOut} className="grid">
            <button className={`${buttonClass("secondary")} w-full md:w-auto`} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
