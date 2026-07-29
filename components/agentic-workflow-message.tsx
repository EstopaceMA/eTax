"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  FileText,
  Loader2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  approveFilingHandoff,
  confirmComputationReview,
  confirmIncomeRecord,
  recordFilingAcknowledgement,
} from "@/app/actions/agentic";
import { uploadIncomeRecord } from "@/app/actions/workspace";
import { EgovPayCheckoutForm } from "@/components/egovpay-checkout-form";
import { buttonClass } from "@/components/ui/button";
import type {
  AgenticSessionEvent,
  AgenticSnapshotResponse,
  AgenticTimelineItem,
} from "@/lib/agentic/types";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function SummaryCard({
  expanded,
  item,
  readOnly,
  onToggle,
}: {
  expanded: boolean;
  item: AgenticTimelineItem;
  readOnly: boolean;
  onToggle: () => void;
}) {
  const completed = item.state === "completed";

  return (
    <article
      className={[
        "mt-3 overflow-hidden rounded-xl border bg-white shadow-[0_8px_24px_rgba(20,26,33,0.05)]",
        completed ? "border-success-500/25" : "border-grey-300",
      ].join(" ")}
    >
      <button
        aria-expanded={expanded}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-grey-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
        onClick={onToggle}
        type="button"
      >
        <span
          className={[
            "grid size-8 shrink-0 place-items-center rounded-full",
            completed
              ? "bg-success-500/10 text-success-500"
              : "bg-grey-200 text-grey-600",
          ].join(" ")}
        >
          <CheckCircle2 aria-hidden size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-grey-800">
            {item.title}
          </span>
          <span
            className={[
              "mt-0.5 block text-xs font-medium",
              completed ? "text-success-500" : "text-grey-500",
            ].join(" ")}
          >
            {completed ? "Completed" : readOnly ? "Earlier period context" : "Current step"}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary-700">
          {expanded ? "Hide details" : "View details"}
          {expanded ? (
            <ChevronUp aria-hidden size={15} />
          ) : (
            <ChevronDown aria-hidden size={15} />
          )}
        </span>
      </button>
      {expanded ? (
        <dl className="grid gap-2 border-t border-grey-300 bg-grey-50 px-4 py-3 sm:grid-cols-2">
          {item.summary.map(({ label, value }) => (
            <div
              className="rounded-lg border border-grey-300 bg-white p-3"
              key={label}
            >
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-grey-500">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-grey-800">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function AgenticWorkflowMessage({
  error,
  event,
  expanded,
  interactive,
  isMutating,
  item,
  onClose,
  onRunMutation,
  onToggle,
  snapshot,
}: {
  error: string | null;
  event: Extract<AgenticSessionEvent, { kind: "workflow_stage" }>;
  expanded: boolean;
  interactive: boolean;
  isMutating: boolean;
  item: AgenticTimelineItem;
  onClose?: () => void;
  onRunMutation: (
    action: () => Promise<{ ok: boolean; error?: string } | void>,
  ) => void;
  onToggle: () => void;
  snapshot: AgenticSnapshotResponse;
}) {
  const plan = snapshot.plan;
  const quarter = event.quarter ?? plan.period.quarter;
  const taskBlock = item.block;

  function chatFormData(form?: HTMLFormElement) {
    const formData = form ? new FormData(form) : new FormData();
    formData.set("quarter", String(quarter));
    formData.set("source", "agentic-chat");
    return formData;
  }

  return (
    <div className="flex scroll-mt-4 items-start gap-3 outline-none">
      {item.state === "completed" ? (
        <Image
          alt=""
          aria-hidden="true"
          className="size-8 shrink-0 object-contain"
          height={32}
          src="/eTaxPHCheckIcon.svg"
          unoptimized
          width={32}
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-500 text-white">
          <Sparkles aria-hidden size={16} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="pt-1 text-sm leading-6 text-grey-700">{item.narration}</p>

        {item.state === "completed" || !interactive ? (
          <SummaryCard
            expanded={expanded}
            item={item}
            onToggle={onToggle}
            readOnly={!interactive}
          />
        ) : taskBlock ? (
          <section className="mt-3 overflow-hidden rounded-xl border border-grey-300 bg-white shadow-[0_12px_30px_rgba(20,26,33,0.07)]">
            <div className="border-b border-grey-300 bg-primary-950 px-4 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-300">
                    {plan.task.owner_agent}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-grey-300">
                    {plan.task.reason}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase text-grey-300">
                  {plan.task.risk_level} risk
                </span>
              </div>
            </div>

            <div className="p-4">
              {taskBlock.type === "locked_period" ? (
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <LockKeyhole
                      aria-hidden
                      className="mt-0.5 shrink-0 text-warning-500"
                      size={21}
                    />
                    <div>
                      <p className="font-semibold text-grey-800">Preview only</p>
                      <p className="mt-1 text-sm leading-6 text-grey-600">
                        {taskBlock.reason}
                      </p>
                      <p className="mt-2 text-xs font-medium text-grey-500">
                        Opens {formatDate(taskBlock.opensOn)}
                      </p>
                    </div>
                  </div>
                  <Link
                    className={buttonClass("secondary")}
                    href={`/filing?quarter=${quarter}`}
                  >
                    Preview requirements
                  </Link>
                </div>
              ) : null}

              {taskBlock.type === "record_upload" ? (
                <form
                  className="grid gap-3"
                  onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    const form = submitEvent.currentTarget;
                    onRunMutation(async () => {
                      await uploadIncomeRecord(chatFormData(form));
                      form.reset();
                    });
                  }}
                >
                  <label className="grid gap-2 text-sm font-semibold text-grey-800">
                    Income record
                    <input
                      accept="image/*,application/pdf"
                      className="block w-full rounded-lg border border-grey-300 bg-grey-50 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-900"
                      name="file"
                      required
                      type="file"
                    />
                  </label>
                  <button
                    className={buttonClass("primary")}
                    disabled={isMutating}
                    type="submit"
                  >
                    {isMutating ? (
                      <Loader2 aria-hidden className="animate-spin" size={18} />
                    ) : (
                      <Upload aria-hidden size={18} />
                    )}
                    {isMutating ? "Reading record…" : "Upload and extract"}
                  </button>
                  <p className="text-xs leading-5 text-grey-500">
                    Images and PDFs are extracted provisionally. You confirm every
                    amount.
                  </p>
                </form>
              ) : null}

              {taskBlock.type === "record_confirmation" ? (
                <div className="grid gap-3">
                  {plan.records
                    .filter(({ id }) => taskBlock.recordIds.includes(id))
                    .map((record) => (
                      <form
                        className="grid gap-3 rounded-lg border border-grey-300 bg-grey-50 p-3"
                        key={record.id}
                        onSubmit={(submitEvent) => {
                          submitEvent.preventDefault();
                          onRunMutation(() =>
                            confirmIncomeRecord(
                              chatFormData(submitEvent.currentTarget),
                            ),
                          );
                        }}
                      >
                        <input name="id" type="hidden" value={record.id} />
                        <div className="flex items-start gap-3">
                          <FileText
                            aria-hidden
                            className="mt-0.5 shrink-0 text-primary-500"
                            size={20}
                          />
                          <div className="min-w-0">
                            <p className="break-all text-sm font-semibold text-grey-800">
                              {record.original_filename}
                            </p>
                            <p className="mt-1 text-xs font-medium text-grey-500">
                              {record.extraction_confidence
                                ? `${Math.round(record.extraction_confidence * 100)}% extraction confidence`
                                : "Amount needs review"}
                            </p>
                          </div>
                        </div>
                        <label className="grid gap-1.5 text-xs font-semibold uppercase text-grey-500">
                          Confirmed income
                          <input
                            className="min-h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-800"
                            defaultValue={record.total_income ?? ""}
                            min="0"
                            name="total_income"
                            required
                            step="0.01"
                            type="number"
                          />
                        </label>
                        <button
                          className={buttonClass("secondary")}
                          disabled={isMutating}
                          type="submit"
                        >
                          <CheckCircle2 aria-hidden size={18} />
                          Confirm this amount
                        </button>
                      </form>
                    ))}
                </div>
              ) : null}

              {taskBlock.type === "computation_review" && plan.computation ? (
                <div className="grid gap-4">
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-primary-50 p-3">
                      <dt className="text-[10px] font-semibold uppercase text-primary-700">
                        Recorded income
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-grey-800">
                        {money(plan.computation.input_snapshot.totalIncome)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-primary-500 p-3 text-white">
                      <dt className="text-[10px] font-semibold uppercase text-primary-100">
                        Demo amount
                      </dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {money(plan.computation.output_snapshot.amountPayable)}
                      </dd>
                    </div>
                  </dl>
                  <div className="border-l-4 border-warning-500 bg-warning-500/10 px-3 py-2 text-xs leading-5 text-grey-700">
                    Illustrative 6% rule only. No deductions, credits, prior payments,
                    or official assessment.
                  </div>
                  <button
                    className={buttonClass("primary")}
                    disabled={isMutating}
                    onClick={() =>
                      onRunMutation(() =>
                        confirmComputationReview(chatFormData()),
                      )
                    }
                    type="button"
                  >
                    <FileCheck2 aria-hidden size={18} />I reviewed this computation
                  </button>
                  <Link
                    className={`${buttonClass("secondary")} justify-center`}
                    href={`/filing?quarter=${quarter}&view=review`}
                    onClick={onClose}
                  >
                    Open PDF and full trace
                  </Link>
                </div>
              ) : null}

              {taskBlock.type === "filing_approval" && plan.computation ? (
                <div className="grid gap-4">
                  <dl className="grid gap-2 text-sm">
                    {[
                      ["Form", `BIR Form ${plan.period.formCode}`],
                      ["Period", plan.period.period],
                      [
                        "Amount",
                        money(plan.computation.output_snapshot.amountPayable),
                      ],
                      ["Effect", "Prepare guided hand-off only"],
                    ].map(([label, value]) => (
                      <div
                        className="flex justify-between gap-3 border-b border-grey-200 pb-2"
                        key={label}
                      >
                        <dt className="text-grey-500">{label}</dt>
                        <dd className="text-right font-semibold text-grey-800">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs leading-5 text-grey-600">
                    This approval is bound to the exact return snapshot and does not
                    authorize payment.
                  </p>
                  <button
                    className={buttonClass("primary")}
                    disabled={isMutating}
                    onClick={() =>
                      onRunMutation(() =>
                        approveFilingHandoff(chatFormData()),
                      )
                    }
                    type="button"
                  >
                    <ShieldCheck aria-hidden size={18} />
                    Approve exact hand-off
                  </button>
                </div>
              ) : null}

              {taskBlock.type === "filing_acknowledgement" ? (
                <form
                  className="grid gap-3"
                  onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    onRunMutation(() =>
                      recordFilingAcknowledgement(
                        chatFormData(submitEvent.currentTarget),
                      ),
                    );
                  }}
                >
                  <label className="grid gap-2 text-sm font-semibold text-grey-800">
                    Filing acknowledgement
                    <input
                      className="min-h-11 rounded-lg border border-grey-300 bg-grey-50 px-3 text-sm"
                      minLength={6}
                      name="reference"
                      placeholder="BIR acknowledgement reference"
                      required
                    />
                  </label>
                  <button
                    className={buttonClass("primary")}
                    disabled={isMutating}
                    type="submit"
                  >
                    <ReceiptText aria-hidden size={18} />
                    Save filing evidence
                  </button>
                </form>
              ) : null}

              {taskBlock.type === "payment_approval" ? (
                <div className="grid gap-4">
                  <div className="rounded-lg border border-warning-500/25 bg-warning-500/10 p-3 text-sm leading-6 text-grey-700">
                    Filing approval never authorizes payment. Review the exact
                    taxpayer, period, form, and amount before opening eGovPay.
                  </div>
                  <EgovPayCheckoutForm
                    label="Approve and open eGovPay"
                    pendingLabel="Preparing approved hand-off…"
                    quarter={quarter}
                  />
                </div>
              ) : null}

              {taskBlock.type === "payment_pending" ? (
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                  <p className="text-sm font-semibold text-grey-800">
                    Waiting for payment confirmation
                  </p>
                  <p className="mt-1 text-sm leading-6 text-grey-600">
                    No receipt upload is needed. This filing completes automatically
                    when eGovPay confirms the payment.
                  </p>
                </div>
              ) : null}

              {taskBlock.type === "exception" ? (
                <div className="grid gap-4">
                  <div className="flex items-start gap-3 text-sm leading-6 text-grey-700">
                    <AlertTriangle
                      aria-hidden
                      className="mt-1 shrink-0 text-warning-500"
                      size={20}
                    />
                    {taskBlock.message}
                  </div>
                  <Link
                    className={buttonClass("secondary")}
                    href={plan.task.action_href}
                    onClick={onClose}
                  >
                    Review exception
                  </Link>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {error && interactive ? (
          <div
            aria-live="polite"
            className="mt-3 flex items-start gap-2 rounded-xl border border-error-500/25 bg-white p-3 text-sm text-grey-700"
            role="status"
          >
            <AlertTriangle
              aria-hidden
              className="mt-0.5 shrink-0 text-error-500"
              size={17}
            />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
