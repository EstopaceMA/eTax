import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  AgentPlanSummary,
  ApproveHandoffForm,
  ConfirmComputationForm,
  ConfirmIncomeRecordForm,
  FilingAcknowledgementForm,
  JourneyProgress,
  PaymentProofForm,
} from "@/components/agentic-workflow";
import { EgovPayCheckoutForm } from "@/components/egovpay-checkout-form";
import { PdfDownloadOptions } from "@/components/pdf-download-options";
import {
  DeleteIncomeRecordForm,
  IncomeRecordTotalForm,
  IncomeRecordUploadForm,
} from "@/components/income-record-forms";
import { StatusBadge } from "@/components/status";
import { Card } from "@/components/ui/card";
import { getAgenticPlan } from "@/lib/agentic/orchestrator";
import { getWorkspaceData } from "@/lib/data";
import {
  filingQuarters,
  getLatestOpenQuarter,
  isFilingPeriodOpen,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { formatDate } from "@/lib/utils";

type FilingView = "records" | "review" | "handoff" | "payment";

function parseFilingView(value: string | undefined): FilingView {
  if (value === "documents") {
    return "records";
  }

  if (value === "bir-form") {
    return "review";
  }

  if (value === "records" || value === "handoff" || value === "payment") {
    return value;
  }

  return "review";
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    style: "currency",
  }).format(value);
}

function traceValue(item: { label: string; value: string | number }) {
  if (typeof item.value !== "number") {
    return item.value;
  }

  const normalizedLabel = item.label.toLowerCase();
  const countLabels = ["count", "record"];

  if (countLabels.some((label) => normalizedLabel.includes(label))) {
    return item.value.toLocaleString("en-PH");
  }

  const moneyLabels = [
    "amount",
    "income",
    "paid",
    "payable",
    "payments",
    "receipts",
    "reduction",
    "revenues",
    "sales",
    "tax due",
  ];

  return moneyLabels.some((label) => normalizedLabel.includes(label))
    ? money(item.value)
    : item.value.toLocaleString("en-PH");
}

function formatUploadDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const notices: Record<string, string> = {
  "record-confirmed": "The extracted value is confirmed and available to the computation agent.",
  "review-confirmed": "Your review is saved. The exact filing hand-off is ready for approval.",
  "handoff-approved": "The hand-off was approved. Add the official-channel acknowledgement after filing.",
  "acknowledgement-recorded": "Filing acknowledgement saved. Payment now requires separate approval.",
  "payment-verified": "Payment proof saved. The controlled filing journey is complete.",
  "record-locked": "This record is part of a handed-off return. The change was blocked and an exception was opened.",
};

export default async function FilingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    notice?: string;
    payment?: string;
    quarter?: string;
    view?: string;
  }>;
}) {
  const [params, data] = await Promise.all([
    searchParams,
    getWorkspaceData(),
  ]);
  const requestedQuarter = parseFilingQuarter(params?.quarter ?? null);
  const requestedMeta =
    filingQuarters.find(({ quarter }) => quarter === requestedQuarter) ?? filingQuarters[1];
  const selectedQuarter = isFilingPeriodOpen(requestedMeta.opensOn)
    ? requestedQuarter
    : getLatestOpenQuarter();
  const selectedMeta =
    filingQuarters.find(({ quarter }) => quarter === selectedQuarter) ?? filingQuarters[1];
  const selectedView = parseFilingView(params?.view);
  const plan = await getAgenticPlan(selectedQuarter);
  const obligations = filingQuarters.map((quarter) => ({
    ...quarter,
    obligation: data.filingObligations.find(({ period }) =>
      [quarter.period, ...(quarter.periodAliases ?? [])].includes(period),
    ),
  }));
  const selectedObligation = obligations.find(
    ({ quarter }) => quarter === selectedQuarter,
  )?.obligation;
  const selectedRecords = data.incomeRecordUploads.filter((record) =>
    [selectedMeta.period, ...(selectedMeta.periodAliases ?? [])].includes(record.period),
  );
  const pdfUrl = `/api/filing/pdf?quarter=${selectedQuarter}`;
  const notice = params?.notice ? notices[params.notice] : null;
  const paymentReturned = params?.payment === "proof-required";
  const activeTask = plan.task.task_type;
  const computationIsDemo = plan.rule.status === "demo";

  const views = [
    { key: "records", label: "Records", icon: ClipboardCheck },
    { key: "review", label: "Review", icon: FileCheck2 },
    { key: "handoff", label: "Hand-off", icon: ShieldCheck },
    { key: "payment", label: "Payment", icon: CreditCard },
  ] satisfies Array<{ key: FilingView; label: string; icon: typeof ClipboardCheck }>;

  return (
    <div className="space-y-4">
      <header className="border-b border-grey-300 pb-4">
        <p className="text-xs font-bold uppercase text-primary-700">Controlled filing pilot</p>
        <h1 className="mt-1 text-2xl font-black leading-tight text-grey-900 md:text-3xl">
          Quarterly filing workspace
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-grey-600">
          Agents prepare each step. You verify the evidence and approve material actions.
        </p>
      </header>

      <div className="scrollbar-hidden overflow-x-auto overscroll-x-contain px-3 py-1 [scroll-padding-inline:12px] md:px-0">
        <div className="grid min-w-[680px] grid-cols-4 gap-2">
          {obligations.map(({ label, opensOn, dueDate, quarter, obligation }) => {
            const selected = quarter === selectedQuarter;
            const open = isFilingPeriodOpen(opensOn);

            return open ? (
              <Link
                className={[
                  "flex min-h-16 items-center justify-between gap-2 rounded-lg border px-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                  selected
                    ? "border-primary-500 bg-primary-500 text-white shadow-[0_6px_14px_rgba(7,92,247,0.18)]"
                    : "border-grey-300 bg-white text-grey-700 hover:border-primary-300",
                ].join(" ")}
                href={`/filing?quarter=${quarter}&view=${selectedView}`}
                key={quarter}
              >
                <span>
                  <span className="block text-sm font-extrabold">{label}</span>
                  <span
                    className={`mt-1 block text-xs font-bold ${
                      selected ? "text-primary-50" : "text-grey-500"
                    }`}
                  >
                    Due {formatDate(obligation?.due_date ?? dueDate)}
                  </span>
                </span>
                <CalendarDays aria-hidden size={18} />
              </Link>
            ) : (
              <div
                aria-disabled="true"
                className="flex min-h-16 items-center justify-between rounded-lg border border-grey-200 bg-grey-50 px-3 text-grey-400"
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

      {plan.period.isOpen ? (
        <>
          <JourneyProgress tasks={plan.tasks} />
          <AgentPlanSummary plan={plan} />
        </>
      ) : (
        <div className="flex items-start gap-3 border border-warning-500/30 bg-warning-500/10 p-4 text-sm text-grey-700">
          <AlertTriangle aria-hidden className="mt-0.5 shrink-0 text-warning-500" size={18} />
          {plan.period.lockedReason}
        </div>
      )}

      {notice ? (
        <p className="flex items-start gap-2 border border-success-500/25 bg-success-500/10 p-3 text-sm font-semibold text-grey-800">
          <CheckCircle2 aria-hidden className="mt-0.5 shrink-0 text-success-500" size={17} />
          {notice}
        </p>
      ) : null}

      <nav
        aria-label="Filing workspace views"
        className="grid grid-cols-4 overflow-hidden rounded-lg border border-grey-300 bg-grey-100 p-1"
      >
        {views.map((item) => {
          const selected = item.key === selectedView;

          return (
            <Link
              aria-current={selected ? "page" : undefined}
              className={[
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:flex-row sm:text-sm",
                selected
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-grey-500 hover:text-grey-900",
              ].join(" ")}
              href={`/filing?quarter=${selectedQuarter}&view=${item.key}`}
              key={item.key}
            >
              <item.icon aria-hidden size={17} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {selectedView === "records" ? (
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-primary-700">Evidence</p>
            <h2 className="mt-1 text-xl font-extrabold text-grey-900">Income records</h2>
            <p className="mt-1 text-sm leading-6 text-grey-600">
              Extracted values remain provisional until you confirm them.
            </p>
          </div>
          <IncomeRecordUploadForm
            existingFilenames={selectedRecords.map(({ original_filename }) => original_filename)}
            quarter={selectedQuarter}
          />
          <div className="space-y-3">
            {selectedRecords.map((record) => (
              <article
                className="grid gap-4 rounded-lg border border-grey-300 bg-grey-50 p-3 lg:grid-cols-[104px_1fr_260px] lg:items-start"
                key={record.id}
              >
                <div className="overflow-hidden rounded-lg border border-grey-300 bg-white">
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
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={record.extraction_status} />
                    {record.extraction_confidence ? (
                      <span className="text-xs font-bold text-grey-500">
                        {Math.round(record.extraction_confidence * 100)}% confidence
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 break-all font-extrabold text-grey-900">
                    {record.original_filename}
                  </h3>
                  <p className="mt-1 text-sm text-grey-600">
                    Uploaded {formatUploadDate(record.created_at)}
                  </p>
                  {record.extraction_status === "confirmed" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
                  ) : null}
                </div>
                {record.extraction_status === "confirmed" ? (
                  <div className="flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm font-bold text-grey-800">
                    <CheckCircle2 aria-hidden className="text-success-500" size={19} />
                    Verified evidence
                  </div>
                ) : (
                  <ConfirmIncomeRecordForm quarter={selectedQuarter} record={record} />
                )}
              </article>
            ))}
            {selectedRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed border-grey-300 bg-grey-50 p-5 text-sm font-semibold text-grey-600">
                No income records yet. Add at least one file to start the agentic review.
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {selectedView === "review" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-primary-700">
                  {computationIsDemo ? "Demo computation" : "Tax computation"}
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-grey-900">
                  {selectedMeta.period} return review
                </h2>
              </div>
              <span className="rounded-full bg-warning-500/10 px-3 py-1 text-xs font-bold text-grey-800">
                Not official tax advice
              </span>
            </div>
            {plan.computation && plan.draft ? (
              <>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Period", plan.computation.input_snapshot.period],
                    ["Form", `BIR Form ${selectedMeta.formCode}`],
                    ["Confirmed records", String(plan.computation.input_snapshot.recordIds.length)],
                    ["Recorded income", money(plan.computation.input_snapshot.totalIncome)],
                    ["Amount payable", money(plan.computation.output_snapshot.amountPayable)],
                    ["Rule version", plan.rule.version],
                  ].map(([label, value]) => (
                    <div className="border-b border-grey-300 pb-3" key={label}>
                      <dt className="text-xs font-bold uppercase text-grey-500">{label}</dt>
                      <dd className="mt-1 font-extrabold text-grey-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <h3 className="text-sm font-extrabold text-grey-900">Computation trace</h3>
                  <ol className="mt-3 space-y-2">
                    {plan.computation.trace.map((item) => (
                      <li
                        className="flex items-center justify-between gap-3 border-b border-grey-200 pb-2 text-sm"
                        key={item.label}
                      >
                        <span className="text-grey-600">{item.label}</span>
                        <span className="text-right font-bold text-grey-900">
                          {traceValue(item)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="border-l-4 border-warning-500 bg-warning-500/10 px-4 py-3">
                  <p className="text-sm font-extrabold text-grey-900">Material assumptions</p>
                  {plan.computation.assumptions.map((assumption) => (
                    <p className="mt-1 text-sm leading-6 text-grey-700" key={assumption}>
                      {assumption}
                    </p>
                  ))}
                </div>
                {activeTask === "review_computation" ? (
                  <ConfirmComputationForm
                    isDemo={computationIsDemo}
                    quarter={selectedQuarter}
                  />
                ) : null}
              </>
            ) : (
              <p className="border border-dashed border-grey-300 p-4 text-sm text-grey-600">
                Confirm every income record before the deterministic computation can run.
              </p>
            )}
          </Card>
          <aside className="space-y-3">
            <PdfDownloadOptions formCode={selectedMeta.formCode} pdfUrl={pdfUrl} />
            <div className="rounded-lg border border-grey-300 bg-grey-50 p-4">
              <p className="text-xs font-bold uppercase text-grey-500">Authority</p>
              <p className="mt-2 font-extrabold text-grey-900">{plan.rule.title}</p>
              <p className="mt-2 text-sm leading-6 text-grey-600">{plan.rule.sourceTitle}</p>
            </div>
          </aside>
        </div>
      ) : null}

      {selectedView === "handoff" ? (
        <Card className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase text-primary-700">Material action</p>
            <h2 className="mt-1 text-xl font-extrabold text-grey-900">Filing hand-off</h2>
            <p className="mt-1 text-sm leading-6 text-grey-600">
              This pilot prepares a guided official-channel hand-off. It does not submit to the BIR.
            </p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Taxpayer", data.ssoProfile?.full_name || data.profile?.full_name || "Taxpayer"],
              ["TIN", data.ssoProfile?.tin_id ?? "Not provided"],
              ["Period", selectedMeta.period],
              ["Form", `BIR Form ${selectedMeta.formCode}`],
              ["Amount", money(plan.computation?.output_snapshot.amountPayable ?? 0)],
              ["Effect", "Prepare hand-off only"],
            ].map(([label, value]) => (
              <div className="rounded-lg border border-grey-300 bg-grey-50 p-3" key={label}>
                <dt className="text-xs font-bold uppercase text-grey-500">{label}</dt>
                <dd className="mt-1 text-sm font-extrabold text-grey-900">{value}</dd>
              </div>
            ))}
          </dl>
          {activeTask === "approve_handoff" ? (
            <div className="border-t border-grey-300 pt-5">
              <p className="mb-3 text-sm leading-6 text-grey-700">
                I approve this exact {selectedMeta.period} return snapshot for guided hand-off. This approval
                does not authorize payment.
              </p>
              <ApproveHandoffForm quarter={selectedQuarter} />
            </div>
          ) : null}
          {activeTask === "capture_acknowledgement" ? (
            <div className="border-t border-grey-300 pt-5">
              <h3 className="mb-3 font-extrabold text-grey-900">Preserve filing evidence</h3>
              <FilingAcknowledgementForm quarter={selectedQuarter} />
            </div>
          ) : null}
          {plan.draft?.acknowledgement_reference ? (
            <div className="flex items-start gap-3 bg-success-500/10 p-4">
              <CheckCircle2 aria-hidden className="shrink-0 text-success-500" size={20} />
              <div>
                <p className="font-extrabold text-grey-900">Acknowledgement saved</p>
                <p className="mt-1 text-sm text-grey-700">
                  {plan.draft.acknowledgement_reference}
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {selectedView === "payment" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase text-primary-700">Separate approval</p>
              <h2 className="mt-1 text-xl font-extrabold text-grey-900">Payment review</h2>
              <p className="mt-1 text-sm leading-6 text-grey-600">
                Filing approval never authorizes payment. Confirm this exact liability separately.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Tax type", `BIR Form ${selectedMeta.formCode}`],
                ["Period", selectedMeta.period],
                ["Amount", money(plan.computation?.output_snapshot.amountPayable ?? 0)],
                ["Channel", "eGovPay test gateway"],
                ["Filing acknowledgement", plan.draft?.acknowledgement_reference ?? "Required"],
                ["Payment status", selectedObligation?.payment_status ?? "unpaid"],
              ].map(([label, value]) => (
                <div className="border-b border-grey-300 pb-3" key={label}>
                  <dt className="text-xs font-bold uppercase text-grey-500">{label}</dt>
                  <dd className="mt-1 text-sm font-extrabold text-grey-900">{value}</dd>
                </div>
              ))}
            </dl>
            {activeTask === "approve_payment" ? (
              <div className="border-t border-grey-300 pt-5">
                <p className="mb-3 text-sm leading-6 text-grey-700">
                  I approve opening the test payment channel for the taxpayer, period, tax type,
                  and amount shown above.
                </p>
                <EgovPayCheckoutForm
                  label="Approve and open eGovPay"
                  pendingLabel="Preparing approved hand-off..."
                  quarter={selectedQuarter}
                />
              </div>
            ) : null}
            {paymentReturned ? (
              <div className="flex items-start gap-3 border border-warning-500/30 bg-warning-500/10 p-4">
                <AlertTriangle aria-hidden className="shrink-0 text-warning-500" size={20} />
                <p className="text-sm leading-6 text-grey-700">
                  The gateway returned to eTax, but that does not prove payment. Add a receipt or
                  validated reference to finish.
                </p>
              </div>
            ) : null}
            {activeTask === "capture_payment_proof" && plan.progress < 100 ? (
              <PaymentProofForm quarter={selectedQuarter} />
            ) : null}
            {plan.progress === 100 ? (
              <div className="flex items-start gap-3 bg-success-500/10 p-4">
                <CheckCircle2 aria-hidden className="shrink-0 text-success-500" size={22} />
                <div>
                  <p className="font-extrabold text-grey-900">Filing journey complete</p>
                  <p className="mt-1 text-sm leading-6 text-grey-700">
                    Filing acknowledgement and payment proof are preserved in the audit trail.
                  </p>
                </div>
              </div>
            ) : null}
          </Card>
          <aside className="rounded-lg border border-primary-200 bg-primary-50 p-4">
            <Image
              alt="eGovPay"
              className="h-auto w-[124px]"
              height={31}
              priority
              src="/egovpay-logo.webp"
              width={124}
            />
            <p className="mt-4 text-2xl font-black text-grey-900">
              {money(plan.computation?.output_snapshot.amountPayable ?? 0)}
            </p>
            <p className="mt-2 text-sm leading-6 text-grey-600">
              Controlled test hand-off. Payment remains pending until evidence is verified.
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
