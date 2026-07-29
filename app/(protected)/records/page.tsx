import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, FileText } from "lucide-react";
import { ConfirmIncomeRecordForm } from "@/components/agentic-workflow";
import { CaptureTrigger } from "@/components/capture-trigger";
import {
  DeleteIncomeRecordForm,
  IncomeRecordTotalForm,
} from "@/components/income-record-forms";
import { StatusBadge } from "@/components/status";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { getWorkspaceData } from "@/lib/data";
import {
  filingQuarters,
  getLatestOpenQuarter,
  isFilingPeriodOpen,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { formatDate, peso } from "@/lib/utils";
import type { IncomeRecordUpload } from "@/lib/types";

function DocumentThumbnail({ record }: { record: IncomeRecordUpload }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-grey-300 bg-white sm:w-[104px] sm:shrink-0">
      {record.signed_url && record.content_type?.startsWith("image/") ? (
        <div
          aria-label={record.original_filename}
          className="aspect-[4/3] bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url(${record.signed_url})` }}
        />
      ) : (
        <div className="grid aspect-[4/3] place-items-center text-primary-700">
          <FileText aria-hidden size={26} />
        </div>
      )}
    </div>
  );
}

/**
 * Records is its own destination rather than a tab inside /filing because the
 * frequencies are nothing alike: a record is added every time an invoice is
 * issued, while a return is reviewed and filed once a quarter. This screen is
 * the only place records are changed; /filing shows them read-only as the
 * evidence behind the computation.
 */
export default async function RecordsPage({
  searchParams,
}: {
  searchParams?: Promise<{ quarter?: string }>;
}) {
  const [params, data] = await Promise.all([searchParams, getWorkspaceData()]);
  const requestedQuarter = parseFilingQuarter(params?.quarter ?? null);
  const requestedMeta =
    filingQuarters.find(({ quarter }) => quarter === requestedQuarter) ??
    filingQuarters[1];
  const selectedQuarter = isFilingPeriodOpen(requestedMeta.opensOn)
    ? requestedQuarter
    : getLatestOpenQuarter();
  const selectedMeta =
    filingQuarters.find(({ quarter }) => quarter === selectedQuarter) ??
    filingQuarters[1];
  const records = data.incomeRecordUploads.filter((record) =>
    [selectedMeta.period, ...(selectedMeta.periodAliases ?? [])].includes(
      record.period,
    ),
  );
  const unconfirmed = records.filter(
    (record) => record.extraction_status !== "confirmed",
  );
  const confirmed = records.filter(
    (record) => record.extraction_status === "confirmed",
  );
  const confirmedTotal = confirmed.reduce(
    (sum, record) => sum + (record.total_income ?? 0),
    0,
  );
  const periodOpen = isFilingPeriodOpen(selectedMeta.opensOn);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-primary-700">
            {selectedMeta.shortLabel}
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-grey-900 md:text-3xl">
            Income records
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-grey-600">
            {confirmed.length} confirmed &middot; {peso(confirmedTotal)} counting
            towards this quarter.
          </p>
        </div>
        {periodOpen ? <CaptureTrigger className="w-full md:w-auto" /> : null}
      </header>

      <nav aria-label="Filing quarter" className="flex flex-wrap gap-2">
        {filingQuarters.map(({ quarter, shortLabel, opensOn }) => {
          const open = isFilingPeriodOpen(opensOn);
          const selected = quarter === selectedQuarter;

          return open ? (
            <Link
              aria-current={selected ? "page" : undefined}
              className={
                selected
                  ? "min-h-11 rounded-lg bg-primary-500 px-3 py-2 text-sm font-bold text-white"
                  : "min-h-11 rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm font-bold text-grey-700 transition hover:border-primary-500"
              }
              href={`/records?quarter=${quarter}`}
              key={quarter}
            >
              {shortLabel}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="min-h-11 rounded-lg border border-grey-200 bg-grey-50 px-3 py-2 text-sm font-bold text-grey-400"
              key={quarter}
            >
              {shortLabel}
            </span>
          );
        })}
      </nav>

      {!periodOpen ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning-500/30 bg-warning-500/10 p-4 text-sm text-grey-700">
          <AlertTriangle
            aria-hidden
            className="mt-0.5 shrink-0 text-warning-500"
            size={18}
          />
          This filing period has not opened yet.
        </div>
      ) : null}

      {unconfirmed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-grey-900">
            Needs your confirmation ({unconfirmed.length})
          </h2>
          {unconfirmed.map((record) => (
            <Card key={record.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <DocumentThumbnail record={record} />
                <div className="min-w-0 flex-1">
                  <StatusBadge status={record.extraction_status} />
                  <h3 className="mt-2 break-all font-extrabold text-grey-900">
                    {record.original_filename}
                  </h3>
                  <p className="mt-0.5 text-sm text-grey-600">
                    {record.total_income === null
                      ? "No total could be read. Enter it from the document."
                      : `eTax read ${peso(record.total_income)}. Check it against the document.`}
                  </p>
                </div>
                <div className="sm:w-[260px] sm:shrink-0">
                  <ConfirmIncomeRecordForm
                    quarter={selectedQuarter}
                    record={record}
                    returnTo="records"
                  />
                </div>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-grey-900">
          Confirmed ({confirmed.length})
        </h2>
        {confirmed.map((record) => (
          <Card key={record.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <DocumentThumbnail record={record} />
              <div className="min-w-0 flex-1">
                <StatusBadge status={record.extraction_status} />
                <h3 className="mt-2 break-all font-extrabold text-grey-900">
                  {record.original_filename}
                </h3>
                <p className="mt-0.5 text-sm text-grey-600">
                  Confirmed {formatDate(record.created_at.slice(0, 10))}
                </p>
              </div>
              <div className="grid gap-2 sm:w-[260px] sm:shrink-0 sm:grid-cols-2">
                <IncomeRecordTotalForm
                  id={record.id}
                  quarter={selectedQuarter}
                  storagePath={record.storage_path}
                  totalIncome={record.total_income}
                />
                <DeleteIncomeRecordForm
                  filename={record.original_filename}
                  id={record.id}
                  quarter={selectedQuarter}
                  storagePath={record.storage_path}
                />
              </div>
            </div>
          </Card>
        ))}
        {confirmed.length === 0 && unconfirmed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-grey-300 bg-grey-100 px-4 py-9 text-center">
            <Camera aria-hidden className="text-grey-500" size={26} />
            <span className="text-sm font-bold text-grey-800">
              No income records for {selectedMeta.shortLabel}
            </span>
            <span className="text-xs text-grey-600">
              Photograph a receipt or upload an invoice to start this quarter.
            </span>
          </div>
        ) : null}
      </section>

      <Link
        className={`${buttonClass("secondary")} w-full md:w-auto`}
        href={`/filing?quarter=${selectedQuarter}&view=review`}
      >
        Review the computation
        <ArrowRight aria-hidden size={17} />
      </Link>
    </div>
  );
}
