import Image from "next/image";
import { UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { updateTaxpayerProfile } from "@/app/actions/taxpayer-profile";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWorkspaceData } from "@/lib/data";
import { rdoDistricts } from "@/lib/bir/rdo-lookup";
import { taxpayerCategories } from "@/lib/taxpayer-categories";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { profile, taxpayerProfile, ssoProfile } = await getWorkspaceData();
  const photoUrl = ssoProfile?.photo_url ?? null;
  const displayName = ssoProfile?.full_name || profile?.full_name || "Not provided";
  const fields = [
    ["Name", displayName],
    ["Email", ssoProfile?.email ?? profile?.email ?? "Not provided"],
    ["Work type", taxpayerProfile?.work_type ?? "Not provided"],
    ["Registration status", taxpayerProfile?.registration_status ?? "Not provided"],
    ["TIN", ssoProfile?.tin_id ?? "Not provided"],
    ["Mobile number", ssoProfile?.mobile ?? "Not provided"],
    ["Filing frequency", taxpayerProfile?.filing_frequency ?? "Not provided"],
  ];
  const inputClass =
    "mt-2 min-h-11 w-full rounded-lg border border-grey-300 bg-white px-3 text-grey-900 focus:border-primary-500 focus:outline-2 focus:outline-offset-2";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-grey-300 bg-grey-50 p-4 shadow-[0_10px_28px_rgba(20,26,33,0.05)] md:p-5">
        <div className="flex items-start gap-4">
          {photoUrl ? (
            <Image
              alt={displayName}
              className="size-20 shrink-0 rounded-full border border-grey-300 object-cover md:size-24"
              height={96}
              src={photoUrl}
              width={96}
            />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-full border border-grey-300 bg-grey-200 text-grey-500 md:size-24">
              <UserRound aria-hidden className="size-10" strokeWidth={1.6} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-primary-700">Tax profile</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-grey-900 md:text-4xl">
              Taxpayer profile details
            </h1>
            <p className="mt-2 max-w-2xl text-grey-600">
              The details below are sourced from your eGovPH account and your
              BIR registration. Please ensure these remain accurate, as they are
              applied to your compliance checklists and filing submissions.
            </p>
          </div>
        </div>
      </div>
      {params.error ? (
        <p className="rounded-lg bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
          {params.error}
        </p>
      ) : null}
      {params.message ? (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-900">
          {params.message}
        </p>
      ) : null}
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
        <h2 className="text-lg font-extrabold text-grey-900">BIR registration details</h2>
        <p className="mt-1 text-sm leading-6 text-grey-600">
          The RDO specified below is linked by default to your registered
          address. Please update this to reflect your assigned Revenue District
          Office as indicated in your BIR Certificate of Registration.
        </p>
        <form action={updateTaxpayerProfile} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-grey-700">Taxpayer type</span>
            <select
              className={inputClass}
              defaultValue={taxpayerProfile?.taxpayer_type ?? ""}
              name="taxpayer_type"
            >
              {taxpayerCategories.map((category) => (
                <option key={category.key} value={category.label}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-grey-700">RDO</span>
            <select
              className={inputClass}
              defaultValue={taxpayerProfile?.rdo ?? ""}
              name="rdo"
            >
              <option value="">Select an RDO</option>
              {rdoDistricts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.code} — {district.office}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <button className={buttonClass("primary")} type="submit">
              Save changes
            </button>
          </div>
        </form>
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
