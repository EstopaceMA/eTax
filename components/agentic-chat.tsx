"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  FileText,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  approveFilingHandoff,
  confirmComputationReview,
  confirmIncomeRecord,
  recordFilingAcknowledgement,
  uploadPaymentProof,
} from "@/app/actions/agentic";
import { uploadIncomeRecord } from "@/app/actions/workspace";
import { ChatbotIcon } from "@/components/chatbot-icon";
import { EgovPayCheckoutForm } from "@/components/egovpay-checkout-form";
import { AgenticTimelineSkeleton } from "@/components/loading-skeletons";
import { buttonClass } from "@/components/ui/button";
import { filingQuarters, type FilingQuarter } from "@/lib/filing-periods";
import type {
  AgenticAnswerFact,
  AgenticAnswerTopic,
  AgenticChatResponse,
  AgenticStage,
  AgenticSnapshotResponse,
  AgenticTimelineItem,
} from "@/lib/agentic/types";

const periodStorageKey = "etax-agentic-period-v1";

type AgenticMessage = {
  id: string;
  role: "agent" | "user";
  content: string;
  facts?: AgenticAnswerFact[];
  sourcePeriod?: string;
  switchToAsk?: boolean;
  topic?: AgenticAnswerTopic;
};

const welcomeMessage: AgenticMessage = {
  id: "agentic-welcome",
  role: "agent",
  content:
    "Ask me about this period’s records, amount, filing status, or next step. I’ll answer from the filing data shown above.",
};

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

function FilingPeriodMenu({
  clientReady,
  compact = false,
  plan,
  quarter,
  onSelect,
}: {
  clientReady: boolean;
  compact?: boolean;
  plan: AgenticSnapshotResponse["plan"] | undefined;
  quarter: FilingQuarter;
  onSelect: (quarter: FilingQuarter) => void;
}) {
  return (
    <div
      aria-label="Filing conversations"
      className={compact ? "grid grid-cols-4 gap-1.5" : "grid gap-1.5"}
    >
      {filingQuarters.map((period) => {
        const selected = period.quarter === quarter;
        const open =
          plan?.period.quarter === period.quarter
            ? plan.period.isOpen
            : clientReady
              ? new Date() >= new Date(`${period.opensOn}T00:00:00`)
              : null;

        return (
          <button
            aria-pressed={selected}
            className={[
              "flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
              compact ? "min-w-0 flex-col items-start gap-0 px-2" : "",
              selected
                ? "border-primary-500 bg-primary-50 text-primary-900"
                : "border-transparent text-grey-600 hover:border-grey-300 hover:bg-white",
            ].join(" ")}
            key={period.quarter}
            onClick={() => onSelect(period.quarter)}
            type="button"
          >
            <span
              className={[
                "grid size-8 shrink-0 place-items-center rounded-md text-xs font-black",
                compact ? "hidden" : "",
                selected ? "bg-primary-500 text-white" : "bg-grey-200 text-grey-600",
              ].join(" ")}
            >
              {period.quarter === 4 ? "A" : period.quarter}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black">
                {compact ? period.shortLabel : period.label}
              </span>
              <span className="mt-0.5 block text-[10px] font-bold text-grey-500">
                {open === null
                  ? "Checking availability"
                  : open
                    ? "Ready to work"
                    : "Preview only"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CompletedStageSummary({
  expanded,
  item,
  onToggle,
}: {
  expanded: boolean;
  item: AgenticTimelineItem;
  onToggle: () => void;
}) {
  return (
    <article className="mt-3 overflow-hidden rounded-xl border border-success-500/25 bg-white shadow-[0_8px_24px_rgba(20,26,33,0.05)]">
      <button
        aria-expanded={expanded}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-success-500/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
        onClick={onToggle}
        type="button"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success-500/10 text-success-500">
          <CheckCircle2 aria-hidden size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-grey-900">{item.title}</span>
          <span className="mt-0.5 block text-xs font-semibold text-success-500">Completed</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-bold text-primary-700">
          {expanded ? "Hide details" : "View details"}
          {expanded ? <ChevronUp aria-hidden size={15} /> : <ChevronDown aria-hidden size={15} />}
        </span>
      </button>
      {expanded ? (
        <dl className="grid gap-2 border-t border-grey-300 bg-grey-50 px-4 py-3 sm:grid-cols-2">
          {item.summary.map(({ label, value }) => (
            <div className="rounded-lg border border-grey-300 bg-white p-3" key={label}>
              <dt className="text-[10px] font-black uppercase tracking-wide text-grey-500">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-extrabold text-grey-900">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

function AgenticConversation({
  isSending,
  messages,
  onSwitchToAsk,
}: {
  isSending: boolean;
  messages: AgenticMessage[];
  onSwitchToAsk: () => void;
}) {
  return (
    <section
      aria-label="Conversation about this filing"
      className="mt-8 border-t border-grey-300 pt-5"
    >
      <div className="mb-5 flex items-center gap-2 text-grey-500">
        <MessageSquareText aria-hidden size={16} />
        <h2 className="text-[11px] font-black uppercase tracking-[0.14em]">
          Ask about this filing
        </h2>
      </div>

      <div aria-live="polite" className="space-y-5">
        {messages.map((message) => (
          <div
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex items-start gap-3"
            }
            key={message.id}
          >
            {message.role === "agent" ? (
              <span className="grid size-8 shrink-0 place-items-center">
                <ChatbotIcon size={30} />
              </span>
            ) : null}
            <div
              className={
                message.role === "user"
                  ? "max-w-[82%] rounded-2xl rounded-br-md bg-primary-500 px-4 py-3 text-sm leading-6 text-white shadow-sm"
                  : "min-w-0 max-w-[calc(100%-44px)] pt-1 text-sm leading-6 text-grey-700"
              }
            >
              {message.sourcePeriod ? (
                <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-primary-700">
                  Verified filing data · {message.sourcePeriod}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.facts?.length ? (
                <dl className="mt-3 grid gap-2 rounded-xl border border-primary-200 bg-white p-3 shadow-[0_8px_24px_rgba(20,26,33,0.05)] sm:grid-cols-2">
                  {message.facts.map(({ label, value }, index) => (
                    <div className="min-w-0" key={`${label}-${index}`}>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-grey-500">
                        {label}
                      </dt>
                      <dd className="break-words text-sm font-extrabold text-grey-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {message.switchToAsk ? (
                <button
                  className="mt-2 flex items-center gap-1 font-black text-primary-700"
                  onClick={onSwitchToAsk}
                  type="button"
                >
                  Open Ask eTax <ArrowRight aria-hidden size={14} />
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {isSending ? (
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center">
              <ChatbotIcon size={30} />
            </span>
            <div className="flex items-center gap-2 text-sm text-grey-600">
              <Loader2 aria-hidden className="animate-spin text-primary-500" size={16} />
              Reading the current filing data…
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AgenticChat({
  onClose,
  onSwitchToAsk,
}: {
  onClose?: () => void;
  onSwitchToAsk?: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMessageScrollMountedRef = useRef(false);
  const latestStageRef = useRef<HTMLDivElement>(null);
  const previousTimelineRef = useRef<string | null>(null);
  const skipNextQuarterLoadRef = useRef(false);
  const skipNextMessageScrollRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [quarter, setQuarter] = useState<FilingQuarter>(2);
  const [clientReady, setClientReady] = useState(false);
  const [snapshot, setSnapshot] = useState<AgenticSnapshotResponse | null>(null);
  const [messages, setMessages] = useState<AgenticMessage[]>([welcomeMessage]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<AgenticStage>>(
    () => new Set(),
  );

  const loadSnapshot = useCallback(async (selectedQuarter: FilingQuarter) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agentic/workflow?quarter=${selectedQuarter}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as AgenticSnapshotResponse & {
        error?: string;
      };

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error ?? "The filing workflow could not be loaded.");
      }

      setSnapshot(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The filing workflow could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(periodStorageKey));

    if (stored === 1 || stored === 2 || stored === 3 || stored === 4) {
      setQuarter(stored);
    }

    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) {
      return;
    }

    window.localStorage.setItem(periodStorageKey, String(quarter));

    if (skipNextQuarterLoadRef.current) {
      skipNextQuarterLoadRef.current = false;
      return;
    }

    void loadSnapshot(quarter);
  }, [clientReady, loadSnapshot, quarter]);

  useEffect(() => {
    if (!hasMessageScrollMountedRef.current) {
      hasMessageScrollMountedRef.current = true;
      return;
    }

    if (skipNextMessageScrollRef.current) {
      skipNextMessageScrollRef.current = false;
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  const timelineSignature =
    snapshot?.timeline.map(({ stage, state }) => `${stage}:${state}`).join("|") ?? "";

  useEffect(() => {
    if (!timelineSignature) {
      return;
    }

    const previous = previousTimelineRef.current;
    previousTimelineRef.current = timelineSignature;

    if (!previous || previous === timelineSignature) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const frame = window.requestAnimationFrame(() => {
      latestStageRef.current?.focus({ preventScroll: true });
      latestStageRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [timelineSignature]);

  async function runMutation(
    action: () => Promise<{ ok: boolean; error?: string } | void>,
  ) {
    if (isMutating) {
      return;
    }

    setIsMutating(true);
    setError(null);

    try {
      const result = await action();

      if (result && !result.ok) {
        throw new Error(result.error ?? "The action could not be completed.");
      }

      await loadSnapshot(quarter);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "The action could not be completed.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  function chatFormData(form?: HTMLFormElement) {
    const formData = form ? new FormData(form) : new FormData();
    formData.set("quarter", String(quarter));
    formData.set("source", "agentic-chat");
    return formData;
  }

  async function sendPrompt(value: string) {
    const question = value.trim();

    if (!question || isSending) {
      return;
    }

    const userMessage: AgenticMessage = {
      id: messageId(),
      role: "user",
      content: question,
    };
    const history = messages.slice(-6).map(({ content, role, topic }) => ({
      content: content.slice(0, 500),
      role,
      ...(topic ? { topic } : {}),
    }));

    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history,
          mode: "agentic",
          question,
          quarter,
        }),
      });
      const payload = (await response.json()) as AgenticChatResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The filing agent could not respond.");
      }

      if (payload.kind === "switch_to_ask") {
        setMessages((current) => [
          ...current,
          {
            id: messageId(),
            role: "agent",
            content: payload.answer,
            switchToAsk: true,
          },
        ]);
      } else {
        const nextQuarter = payload.plan.period.quarter;
        const changedPeriod = nextQuarter !== quarter;
        const agentMessage: AgenticMessage = {
          id: messageId(),
          role: "agent",
          content:
            payload.kind === "data"
              ? payload.answer
              : payload.narration,
          ...(payload.kind === "data"
            ? {
                facts: payload.facts,
                sourcePeriod: payload.sourcePeriod,
                topic: payload.topic,
              }
            : {}),
        };

        if (changedPeriod) {
          previousTimelineRef.current = null;
          skipNextQuarterLoadRef.current = true;
          setCollapsedStages(new Set());
          setError(null);
          setQuarter(nextQuarter);
        }

        setSnapshot(payload);
        setMessages((current) =>
          changedPeriod
            ? [userMessage, agentMessage]
            : [...current, agentMessage],
        );
      }
    } catch (sendError) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "agent",
          content:
            sendError instanceof Error
              ? sendError.message
              : "The filing agent could not respond.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handlePromptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(prompt);
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendPrompt(prompt);
    }
  }

  function switchToAskEtax() {
    if (onSwitchToAsk) {
      onSwitchToAsk();
      return;
    }

    window.dispatchEvent(
      new CustomEvent("etax:open-assistant", { detail: { tab: "ask" } }),
    );
  }

  function resetConversation() {
    setMessages([welcomeMessage]);
    setPrompt("");
    inputRef.current?.focus();
  }

  function selectQuarter(nextQuarter: FilingQuarter) {
    if (nextQuarter === quarter) {
      return;
    }

    previousTimelineRef.current = null;
    skipNextMessageScrollRef.current = true;
    setCollapsedStages(new Set());
    setSnapshot(null);
    setError(null);
    setMessages([welcomeMessage]);
    setPrompt("");
    setQuarter(nextQuarter);
  }

  function toggleStage(stage: AgenticStage) {
    setCollapsedStages((current) => {
      const next = new Set(current);

      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }

      return next;
    });
  }

  const plan = snapshot?.plan;
  const showWorkflowSkeleton = isLoading && !snapshot;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="shrink-0 border-b border-grey-300 bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center">
            <ChatbotIcon size={38} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-lg font-black text-grey-900">
                Agentic filing
              </p>
              <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-success-500">
                Controlled
              </span>
            </div>
            <p className="truncate text-xs text-grey-500">
              {plan ? `${plan.period.period} · BIR Form ${plan.period.formCode}` : "Your guided tax filing workspace"}
            </p>
          </div>
          <button
            aria-label="Reset agentic conversation"
            className="grid size-10 place-items-center rounded-full text-grey-500 transition hover:bg-grey-100 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            onClick={resetConversation}
            type="button"
          >
            <RotateCcw aria-hidden size={17} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[236px] shrink-0 flex-col border-r border-grey-300 bg-grey-100 p-3 md:flex">
          <p className="mb-2 px-2 pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-grey-500">
            Filing periods
          </p>
          <FilingPeriodMenu
            clientReady={clientReady}
            plan={plan}
            quarter={quarter}
            onSelect={selectQuarter}
          />
          <div className="mt-auto rounded-lg border border-primary-200 bg-primary-50 p-3">
            <ShieldCheck aria-hidden className="text-primary-500" size={18} />
            <p className="mt-2 text-xs font-extrabold text-primary-950">
              Approval stays with you
            </p>
            <p className="mt-1 text-[11px] leading-4 text-primary-800">
              The agent prepares work but cannot file or pay without exact approval.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-grey-100">
          <div className="shrink-0 border-b border-grey-300 bg-white px-3 py-2 md:hidden">
            <FilingPeriodMenu
              clientReady={clientReady}
              compact
              plan={plan}
              quarter={quarter}
              onSelect={selectQuarter}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <main
              aria-busy={isLoading}
              className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6"
            >
              {!snapshot && error ? (
                <div className="mt-6 flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-error-500 text-white">
                    <AlertTriangle aria-hidden size={16} />
                  </span>
                  <div className="flex-1 rounded-xl border border-error-500/25 bg-white p-4 text-sm text-grey-700">
                    {error}
                  </div>
                </div>
              ) : null}

              {showWorkflowSkeleton ? <AgenticTimelineSkeleton /> : null}

              {plan && snapshot ? (
                <div className="mt-6 space-y-6" aria-label="Filing timeline">
                  {snapshot.timeline.map((item, index) => {
                    const taskBlock = item.block;
                    const isLatest = index === snapshot.timeline.length - 1;

                    return (
                      <div
                        className="flex scroll-mt-4 items-start gap-3 outline-none"
                        key={item.id}
                        ref={isLatest ? latestStageRef : undefined}
                        tabIndex={isLatest ? -1 : undefined}
                      >
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
                          <p className="pt-1 text-sm leading-6 text-grey-700">
                            {item.narration}
                          </p>

                          {item.state === "completed" ? (
                            <CompletedStageSummary
                              expanded={!collapsedStages.has(item.stage)}
                              item={item}
                              onToggle={() => toggleStage(item.stage)}
                            />
                          ) : taskBlock ? (
                            <section className="mt-3 overflow-hidden rounded-xl border border-grey-300 bg-white shadow-[0_12px_30px_rgba(20,26,33,0.07)]">
                <div className="border-b border-grey-300 bg-primary-950 px-4 py-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary-300">
                        {plan.task.owner_agent}
                      </p>
                      <h2 className="mt-1 text-lg font-black">{item.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-grey-300">{plan.task.reason}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[10px] font-black uppercase text-grey-300">
                      {plan.task.risk_level} risk
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {taskBlock.type === "locked_period" ? (
                    <div className="grid gap-4">
                      <div className="flex items-start gap-3">
                        <LockKeyhole aria-hidden className="mt-0.5 shrink-0 text-warning-500" size={21} />
                        <div>
                          <p className="font-extrabold text-grey-900">Preview only</p>
                          <p className="mt-1 text-sm leading-6 text-grey-600">{taskBlock.reason}</p>
                          <p className="mt-2 text-xs font-bold text-grey-500">
                            Opens {formatDate(taskBlock.opensOn)}
                          </p>
                        </div>
                      </div>
                      <Link className={buttonClass("secondary")} href={`/filing?quarter=${quarter}`}>
                        Preview requirements
                      </Link>
                    </div>
                  ) : null}

                  {taskBlock.type === "record_upload" ? (
                    <form
                      className="grid gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        void runMutation(async () => {
                          await uploadIncomeRecord(chatFormData(form));
                          form.reset();
                        });
                      }}
                    >
                      <label className="grid gap-2 text-sm font-extrabold text-grey-900">
                        Income record
                        <input
                          accept="image/*,application/pdf"
                          className="block w-full rounded-lg border border-grey-300 bg-grey-50 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-primary-900"
                          name="file"
                          required
                          type="file"
                        />
                      </label>
                      <button className={buttonClass("primary")} disabled={isMutating} type="submit">
                        {isMutating ? <Loader2 aria-hidden className="animate-spin" size={18} /> : <Upload aria-hidden size={18} />}
                        {isMutating ? "Reading record…" : "Upload and extract"}
                      </button>
                      <p className="text-xs leading-5 text-grey-500">
                        Images and PDFs are extracted provisionally. You confirm every amount.
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
                            onSubmit={(event) => {
                              event.preventDefault();
                              void runMutation(() => confirmIncomeRecord(chatFormData(event.currentTarget)));
                            }}
                          >
                            <input name="id" type="hidden" value={record.id} />
                            <div className="flex items-start gap-3">
                              <FileText aria-hidden className="mt-0.5 shrink-0 text-primary-500" size={20} />
                              <div className="min-w-0">
                                <p className="break-all text-sm font-extrabold text-grey-900">
                                  {record.original_filename}
                                </p>
                                <p className="mt-1 text-xs font-bold text-grey-500">
                                  {record.extraction_confidence
                                    ? `${Math.round(record.extraction_confidence * 100)}% extraction confidence`
                                    : "Amount needs review"}
                                </p>
                              </div>
                            </div>
                            <label className="grid gap-1.5 text-xs font-bold uppercase text-grey-500">
                              Confirmed income
                              <input
                                className="min-h-11 rounded-lg border border-grey-300 bg-white px-3 text-sm font-extrabold text-grey-900"
                                defaultValue={record.total_income ?? ""}
                                min="0"
                                name="total_income"
                                required
                                step="0.01"
                                type="number"
                              />
                            </label>
                            <button className={buttonClass("secondary")} disabled={isMutating} type="submit">
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
                          <dt className="text-[10px] font-black uppercase text-primary-700">Recorded income</dt>
                          <dd className="mt-1 text-lg font-black text-grey-900">
                            {money(plan.computation.input_snapshot.totalIncome)}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-primary-500 p-3 text-white">
                          <dt className="text-[10px] font-black uppercase text-primary-100">Demo amount</dt>
                          <dd className="mt-1 text-lg font-black">
                            {money(plan.computation.output_snapshot.amountPayable)}
                          </dd>
                        </div>
                      </dl>
                      <div className="border-l-4 border-warning-500 bg-warning-500/10 px-3 py-2 text-xs leading-5 text-grey-700">
                        Illustrative 6% rule only. No deductions, credits, prior payments, or official assessment.
                      </div>
                      <button
                        className={buttonClass("primary")}
                        disabled={isMutating}
                        onClick={() =>
                          void runMutation(() => confirmComputationReview(chatFormData()))
                        }
                        type="button"
                      >
                        <FileCheck2 aria-hidden size={18} />
                        I reviewed this computation
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
                          ["Amount", money(plan.computation.output_snapshot.amountPayable)],
                          ["Effect", "Prepare guided hand-off only"],
                        ].map(([label, value]) => (
                          <div className="flex justify-between gap-3 border-b border-grey-200 pb-2" key={label}>
                            <dt className="text-grey-500">{label}</dt>
                            <dd className="text-right font-extrabold text-grey-900">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-xs leading-5 text-grey-600">
                        This approval is bound to the exact return snapshot and does not authorize payment.
                      </p>
                      <button
                        className={buttonClass("primary")}
                        disabled={isMutating}
                        onClick={() => void runMutation(() => approveFilingHandoff(chatFormData()))}
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
                      onSubmit={(event) => {
                        event.preventDefault();
                        void runMutation(() =>
                          recordFilingAcknowledgement(chatFormData(event.currentTarget)),
                        );
                      }}
                    >
                      <label className="grid gap-2 text-sm font-extrabold text-grey-900">
                        Filing acknowledgement
                        <input
                          className="min-h-11 rounded-lg border border-grey-300 bg-grey-50 px-3 text-sm"
                          minLength={6}
                          name="reference"
                          placeholder="BIR acknowledgement reference"
                          required
                        />
                      </label>
                      <button className={buttonClass("primary")} disabled={isMutating} type="submit">
                        <ReceiptText aria-hidden size={18} />
                        Save filing evidence
                      </button>
                    </form>
                  ) : null}

                  {taskBlock.type === "payment_approval" ? (
                    <div className="grid gap-4">
                      <div className="rounded-lg border border-warning-500/25 bg-warning-500/10 p-3 text-sm leading-6 text-grey-700">
                        Filing approval never authorizes payment. Review the exact taxpayer, period, form, and amount before opening eGovPay.
                      </div>
                      <EgovPayCheckoutForm
                        label="Approve and open eGovPay"
                        pendingLabel="Preparing approved hand-off…"
                        quarter={quarter}
                      />
                    </div>
                  ) : null}

                  {taskBlock.type === "payment_proof" ? (
                    <form
                      className="grid gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void runMutation(() => uploadPaymentProof(chatFormData(event.currentTarget)));
                      }}
                    >
                      <label className="grid gap-2 text-sm font-extrabold text-grey-900">
                        Payment reference
                        <input
                          className="min-h-11 rounded-lg border border-grey-300 bg-grey-50 px-3 text-sm"
                          name="reference"
                          required
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-extrabold text-grey-900">
                        Receipt or payment proof
                        <input
                          accept="image/*,application/pdf"
                          className="block w-full rounded-lg border border-grey-300 bg-grey-50 px-3 py-2 text-sm"
                          name="file"
                          required
                          type="file"
                        />
                      </label>
                      <button className={buttonClass("primary")} disabled={isMutating} type="submit">
                        <Upload aria-hidden size={18} />
                        Verify with proof
                      </button>
                    </form>
                  ) : null}

                  {taskBlock.type === "exception" ? (
                    <div className="grid gap-4">
                      <div className="flex items-start gap-3 text-sm leading-6 text-grey-700">
                        <AlertTriangle aria-hidden className="mt-1 shrink-0 text-warning-500" size={20} />
                        {taskBlock.message}
                      </div>
                      <Link className={buttonClass("secondary")} href={plan.task.action_href} onClick={onClose}>
                        Review exception
                      </Link>
                    </div>
                  ) : null}

                      </div>
                    </section>
                  ) : null}

                          {error && isLatest ? (
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
                  })}
                </div>
              ) : null}
              <AgenticConversation
                isSending={isSending}
                messages={messages}
                onSwitchToAsk={switchToAskEtax}
              />
              <div ref={messagesEndRef} />
            </main>
          </div>

          <form
            className="shrink-0 border-t border-grey-300 bg-white px-3 pb-3 pt-2 sm:px-6"
            onSubmit={handlePromptSubmit}
          >
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex min-h-[54px] items-end gap-2 rounded-2xl border border-grey-300 bg-white p-1.5 shadow-[0_8px_24px_rgba(20,26,33,0.08)] transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50">
                <MessageSquareText aria-hidden className="mb-2.5 ml-2 shrink-0 text-grey-500" size={17} />
                <textarea
                  aria-label="Tell the filing agent what to do"
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-5 text-grey-900 outline-none placeholder:text-grey-500"
                  disabled={isSending}
                  maxLength={500}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Message your filing agent…"
                  ref={inputRef}
                  rows={1}
                  value={prompt}
                />
                <button
                  aria-label="Send filing instruction"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
                  disabled={isSending || !prompt.trim()}
                  type="submit"
                >
                  <Send aria-hidden size={16} />
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
