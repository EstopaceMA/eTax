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
    ["RDO", taxpayerProfile?.rdo ?? "Not provided"],
    ["Filing frequency", taxpayerProfile?.filing_frequency ?? "Not provided"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-primary-700">Tax profile</p>
        <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
          Taxpayer profile details
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          Keep this aligned with your working tax details before using readiness
          and filing checklists. Your category starts from onboarding and can
          later support more tailored workflows.
        </p>
      </div>
      <Card>
        <dl className="grid gap-4 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div className="rounded-xl bg-grey-100 p-4" key={label}>
              <dt className="text-sm font-bold text-grey-500">{label}</dt>
              <dd className="mt-2 font-semibold text-grey-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
