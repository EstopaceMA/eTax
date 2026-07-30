import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
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
  FilingAcknowledgementForm,
} from "@/components/agentic-workflow";
import { EgovPayCheckoutForm } from "@/components/egovpay-checkout-form";
import { HelpTip } from "@/components/help-tip";
import { PdfDownloadOptions } from "@/components/pdf-download-options";
import { StatusBadge } from "@/components/status";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AgenticStep } from "@/lib/agentic/domain";
import { getAgenticPlan } from "@/lib/agentic/orchestrator";
import { getWorkspaceData } from "@/lib/data";
import {
  filingQuarters,
  getLatestOpenQuarter,
  isFilingPeriodOpen,
  parseFilingQuarter,
} from "@/lib/filing-periods";
import { formatDate, peso } from "@/lib/utils";

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

  if (normalizedLabel.includes("record") || normalizedLabel.includes("count")) {
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

function traceLineCode(label: string) {
  const match = label.match(/\(Item (\d+)\)/);

  if (match) {
    return match[1];
  }

  if (label === "Covered period") {
    return "Period";
  }

  if (label === "Confirmed income records") {
    return "Count";
  }

  if (label === "Tax rate") {
    return "Rate";
  }

  return "";
}

function traceLabel(label: string) {
  return label.replace(/\s+\(Item \d+\)/, "");
}

function isMoneyTrace(item: { label: string; value: string | number }) {
  return typeof item.value === "number" && traceValue(item).startsWith("₱");
}

function traceHelpText(label: string) {
  if (label === "Covered period") {
    return "The filing quarter selected for this return.";
  }

  if (label === "Confirmed income records") {
    return "Only records you confirmed are included in the computation.";
  }

  if (label.includes("Sales/receipts")) {
    return "This is the confirmed gross income for the selected quarter and maps to Form 1701Q item 47.";
  }

  if (label.includes("prior quarters")) {
    return "This carries confirmed income from earlier quarters in the same taxable year.";
  }

  if (label.includes("Cumulative taxable income")) {
    return "This is current-quarter income plus prior-quarter income before the annual reduction.";
  }

  if (label.includes("Allowable reduction")) {
    return "The annual reduction is applied once against cumulative gross income for eligible taxpayers.";
  }

  if (label.includes("Taxable income to date")) {
    return "This is cumulative income after subtracting the annual reduction, floored at zero.";
  }

  if (label === "Tax rate") {
    return "The active 8% income tax option rate.";
  }

  if (label.includes("Tax due")) {
    return "The computed tax before subtracting tax payments or withholding credits.";
  }

  if (label.includes("Credited")) {
    return "Payments already recorded for earlier quarters reduce the amount still payable.";
  }

  if (label.includes("Tax payable")) {
    return "The amount currently payable after credits. This maps to Form 1701Q item 63.";
  }

  return null;
}

function traceAccentClass(label: string) {
  if (label.includes("Tax payable")) {
    return "border-primary-500";
  }

  return "border-transparent";
}

function traceBadgeClass(label: string) {
  if (label.includes("Tax payable")) {
    return "border-primary-500 bg-primary-500 text-white";
  }

  return "border-grey-300 bg-white text-grey-700";
}

function ComputationHelp() {
  const text =
    "eTax totals confirmed income for the quarter, adds prior-quarter income, subtracts the annual reduction once, applies the 8% rate, then credits payments already recorded for earlier quarters.";

  return (
    <HelpTip label="How is this computed?" text={text} />
  );
}

function displayComputationNote(note: string) {
  if (note === "No creditable tax withheld (BIR Form 2307) recorded for this quarter.") {
    return "No BIR Form 2307 withholding credit is recorded for this quarter.";
  }

  if (note.includes("eight_percent_gross")) {
    return "Uses the 8% option: cumulative gross sales/receipts less the annual reduction, then multiplied by 8%.";
  }

  if (note.startsWith("Computed under ")) {
    return note.replace("Computed under", "Rule source:");
  }

  return note;
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
  const notice = params?.notice
    ? notices[params.notice]
    : params?.payment === "completed"
      ? "Payment confirmed. The filing journey is complete."
      : null;
  const activeTask = plan.task.task_type;
  const computationIsDemo = plan.rule.status === "demo";

  // The view switcher carries workflow state too. It previously sat below a
  // JourneyProgress strip listing the same four labels, so the page showed two
  // near-identical rows — one navigable, one not.
  const views = [
    { key: "records", label: "Records", icon: ClipboardCheck, step: "collect_records" },
    { key: "review", label: "Review", icon: FileCheck2, step: "review_computation" },
    { key: "handoff", label: "Hand-off", icon: ShieldCheck, step: "approve_handoff" },
    { key: "payment", label: "Payment", icon: CreditCard, step: "approve_payment" },
  ] satisfies Array<{
    key: FilingView;
    label: string;
    icon: typeof ClipboardCheck;
    step: AgenticStep;
  }>;

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

      {/* Two columns on a phone rather than four at min-w-[680px], which forced
          a sideways scroll and clipped the last card mid-word. */}
      <div className="py-1">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
        <AgentPlanSummary plan={plan} />
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
          const complete =
            plan.tasks.find(({ task_type }) => task_type === item.step)?.state ===
            "completed";
          const Icon = complete ? CheckCircle2 : item.icon;

          return (
            <Link
              aria-current={selected ? "page" : undefined}
              className={[
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:flex-row sm:gap-1.5 sm:text-sm",
                selected
                  ? "bg-white text-primary-700 shadow-sm"
                  : complete
                    ? "text-success-500 hover:text-grey-900"
                    : "text-grey-600 hover:text-grey-900",
              ].join(" ")}
              href={`/filing?quarter=${selectedQuarter}&view=${item.key}`}
              key={item.key}
            >
              <Icon
                aria-hidden
                className={complete && !selected ? "text-success-500" : undefined}
                size={17}
              />
              <span className="truncate">
                {item.label}
                {complete ? <span className="sr-only"> (done)</span> : null}
              </span>
            </Link>
          );
        })}
      </nav>

      {selectedView === "records" ? (
        <Card className="space-y-4">
          {/*
            Read-only here. Records are added and verified on /records, which is
            visited far more often than a return is filed; this view exists so
            the evidence behind the computation is at hand while reviewing it.
          */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-primary-700">Evidence</p>
              <h2 className="mt-1 text-xl font-extrabold text-grey-900">Income records</h2>
              <p className="mt-1 text-sm leading-6 text-grey-600">
                Only confirmed records count towards the computation.
              </p>
            </div>
            <Link
              className={buttonClass("soft")}
              href={`/records?quarter=${selectedQuarter}`}
            >
              <Camera aria-hidden size={18} />
              Manage records
            </Link>
          </div>
          <div className="space-y-3">
            {selectedRecords.map((record) => (
              <article
                className="flex flex-col gap-4 rounded-lg border border-grey-300 bg-grey-50 p-3 sm:flex-row sm:items-start"
                key={record.id}
              >
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
                <div className="min-w-0 flex-1">
                  <StatusBadge status={record.extraction_status} />
                  <h3 className="mt-2 break-all font-extrabold text-grey-900">
                    {record.original_filename}
                  </h3>
                  <p className="mt-1 text-sm text-grey-600">
                    Uploaded {formatUploadDate(record.created_at)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-extrabold tabular-nums text-grey-900">
                  {record.total_income === null
                    ? "No total read"
                    : peso(record.total_income)}
                </p>
              </article>
            ))}
            {selectedRecords.length === 0 ? (
              <Link
                className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-grey-300 bg-grey-50 p-5 text-center transition hover:border-primary-500 hover:bg-primary-50"
                href={`/records?quarter=${selectedQuarter}`}
              >
                <span className="text-sm font-bold text-grey-800">
                  No income records yet
                </span>
                <span className="text-xs font-semibold text-grey-600">
                  Add at least one to start the review.
                </span>
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      {selectedView === "review" ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="min-w-0 space-y-5">
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
                  ].map(([label, value], index) => (
                    <div
                      className="calculation-reveal border-b border-grey-300 pb-3"
                      key={label}
                      style={{ animationDelay: `${index * 55}ms` }}
                    >
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase text-grey-500">
                        {label}
                        {label === "Amount payable" ? <ComputationHelp /> : null}
                      </dt>
                      <dd
                        className={[
                          "mt-1 break-words font-extrabold text-grey-900",
                          label === "Recorded income" || label === "Amount payable"
                            ? // Monospace digits are wide; step down on phones.
                              "money-figure text-xl text-primary-900 sm:text-2xl"
                            : "",
                        ].join(" ")}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div
                  className="calculation-reveal overflow-hidden rounded-lg border border-grey-300 bg-white"
                  style={{ animationDelay: "360ms" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-300 bg-grey-50 px-4 py-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-primary-700">
                        Computation ledger
                      </p>
                      <h3 className="mt-0.5 text-base font-extrabold text-grey-900">
                        Form 1701Q Schedule II/III
                      </h3>
                    </div>
                  </div>
                  <div className="ledger-scroll max-h-[360px] overflow-auto">
                    <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
                      <colgroup>
                        <col className="w-14 sm:w-24" />
                        <col />
                        <col className="w-28 sm:w-40" />
                      </colgroup>
                      <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#dfe3e8]">
                        <tr>
                          <th className="px-2 py-2 text-left text-[11px] sm:px-4 font-bold uppercase text-grey-500">
                            Line
                          </th>
                          <th className="px-2 py-2 text-left text-[11px] sm:px-4 font-bold uppercase text-grey-500">
                            Description
                          </th>
                          <th className="px-2 py-2 text-right text-[11px] sm:px-4 font-bold uppercase text-grey-500">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.computation.trace.filter((item) => item.label !== "Rounding").map((item, index) => {
                          const code = traceLineCode(item.label);
                          const value = traceValue(item);
                          const moneyValue = isMoneyTrace(item);
                          const helpText = traceHelpText(item.label);

                          return (
                            <tr
                              className={[
                                "calculation-reveal border-b border-grey-200",
                                item.label.includes("Tax payable")
                                  ? "bg-primary-50"
                                  : index % 2 === 0 ? "bg-white" : "bg-grey-50/70",
                              ].join(" ")}
                              key={item.label}
                              style={{ animationDelay: `${430 + index * 35}ms` }}
                            >
                              <td
                                className={[
                                  "border-b border-l-4 border-grey-200 px-2 py-3 align-middle sm:px-4",
                                  traceAccentClass(item.label),
                                ].join(" ")}
                              >
                                {code ? (
                                  <span
                                    className={[
                                      "inline-flex h-7 min-w-9 items-center justify-center rounded-md border px-1.5 text-xs font-black sm:min-w-14 sm:px-2",
                                      traceBadgeClass(item.label),
                                    ].join(" ")}
                                  >
                                    {code}
                                  </span>
                                ) : (
                                  <span aria-hidden className="block h-7 min-w-9 sm:min-w-14" />
                                )}
                              </td>
                              <td className="border-b border-grey-200 px-2 py-3 align-middle font-semibold text-grey-700 sm:px-4">
                                <span className="flex min-w-0 flex-col gap-1">
                                  <span className="inline-flex min-w-0 items-center gap-2">
                                    <span>{traceLabel(item.label)}</span>
                                    {helpText ? (
                                      <HelpTip label={traceLabel(item.label)} text={helpText} />
                                    ) : null}
                                  </span>
                                </span>
                              </td>
                              <td
                                className={[
                                  "border-b border-grey-200 px-2 py-3 text-right align-middle sm:px-4",
                                  moneyValue
                                    ? "money-figure text-base font-black text-grey-900"
                                    : "font-bold text-grey-800",
                                ].join(" ")}
                              >
                                {value}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="calculation-reveal rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
                  <p className="text-sm font-extrabold text-grey-900">Calculation notes</p>
                  <ul className="mt-2 space-y-2">
                    {plan.computation.assumptions.map((assumption) => (
                      <li className="text-sm leading-6 text-grey-700" key={assumption}>
                        {displayComputationNote(assumption)}
                      </li>
                    ))}
                  </ul>
                </div>
                {activeTask === "review_computation" ? (
                  <div className="sticky bottom-3 z-20">
                    <ConfirmComputationForm
                      isDemo={computationIsDemo}
                      quarter={selectedQuarter}
                    />
                  </div>
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
            <details className="group rounded-lg border border-grey-300 bg-grey-50 p-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
                <span>
                  <span className="block text-xs font-bold uppercase text-primary-700">
                    Ruleset used
                  </span>
                  <span className="mt-2 block font-extrabold leading-6 text-grey-900">
                    {plan.rule.title}
                  </span>
                </span>
                <span className="mt-0.5 shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary-700">
                  Details
                </span>
              </summary>
              <dl className="mt-4 space-y-3 border-t border-grey-300 pt-4 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase text-grey-500">Version</dt>
                  <dd className="mt-1 break-all font-semibold text-grey-800">{plan.rule.version}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-grey-500">Source</dt>
                  <dd className="mt-1 font-semibold leading-6 text-grey-800">
                    {plan.rule.sourceTitle}
                  </dd>
                </div>
              </dl>
            </details>
          </aside>
        </div>
      ) : null}

      {selectedView === "handoff" ? (
        <Card className="min-w-0 space-y-5">
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
                <dd className="mt-1 break-words text-sm font-extrabold text-grey-900">
                  {value}
                </dd>
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
            <div className="flex items-start gap-3 rounded-lg bg-success-500/10 p-4">
              <CheckCircle2 aria-hidden className="shrink-0 text-success-500" size={20} />
              <div className="min-w-0">
                <p className="font-extrabold text-grey-900">Acknowledgement saved</p>
                <p className="mt-1 break-all text-sm text-grey-700">
                  {plan.draft.acknowledgement_reference}
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {selectedView === "payment" ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="min-w-0 space-y-5">
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
                  <dd className="mt-1 break-words text-sm font-extrabold text-grey-900">
                  {value}
                </dd>
                </div>
              ))}
            </dl>
            {activeTask === "approve_payment" && !plan.payment.approvalRecorded ? (
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
            {plan.payment.approvalRecorded && !plan.payment.completed ? (
              <div className="border border-primary-200 bg-primary-50 p-4">
                <p className="font-semibold text-grey-800">Waiting for payment confirmation</p>
                <p className="mt-1 text-sm leading-6 text-grey-600">
                  No receipt upload is needed. This filing completes automatically when eGovPay
                  confirms the payment.
                </p>
              </div>
            ) : null}
            {plan.progress === 100 ? (
              <div className="flex items-start gap-3 rounded-lg bg-success-500/10 p-4">
                <CheckCircle2 aria-hidden className="shrink-0 text-success-500" size={22} />
                <div className="min-w-0">
                  <p className="font-extrabold text-grey-900">Filing journey complete</p>
                  <p className="mt-1 text-sm leading-6 text-grey-700">
                    Filing acknowledgement and payment confirmation are recorded in the audit
                    trail.
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
              Controlled test hand-off. A confirmed payment completes the filing automatically.
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
