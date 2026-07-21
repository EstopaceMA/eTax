import {
  DeleteIncomeRecordForm,
  IncomeRecordTotalForm,
  IncomeRecordUploadForm,
} from "@/components/income-record-forms";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/status";
import { EgovPayCheckoutForm } from "@/components/egovpay-checkout-form";
import { FileTaxReturnForm } from "@/components/file-tax-return-form";
import { getWorkspaceData } from "@/lib/data";
import {
  filingQuarters,
  getLatestOpenQuarter,
  isFilingPeriodOpen,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { getTaxAmountPayable } from "@/lib/tax-amount-payable";
import { formatDate } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type FilingView = "documents" | "bir-form" | "payment";

function parseFilingView(value: string | undefined): FilingView {
  if (value === "documents" || value === "payment") {
    return value;
  }

  return "bir-form";
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
  searchParams?: Promise<{
    filing?: string;
    flow?: string;
    payment?: string;
    quarter?: string;
    sms?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const requestedQuarter = parseFilingQuarter(params?.quarter ?? null);
  const requestedQuarterMeta =
    filingQuarters.find(({ quarter }) => quarter === requestedQuarter) ?? filingQuarters[0];
  const selectedQuarter = isFilingPeriodOpen(requestedQuarterMeta.opensOn)
    ? requestedQuarter
    : getLatestOpenQuarter();
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
  const pdfPreviewFitUrl = `${pdfPreviewUrl}#zoom=page-width&pagemode=none`;
  const pdfDownloadUrl = `${pdfPreviewUrl}&download=1`;
  const selectedIncomeRecords = incomeRecordUploads.filter((upload) =>
    [selectedQuarterMeta.period, ...(selectedQuarterMeta.periodAliases ?? [])].includes(
      upload.period,
    ),
  );
  const totalIncomeRecorded = selectedIncomeRecords.reduce(
    (sum, record) => sum + Number(record.total_income ?? 0),
    0,
  );
  const formattedTotalIncome = new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    style: "currency",
  }).format(totalIncomeRecorded);
  const formattedTaxAmountPayable = new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    style: "currency",
  }).format(getTaxAmountPayable());
  const paymentSucceeded =
    params?.payment === "success" || params?.payment === "returned";
  const paymentSmsStatus = params?.sms;
  const fileBeforePay = params?.flow === "file-and-pay";
  const filingNotice =
    params?.filing === "filed"
      ? params?.sms === "sent"
        ? "eTax filed this return and queued an SMS confirmation."
        : "eTax filed this return. SMS confirmation was not queued."
      : params?.filing === "already-filed"
        ? "This return is already marked filed."
        : params?.filing === "missing"
          ? "This filing record could not be found."
          : null;
  const selectedViewLabel =
    selectedView === "documents"
      ? "Documents"
      : selectedView === "payment"
        ? "Payment review"
        : "BIR Form";

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
            {quarterlyObligations.map(({ label, period, opensOn, dueDate, quarter, obligation }) => {
              const isSelected = quarter === selectedQuarter;
              const isOpen = isFilingPeriodOpen(opensOn);

              return isOpen ? (
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
              ) : (
                <div
                  aria-disabled="true"
                  className="flex min-h-16 cursor-not-allowed items-center justify-between gap-3 rounded-lg px-4 text-left text-grey-400"
                  key={quarter}
                >
                  <span>
                    <span className="block text-sm font-extrabold">{label}</span>
                    <span className="mt-1 block text-xs font-bold">
                      Opens {formatDate(opensOn)}
                    </span>
                  </span>
                  <CalendarDays aria-hidden size={18} />
                </div>
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
              {selectedQuarterMeta.label} · {selectedViewLabel}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-grey-900">
              {selectedView === "documents"
                ? "Income records"
                : selectedView === "payment"
                  ? paymentSucceeded
                    ? "Payment complete"
                    : "Payment receipt preview"
                  : `BIR Form ${selectedQuarterMeta.formCode}`}
            </h2>
            <p className="mt-2 text-sm text-grey-600">
              {selectedView === "documents"
                ? "Uploaded invoice and income record files attached to this filing period."
                : selectedView === "payment"
                  ? paymentSucceeded
                    ? "Your eGovPay test payment details are shown below."
                    : "Review the filing summary before continuing to payment."
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
            <IncomeRecordUploadForm
              existingFilenames={selectedIncomeRecords.map(
                (record) => record.original_filename,
              )}
              quarter={selectedQuarter}
            />

            {selectedIncomeRecords.length > 0 ? (
              selectedIncomeRecords.map((record) => (
                <div
                  className="grid gap-4 rounded-xl border border-grey-300 bg-grey-100 p-3 lg:grid-cols-[112px_1fr_240px] lg:items-center"
                  key={record.id}
                >
                  <div className="overflow-hidden rounded-lg bg-white">
                    {record.signed_url && record.content_type?.startsWith("image/") ? (
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
                  <div className="grid gap-2">
                    <IncomeRecordTotalForm
                      id={record.id}
                      quarter={selectedQuarter}
                      storagePath={record.storage_path}
                      totalIncome={record.total_income}
                    />
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-grey-500">
                          {formatFileSize(record.size_bytes)}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-grey-500">
                          {record.content_type ?? "image"}
                        </p>
                      </div>
                      <DeleteIncomeRecordForm
                        filename={record.original_filename}
                        id={record.id}
                        quarter={selectedQuarter}
                        storagePath={record.storage_path}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-grey-100 p-5 text-sm font-semibold text-grey-600">
                No income record images uploaded for this period yet.
              </div>
            )}
          </div>
        ) : selectedView === "payment" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-grey-300 bg-white p-5">
              <div className="flex items-start justify-between gap-4 border-b border-grey-300 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase text-grey-500">
                    {paymentSucceeded ? "Payment confirmation" : "Pre-payment receipt"}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-grey-900">
                    {paymentSucceeded
                      ? "Payment successful"
                      : `${selectedQuarterMeta.label} filing review`}
                  </h3>
                  <p className="mt-1 text-sm text-grey-600">
                    {paymentSucceeded
                      ? "Your test payment was completed through eGovPay."
                      : "Review your filing details before continuing to payment."}
                  </p>
                </div>
                {paymentSucceeded ? (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success-500/10 text-success-500">
                    <CheckCircle2 aria-hidden size={28} strokeWidth={2.5} />
                  </div>
                ) : null}
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ["Filing period", selectedQuarterMeta.period],
                  ["Form", `BIR Form ${selectedQuarterMeta.formCode}`],
                  [
                    "Due date",
                    formatDate(selectedObligation?.due_date ?? selectedQuarterMeta.dueDate),
                  ],
                  ["Income records", `${selectedIncomeRecords.length} uploaded`],
                  ["Recorded income", formattedTotalIncome],
                  ["Tax amount payable", formattedTaxAmountPayable],
                ].map(([label, value]) => (
                  <div className="rounded-lg bg-grey-100 p-4" key={label}>
                    <dt className="text-xs font-bold uppercase text-grey-500">{label}</dt>
                    <dd className="mt-1 text-sm font-extrabold text-grey-900">{value}</dd>
                  </div>
                ))}
              </dl>

            </div>

            {paymentSucceeded ? (
              <aside className="rounded-xl border border-success-500/20 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-500/10 text-success-500">
                    <CheckCircle2 aria-hidden size={22} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-extrabold text-grey-900">
                    Payment complete
                  </h3>
                </div>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-grey-600">Amount paid</p>
                  <p className="mt-1 text-3xl font-extrabold text-grey-900">
                    {formattedTaxAmountPayable}
                  </p>
                  <div className="mt-5 flex items-start gap-2 border-t border-grey-300 pt-4 text-sm text-grey-600">
                    <ShieldCheck
                      aria-hidden
                      className="mt-0.5 shrink-0 text-success-500"
                      size={18}
                    />
                    <p>This test transaction was processed by eGovPay.</p>
                  </div>
                  {paymentSmsStatus ? (
                    <p className="mt-3 rounded-lg bg-grey-100 p-3 text-sm font-semibold text-grey-700">
                      {paymentSmsStatus === "sent" ||
                      paymentSmsStatus === "already-sent"
                        ? "SMS receipt queued for your registered mobile number."
                        : paymentSmsStatus === "missing_mobile_number"
                          ? "SMS receipt skipped because no registered mobile number is available."
                          : "SMS receipt could not be queued. Your payment return still completed."}
                    </p>
                  ) : null}
                  <Link
                    className={`${buttonClass("primary")} mt-5 w-full`}
                    href={`/filing?quarter=${selectedQuarter}&view=bir-form`}
                  >
                    <FileText size={18} aria-hidden />
                    Return to filing
                  </Link>
                </div>
              </aside>
            ) : (
              <aside className="overflow-hidden rounded-xl border border-primary-500/20 bg-white shadow-[0_16px_40px_rgba(0,167,111,0.08)]">
                <div className="border-b border-primary-500/15 bg-primary-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase text-primary-700">
                      Secure payment handoff
                    </p>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/20 bg-white px-2.5 py-1 text-xs font-bold text-primary-700">
                      <ShieldCheck aria-hidden size={13} />
                      Test mode
                    </div>
                  </div>
                  <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-extrabold text-grey-900">
                    <span>Pay with</span>
                    <Image
                      alt="eGovPay"
                      className="h-auto w-[124px]"
                      height={31}
                      priority
                      src="/egovpay-logo.webp"
                      width={124}
                    />
                  </h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-grey-600">
                    {fileBeforePay
                      ? "eTax will file this return for you before opening the hosted eGovPay test gateway."
                      : "Continue to the hosted eGovPay test gateway to pay your tax amount."}
                  </p>
                  <div className="mt-4 rounded-lg bg-grey-100 p-4">
                    <p className="text-xs font-bold uppercase text-grey-500">
                      Amount to pay
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-grey-900">
                      {formattedTaxAmountPayable}
                    </p>
                  </div>
                  {params?.payment === "unavailable" ? (
                    <p className="mt-4 rounded-lg bg-error-500/10 p-3 text-sm font-semibold text-error-500">
                      eGovPay could not create the payment link. Try again in a moment.
                    </p>
                  ) : null}
                  {params?.payment === "already-paid" ? (
                    <p className="mt-4 rounded-lg bg-primary-50 p-3 text-sm font-semibold text-primary-900">
                      This filing is already marked as paid.
                    </p>
                  ) : null}
                  <div className="mt-5 grid gap-2">
                    <EgovPayCheckoutForm
                      fileBeforePay={fileBeforePay}
                      pendingLabel={
                        fileBeforePay
                          ? "Filing then opening eGovPay..."
                          : "Opening eGovPay..."
                      }
                      quarter={selectedQuarter}
                    />
                    <Link
                      className={buttonClass("secondary")}
                      href={`/filing?quarter=${selectedQuarter}&view=bir-form`}
                    >
                      <FileText size={18} aria-hidden />
                      Back to BIR Form
                    </Link>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-grey-500">
                    <ShieldCheck aria-hidden size={14} />
                    Test mode · No live funds are moved
                  </div>
                </div>
              </aside>
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
            {filingNotice ? (
              <p className="rounded-xl bg-primary-50 p-4 text-sm font-semibold text-primary-900">
                {filingNotice}
              </p>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-grey-300 bg-grey-100">
              <iframe
                className="h-[720px] w-full bg-white"
                src={pdfPreviewFitUrl}
                title={`${selectedQuarterMeta.label} Form ${selectedQuarterMeta.formCode} PDF preview`}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <FileTaxReturnForm quarter={selectedQuarter} />
              <Link
                className={buttonClass("soft")}
                href={`/filing?quarter=${selectedQuarter}&view=payment`}
              >
                <CreditCard size={18} aria-hidden />
                Pay
              </Link>
              <Link
                className={buttonClass("primary")}
                href={`/filing?quarter=${selectedQuarter}&view=payment&flow=file-and-pay`}
              >
                <CreditCard size={18} aria-hidden />
                File &amp; Pay
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
