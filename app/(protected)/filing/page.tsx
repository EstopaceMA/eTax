import { updateIncomeRecordTotal, uploadIncomeRecord } from "@/app/actions/workspace";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { getWorkspaceData } from "@/lib/data";
import { filingQuarters, parseFilingQuarter } from "@/lib/filing-periods";
import { formatDate } from "@/lib/utils";
import { CalendarDays, ClipboardCheck, Download, FileText, ImageUp } from "lucide-react";
import Link from "next/link";

type FilingView = "documents" | "bir-form";

function parseFilingView(value: string | undefined): FilingView {
  return value === "documents" ? "documents" : "bir-form";
}

function formatFileSize(size: number | null) {
  if (!size) {
    return "Unknown size";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function FilingPage({
  searchParams,
}: {
  searchParams?: Promise<{ quarter?: string; view?: string }>;
}) {
  const params = await searchParams;
  const selectedQuarter = parseFilingQuarter(params?.quarter ?? null);
  const selectedView = parseFilingView(params?.view);
  const selectedQuarterMeta =
    filingQuarters.find(({ quarter }) => quarter === selectedQuarter) ?? filingQuarters[0];
  const { filingObligations, incomeRecordUploads } = await getWorkspaceData();
  const quarterlyObligations = filingQuarters.map((quarter) => ({
    ...quarter,
    obligation: filingObligations.find(({ period }) =>
      [quarter.period, ...(quarter.periodAliases ?? [])].includes(period),
    ),
  }));
  const selectedObligation = quarterlyObligations.find(
    ({ quarter }) => quarter === selectedQuarter,
  )?.obligation;
  const pdfPreviewUrl = `/api/filing/pdf?quarter=${selectedQuarter}`;
  const pdfDownloadUrl = `${pdfPreviewUrl}&download=1`;
  const selectedIncomeRecords = incomeRecordUploads.filter((upload) =>
    [selectedQuarterMeta.period, ...(selectedQuarterMeta.periodAliases ?? [])].includes(
      upload.period,
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-primary-700">Filing tracker</p>
        <h1 className="mt-2 text-3xl font-extrabold text-grey-900 md:text-4xl">
          Quarterly filing workspace
        </h1>
        <p className="mt-2 max-w-2xl text-grey-600">
          Choose a quarter, review the supporting documents, then open the
          generated tax form preview populated from your profile.
        </p>
      </div>

      <div className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-[rgba(145,158,171,0.16)] bg-white p-1 shadow-[0_8px_24px_rgba(20,26,33,0.04)]">
          <div className="grid min-w-[640px] grid-cols-4 gap-1">
            {quarterlyObligations.map(({ label, period, dueDate, quarter, obligation }) => {
              const isSelected = quarter === selectedQuarter;

              return (
                <Link
                  className={[
                    "flex min-h-16 items-center justify-between gap-3 rounded-lg px-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                    isSelected
                      ? "bg-primary-500 text-white shadow-[0_8px_16px_rgba(0,167,111,0.2)]"
                      : "text-grey-700 hover:bg-primary-50 hover:text-primary-900",
                  ].join(" ")}
                  href={`/filing?quarter=${quarter}&view=${selectedView}`}
                  key={quarter}
                >
                  <span>
                    <span className="block text-sm font-extrabold">{label}</span>
                    <span
                      className={[
                        "mt-1 block text-xs font-bold",
                        isSelected ? "text-primary-50" : "text-grey-500",
                      ].join(" ")}
                    >
                      {period} · due {formatDate(obligation?.due_date ?? dueDate)}
                    </span>
                  </span>
                  <CalendarDays aria-hidden size={18} />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            {
              href: `/filing?quarter=${selectedQuarter}&view=documents`,
              icon: ClipboardCheck,
              label: "Documents",
              selected: selectedView === "documents",
            },
            {
              href: `/filing?quarter=${selectedQuarter}&view=bir-form`,
              icon: FileText,
              label: "BIR Form",
              selected: selectedView === "bir-form",
            },
          ].map((item) => (
            <Link
              className={[
                "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2",
                item.selected
                  ? "border-primary-500 bg-primary-50 text-primary-900"
                  : "border-grey-300 bg-white text-grey-700 hover:border-primary-300 hover:text-primary-700",
              ].join(" ")}
              href={item.href}
              key={item.label}
            >
              <item.icon size={16} aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <Card className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-bold text-primary-700">
              {selectedQuarterMeta.label} ·{" "}
              {selectedView === "documents" ? "Documents" : "BIR Form"}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-grey-900">
              {selectedView === "documents"
                ? "Income records"
                : `BIR Form ${selectedQuarterMeta.formCode}`}
            </h2>
            <p className="mt-2 text-sm text-grey-600">
              {selectedView === "documents"
                ? "Uploaded image records attached to this filing period."
                : "Known profile details are drawn onto the PDF. Blank financial fields stay empty for manual review."}
            </p>
          </div>
          {selectedView === "bir-form" ? (
            <a className={buttonClass("secondary")} href={pdfDownloadUrl}>
              <Download size={18} aria-hidden />
              Download PDF
            </a>
          ) : null}
        </div>

        {selectedView === "documents" ? (
          <div className="space-y-3">
            <form
              action={uploadIncomeRecord}
              className="grid gap-3 rounded-xl border border-dashed border-primary-300 bg-primary-50 p-4 md:grid-cols-[1fr_auto]"
              encType="multipart/form-data"
            >
              <input name="quarter" type="hidden" value={selectedQuarter} />
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-primary-900">
                  Upload income record image
                </span>
                <input
                  accept="image/*"
                  className="block w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-grey-800 file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-primary-900"
                  name="file"
                  required
                  type="file"
                />
              </label>
              <button className={`${buttonClass("primary")} self-end`} type="submit">
                <ImageUp size={18} aria-hidden />
                Upload
              </button>
            </form>

            {selectedIncomeRecords.length > 0 ? (
              selectedIncomeRecords.map((record) => (
                <div
                  className="grid gap-4 rounded-xl border border-grey-300 bg-grey-100 p-3 lg:grid-cols-[112px_1fr_240px] lg:items-center"
                  key={record.id}
                >
                  <div className="overflow-hidden rounded-lg bg-white">
                    {record.signed_url ? (
                      <div
                        aria-label={record.original_filename}
                        className="aspect-[4/3] w-full bg-cover bg-center"
                        role="img"
                        style={{ backgroundImage: `url(${record.signed_url})` }}
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-primary-50 text-primary-900">
                        <FileText aria-hidden size={28} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-grey-500">
                      Income records
                    </p>
                    <h3 className="mt-1 break-all font-extrabold text-grey-900">
                      {record.original_filename}
                    </h3>
                    <p className="mt-1 text-sm text-grey-600">
                      Uploaded {formatUploadDate(record.created_at)} · {record.period}
                    </p>
                  </div>
                  <form action={updateIncomeRecordTotal} className="grid gap-2">
                    <input name="id" type="hidden" value={record.id} />
                    <input name="quarter" type="hidden" value={selectedQuarter} />
                    <input name="storage_path" type="hidden" value={record.storage_path} />
                    <label>
                      <span className="mb-1 block text-xs font-bold uppercase text-grey-500">
                        Total income
                      </span>
                      <input
                        className="min-h-10 w-full rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                        defaultValue={record.total_income ?? ""}
                        min="0"
                        name="total_income"
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-grey-500">
                          {formatFileSize(record.size_bytes)}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-grey-500">
                          {record.content_type ?? "image"}
                        </p>
                      </div>
                      <button className={buttonClass("secondary")} type="submit">
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-grey-100 p-5 text-sm font-semibold text-grey-600">
                No income record images uploaded for this period yet.
              </div>
            )}
          </div>
        ) : (
          <>
            {selectedObligation ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-grey-100 p-4">
                <span className="text-sm font-bold text-grey-500">Current record</span>
                <StatusBadge status={selectedObligation.status} />
                <StatusBadge status={selectedObligation.payment_status} />
              </div>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-grey-300 bg-grey-100">
              <iframe
                className="h-[720px] w-full bg-white"
                src={pdfPreviewUrl}
                title={`${selectedQuarterMeta.label} Form ${selectedQuarterMeta.formCode} PDF preview`}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
