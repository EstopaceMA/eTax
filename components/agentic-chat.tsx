"use client";

import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AgenticWorkflowMessage } from "@/components/agentic-workflow-message";
import { ChatbotIcon } from "@/components/chatbot-icon";
import {
  AgenticSessionListSkeleton,
  AgenticTimelineSkeleton,
} from "@/components/loading-skeletons";
import { filingQuarters, type FilingQuarter } from "@/lib/filing-periods";
import type {
  AgenticChatHistoryItem,
  AgenticChatResponse,
  AgenticSessionDetail,
  AgenticSessionEvent,
  AgenticSessionSnapshot,
  AgenticSessionSummary,
} from "@/lib/agentic/types";

type SessionListResponse = {
  sessions: AgenticSessionSummary[];
  selectedSessionId: string | null;
  error?: string;
};

function statusLabel(value: string | null) {
  return value ? value.replaceAll("_", " ") : "Choose a filing period";
}

function mergeSnapshotPages(
  current: AgenticSessionSnapshot[],
  incoming: AgenticSessionSnapshot[],
) {
  const snapshots = new Map<FilingQuarter, AgenticSessionSnapshot>();

  for (const item of [...current, ...incoming]) {
    snapshots.set(item.quarter, item);
  }

  return Array.from(snapshots.values());
}

function PeriodSelection({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (quarter: FilingQuarter) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center">
        <ChatbotIcon size={30} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm leading-6 text-grey-700">
          Which filing period would you like to work on?
        </p>
        <div
          aria-label="Choose a filing period"
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {filingQuarters.map((period) => (
            <button
              className="flex min-h-16 items-center gap-3 rounded-xl border border-grey-300 bg-white px-3 py-2 text-left transition hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
              disabled={disabled}
              key={period.quarter}
              onClick={() => onSelect(period.quarter)}
              type="button"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-100 text-xs font-semibold text-primary-800">
                {period.quarter === 4 ? "A" : `Q${period.quarter}`}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-grey-800">
                  {period.label}
                </span>
                <span className="mt-0.5 block text-xs text-grey-500">
                  BIR Form {period.formCode}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TextEvent({
  event,
  onSwitchToAsk,
}: {
  event: Exclude<AgenticSessionEvent, { kind: "workflow_stage" | "period_selection" }>;
  onSwitchToAsk: () => void;
}) {
  const user = event.role === "user";
  const contextual = event.kind === "period_context";

  return (
    <div className={user ? "flex justify-end" : "flex items-start gap-3"}>
      {!user ? (
        <span className="grid size-8 shrink-0 place-items-center">
          <ChatbotIcon size={30} />
        </span>
      ) : null}
      <div
        className={
          user
            ? "max-w-[82%] rounded-2xl rounded-br-md bg-primary-500 px-4 py-3 text-sm leading-6 text-white shadow-sm"
            : "min-w-0 max-w-[calc(100%-44px)] pt-1 text-sm leading-6 text-grey-700"
        }
      >
        {contextual && event.quarter ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary-700">
            Period changed · {event.quarter === 4 ? "Annual" : `Q${event.quarter}`} 2026
          </p>
        ) : null}
        {event.kind === "assistant_data" && event.quarter ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary-700">
            Verified filing data · {event.quarter === 4 ? "Annual" : `Q${event.quarter}`} 2026
          </p>
        ) : null}
        <p className="whitespace-pre-wrap">{event.content}</p>
        {event.kind === "assistant_data" && event.facts.length ? (
          <dl className="mt-3 grid gap-2 rounded-xl border border-primary-200 bg-white p-3 shadow-[0_8px_24px_rgba(20,26,33,0.05)] sm:grid-cols-2">
            {event.facts.map(({ label, value }, index) => (
              <div className="min-w-0" key={`${label}-${index}`}>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-grey-500">
                  {label}
                </dt>
                <dd className="break-words text-sm font-semibold text-grey-800">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {event.kind === "switch_to_ask" ? (
          <button
            className="mt-2 flex items-center gap-1 font-semibold text-primary-700"
            onClick={onSwitchToAsk}
            type="button"
          >
            Open Ask eTax <ArrowRight aria-hidden size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SessionSidebar({
  actionMenuId,
  activeSessionId,
  busy,
  focusRename,
  idPrefix,
  openingSessionId,
  renamingId,
  renameValue,
  sessions,
  onDelete,
  onMenu,
  onNewChat,
  onOpen,
  onPin,
  onRenameCancel,
  onRenameChange,
  onRenameSave,
  onRenameStart,
}: {
  actionMenuId: string | null;
  activeSessionId: string | null;
  busy: boolean;
  focusRename: boolean;
  idPrefix: string;
  openingSessionId: string | null;
  renamingId: string | null;
  renameValue: string;
  sessions: AgenticSessionSummary[];
  onDelete: (session: AgenticSessionSummary) => void;
  onMenu: (id: string | null) => void;
  onNewChat: () => void;
  onOpen: (session: AgenticSessionSummary) => void;
  onPin: (session: AgenticSessionSummary) => void;
  onRenameCancel: () => void;
  onRenameChange: (value: string) => void;
  onRenameSave: (session: AgenticSessionSummary) => void;
  onRenameStart: (session: AgenticSessionSummary) => void;
}) {
  const orderedSessions = [...sessions].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    const leftDate = left.isPinned ? left.pinnedAt : left.lastOpenedAt;
    const rightDate = right.isPinned ? right.pinnedAt : right.lastOpenedAt;
    return new Date(rightDate ?? 0).getTime() - new Date(leftDate ?? 0).getTime();
  });

  return (
    <>
      <button
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-grey-300 bg-white px-3 text-sm font-semibold text-grey-800 transition hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
        disabled={busy}
        onClick={onNewChat}
        type="button"
      >
        <Plus aria-hidden size={18} />
        New chat
      </button>
      <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {sessions.length ? (
          orderedSessions.map((session, index) => {
            const active = session.id === activeSessionId;
            const opening = session.id === openingSessionId;
            const renaming = renamingId === session.id;
            const previous = orderedSessions[index - 1];
            const sectionLabel =
              index === 0
                ? session.isPinned
                  ? "Pinned"
                  : "Recent"
                : previous?.isPinned && !session.isPinned
                  ? "Recent"
                  : null;

            if (renaming) {
              return (
                <div
                  className={sectionLabel && index > 0 ? "pt-3" : ""}
                  key={session.id}
                >
                  {sectionLabel ? (
                    <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-grey-500">
                      {sectionLabel}
                    </p>
                  ) : null}
                  <form
                    className="rounded-lg border border-primary-300 bg-white p-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onRenameSave(session);
                    }}
                  >
                    <label
                      className="sr-only"
                      htmlFor={`${idPrefix}-rename-${session.id}`}
                    >
                      Rename filing chat
                    </label>
                    <input
                      autoFocus={focusRename}
                      className="min-h-9 w-full rounded-md border border-grey-300 px-2 text-sm outline-none focus:border-primary-500"
                      id={`${idPrefix}-rename-${session.id}`}
                      maxLength={80}
                      onChange={(event) => onRenameChange(event.target.value)}
                      value={renameValue}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        className="text-xs font-medium text-grey-600"
                        onClick={onRenameCancel}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="text-xs font-semibold text-primary-700"
                        disabled={!renameValue.trim()}
                        type="submit"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              );
            }

            return (
              <div
                className={sectionLabel && index > 0 ? "pt-3" : ""}
                key={session.id}
              >
                {sectionLabel ? (
                  <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-grey-500">
                    {sectionLabel}
                  </p>
                ) : null}
                <div className="relative">
                  <button
                    aria-busy={opening}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "w-full rounded-lg px-3 py-2.5 pr-10 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                      active
                        ? "bg-primary-50 text-primary-900"
                        : "text-grey-700 hover:bg-white",
                    ].join(" ")}
                    disabled={busy}
                    onClick={() => onOpen(session)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block truncate text-sm font-semibold">
                        {session.title}
                      </span>
                      {session.isPinned ? (
                        <Pin
                          aria-hidden
                          className="shrink-0 text-primary-600"
                          size={12}
                        />
                      ) : null}
                      {opening ? (
                        <Loader2
                          aria-hidden
                          className="shrink-0 text-primary-600 motion-safe:animate-spin"
                          size={13}
                        />
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-[11px] capitalize text-grey-500">
                      {session.activePeriod
                        ? `${session.activePeriod} · ${statusLabel(session.filingStatus)}`
                        : "Choose a filing period"}
                    </span>
                  </button>
                  <button
                    aria-label={`More options for ${session.title}`}
                    aria-expanded={actionMenuId === session.id}
                    className="absolute right-1.5 top-2 grid size-8 place-items-center rounded-md text-grey-500 hover:bg-grey-200 focus-visible:outline-2 focus-visible:outline-primary-500"
                    disabled={busy}
                    onClick={() =>
                      onMenu(actionMenuId === session.id ? null : session.id)
                    }
                    type="button"
                  >
                    <MoreHorizontal aria-hidden size={17} />
                  </button>
                  {actionMenuId === session.id ? (
                    <div className="absolute right-1 top-10 z-20 w-36 rounded-lg border border-grey-300 bg-white p-1 shadow-lg">
                      <button
                        className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-grey-700 hover:bg-grey-100"
                        onClick={() => onPin(session)}
                        type="button"
                      >
                        {session.isPinned ? (
                          <PinOff aria-hidden size={14} />
                        ) : (
                          <Pin aria-hidden size={14} />
                        )}
                        {session.isPinned ? "Unpin chat" : "Pin chat"}
                      </button>
                      <button
                        className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-grey-700 hover:bg-grey-100"
                        onClick={() => onRenameStart(session)}
                        type="button"
                      >
                        <Pencil aria-hidden size={14} /> Rename
                      </button>
                      <button
                        className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-error-500 hover:bg-error-500/5"
                        onClick={() => onDelete(session)}
                        type="button"
                      >
                        <Trash2 aria-hidden size={14} /> Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="px-2 py-4 text-xs leading-5 text-grey-500">
            Your saved filing chats will appear here.
          </p>
        )}
      </div>
      <div className="relative mt-3 overflow-hidden rounded-lg border border-primary-500 bg-primary-500 p-3">
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 size-40 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 size-40 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/5"
        />
        <div className="relative z-10">
          <ShieldCheck aria-hidden className="text-white" size={18} />
          <p className="mt-2 text-xs font-semibold text-white">
            Approval stays with you
          </p>
          <p className="mt-1 text-[11px] leading-4 text-white">
            Chats share filing progress, but each approval remains exact and
            separate.
          </p>
        </div>
      </div>
    </>
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerButtonRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const previousEventCountRef = useRef(0);
  const sessionOpenRequestRef = useRef(0);
  const [sessions, setSessions] = useState<AgenticSessionSummary[]>([]);
  const [detail, setDetail] = useState<AgenticSessionDetail | null>(null);
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [optimisticQuestion, setOptimisticQuestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isSelectingPeriod, setIsSelectingPeriod] = useState(false);
  const [pinningSessionId, setPinningSessionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingSession, setDeletingSession] =
    useState<AgenticSessionSummary | null>(null);
  const [collapsedEvents, setCollapsedEvents] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  const busy =
    isLoading ||
    isSending ||
    isMutating ||
    isSelectingPeriod ||
    pinningSessionId !== null;

  const refreshSessionList = useCallback(async () => {
    const response = await fetch("/api/agentic/sessions", { cache: "no-store" });
    const payload = (await response.json()) as SessionListResponse;

    if (!response.ok) {
      throw new Error(payload.error ?? "Filing chats could not be loaded.");
    }

    setSessions(payload.sessions);
    return payload;
  }, []);

  const fetchSessionDetail = useCallback(
    async (session: AgenticSessionSummary) => {
      const response = await fetch(
        `/api/agentic/sessions/${session.id}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activeContextId: session.activeContextId,
            expectedVersion: session.version,
          }),
        },
      );
      const payload = (await response.json()) as AgenticSessionDetail & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "This filing chat could not be opened.");
      }

      return payload;
    },
    [],
  );

  const openSession = useCallback(
    async (session: AgenticSessionSummary) => {
      const requestId = sessionOpenRequestRef.current + 1;
      sessionOpenRequestRef.current = requestId;
      setOpeningSessionId(session.id);
      setIsLoading(true);
      setError(null);
      setActionMenuId(null);

      try {
        const payload = await fetchSessionDetail(session);

        if (requestId !== sessionOpenRequestRef.current) {
          return;
        }

        setDetail(payload);
        setSessions((current) =>
          current.map((item) =>
            item.id === payload.session.id ? payload.session : item,
          ),
        );
        setCollapsedEvents(new Set());
        setPrompt("");
        setIsDrawerOpen(false);
      } catch (openError) {
        if (requestId !== sessionOpenRequestRef.current) {
          return;
        }

        setError(
          openError instanceof Error
            ? openError.message
            : "This filing chat could not be opened.",
        );
      } finally {
        if (requestId === sessionOpenRequestRef.current) {
          setOpeningSessionId(null);
          setIsLoading(false);
        }
      }
    },
    [fetchSessionDetail],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const payload = await refreshSessionList();

        if (cancelled) {
          return;
        }

        const selected = payload.sessions.find(
          ({ id }) => id === payload.selectedSessionId,
        );

        if (selected) {
          const nextDetail = await fetchSessionDetail(selected);

          if (!cancelled) {
            setDetail(nextDetail);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Filing chats could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [fetchSessionDetail, refreshSessionList]);

  useEffect(() => {
    const count = detail?.events.length ?? 0;

    if (count <= previousEventCountRef.current && !optimisticQuestion) {
      previousEventCountRef.current = count;
      return;
    }

    previousEventCountRef.current = count;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [detail?.events.length, isSending, optimisticQuestion]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const previousFocus = document.activeElement as HTMLElement | null;
    const drawerButton = drawerButtonRef.current;
    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab" || !drawer) {
        return;
      }

      const items = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = items[0];
      const last = items.at(-1);

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      (previousFocus ?? drawerButton)?.focus();
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!deletingSession) {
      return;
    }

    const previousFocus = document.activeElement as HTMLElement | null;
    const drawerButton = drawerButtonRef.current;
    const dialog = deleteDialogRef.current;
    deleteCancelRef.current?.focus();

    function closeDeleteDialog(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setDeletingSession(null);
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = items[0];
      const last = items.at(-1);

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", closeDeleteDialog);
    return () => {
      document.removeEventListener("keydown", closeDeleteDialog);
      (previousFocus ?? drawerButton)?.focus();
    };
  }, [deletingSession]);

  const snapshotMap = useMemo(
    () =>
      new Map(
        (detail?.snapshots ?? []).map(({ quarter, snapshot }) => [
          quarter,
          snapshot,
        ]),
      ),
    [detail?.snapshots],
  );

  const activeWorkflowEventId =
    [...(detail?.events ?? [])]
      .reverse()
      .find(
        (event) =>
          event.kind === "workflow_stage" &&
          event.contextId === detail?.session.activeContextId,
      )?.id ?? null;

  function switchToAskEtax() {
    if (onSwitchToAsk) {
      onSwitchToAsk();
      return;
    }

    window.dispatchEvent(
      new CustomEvent("etax:open-assistant", { detail: { tab: "ask" } }),
    );
  }

  async function selectPeriod(quarter: FilingQuarter) {
    if (busy) {
      return;
    }

    setIsSelectingPeriod(true);
    setError(null);

    try {
      let sessionId = detail?.session.id ?? null;
      let expectedVersion = detail?.session.version ?? 1;

      if (!sessionId) {
        const createResponse = await fetch("/api/agentic/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${quarter === 4 ? "Annual" : `Q${quarter}`} 2026 filing`,
          }),
        });
        const created = (await createResponse.json()) as {
          sessionId?: string;
          error?: string;
        };

        if (!createResponse.ok || !created.sessionId) {
          throw new Error(created.error ?? "The filing chat could not be created.");
        }

        sessionId = created.sessionId;
        expectedVersion = 1;
      }

      const response = await fetch(
        `/api/agentic/sessions/${sessionId}/period`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientRequestId: crypto.randomUUID(),
            expectedVersion,
            quarter,
          }),
        },
      );
      const payload = (await response.json()) as AgenticSessionDetail & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The filing period could not be changed.");
      }

      setDetail(payload);
      setCollapsedEvents(new Set());
      await refreshSessionList();
    } catch (selectError) {
      setError(
        selectError instanceof Error
          ? selectError.message
          : "The filing period could not be changed.",
      );
    } finally {
      setIsSelectingPeriod(false);
    }
  }

  async function sendPrompt(value: string) {
    const question = value.trim();

    if (!question || busy) {
      return;
    }

    const history = (detail?.events ?? [])
      .reduce<AgenticChatHistoryItem[]>((items, event) => {
        if (event.kind === "user_text") {
          items.push({
            content: event.content.slice(0, 500),
            role: "user",
          });
        }

        if (event.kind === "assistant_text" || event.kind === "assistant_data") {
          items.push({
            content: event.content.slice(0, 500),
            role: "agent",
            ...(event.kind === "assistant_data" ? { topic: event.topic } : {}),
          });
        }

        return items;
      }, [])
      .slice(-6);

    setPrompt("");
    setOptimisticQuestion(question);
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeContextId: detail?.session.activeContextId ?? null,
          clientRequestId: crypto.randomUUID(),
          history,
          mode: "agentic",
          question,
          quarter: detail?.session.activeQuarter ?? 2,
          sessionId: detail?.session.id ?? null,
          sessionVersion: detail?.session.version ?? null,
        }),
      });
      const payload = (await response.json()) as AgenticChatResponse & {
        error?: string;
      };

      if (!response.ok || !("sessionDetail" in payload)) {
        throw new Error(payload.error ?? "The filing agent could not respond.");
      }

      setDetail(payload.sessionDetail);
      setCollapsedEvents(new Set());
      await refreshSessionList();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The filing agent could not respond.",
      );
    } finally {
      setOptimisticQuestion(null);
      setIsSending(false);
    }
  }

  async function runMutation(
    action: () => Promise<{ ok: boolean; error?: string } | void>,
  ) {
    if (busy || !detail) {
      return;
    }

    setIsMutating(true);
    setError(null);

    try {
      const result = await action();

      if (result && !result.ok) {
        throw new Error(result.error ?? "The action could not be completed.");
      }

      const response = await fetch(
        `/api/agentic/sessions/${detail.session.id}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activeContextId: detail.session.activeContextId,
            expectedVersion: detail.session.version,
          }),
        },
      );
      const payload = (await response.json()) as AgenticSessionDetail & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The filing chat could not be refreshed.");
      }

      setDetail(payload);
      await refreshSessionList();
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

  async function loadOlderEvents() {
    if (!detail?.olderCursor || busy) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/agentic/sessions/${detail.session.id}?before=${detail.olderCursor}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as AgenticSessionDetail & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Older messages could not be loaded.");
      }

      setDetail((current) =>
        current
          ? {
              ...current,
              events: [...payload.events, ...current.events],
              olderCursor: payload.olderCursor,
              snapshots: mergeSnapshotPages(
                current.snapshots,
                payload.snapshots,
              ),
            }
          : payload,
      );
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : "Older messages could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function renameSession(session: AgenticSessionSummary) {
    const title = renameValue.trim();

    if (!title || busy) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agentic/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: session.version,
          title,
        }),
      });
      const payload = (await response.json()) as AgenticSessionDetail & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The filing chat could not be renamed.");
      }

      if (detail?.session.id === session.id) {
        setDetail(payload);
      }

      setRenamingId(null);
      setRenameValue("");
      await refreshSessionList();
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "The filing chat could not be renamed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function togglePinnedSession(session: AgenticSessionSummary) {
    if (busy) {
      return;
    }

    const previousSessions = sessions;
    const pinned = !session.isPinned;
    const pinnedAt = pinned ? new Date().toISOString() : null;

    setActionMenuId(null);
    setPinningSessionId(session.id);
    setError(null);
    setSessions((current) =>
      current.map((item) =>
        item.id === session.id
          ? { ...item, isPinned: pinned, pinnedAt }
          : item,
      ),
    );

    try {
      const response = await fetch(`/api/agentic/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: session.version,
          pinned,
        }),
      });
      const payload = (await response.json()) as AgenticSessionDetail & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            `The filing chat could not be ${pinned ? "pinned" : "unpinned"}.`,
        );
      }

      setSessions((current) =>
        current.map((item) =>
          item.id === session.id ? payload.session : item,
        ),
      );

      if (detail?.session.id === session.id) {
        setDetail(payload);
      }
    } catch (pinError) {
      setSessions(previousSessions);
      setError(
        pinError instanceof Error
          ? pinError.message
          : `The filing chat could not be ${pinned ? "pinned" : "unpinned"}.`,
      );
    } finally {
      setPinningSessionId(null);
    }
  }

  async function deleteSession() {
    if (!deletingSession || busy) {
      return;
    }

    const session = deletingSession;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agentic/sessions/${session.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "The filing chat could not be deleted.");
      }

      setDeletingSession(null);
      const nextList = await refreshSessionList();
      const next = nextList.sessions[0];

      if (detail?.session.id === session.id) {
        if (next) {
          setDetail(await fetchSessionDetail(next));
        } else {
          setDetail(null);
        }
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The filing chat could not be deleted.",
      );
    } finally {
      setIsLoading(false);
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

  function startNewChat() {
    if (busy) {
      return;
    }

    setDetail(null);
    setPrompt("");
    setError(null);
    setActionMenuId(null);
    setRenamingId(null);
    setCollapsedEvents(new Set());
    setIsDrawerOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function toggleEvent(eventId: string) {
    setCollapsedEvents((current) => {
      const next = new Set(current);

      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }

      return next;
    });
  }

  const activeSnapshot = detail?.session.activeQuarter
    ? snapshotMap.get(detail.session.activeQuarter)
    : undefined;
  const openingSession =
    sessions.find(({ id }) => id === openingSessionId) ?? null;
  const sessionTitle =
    openingSession?.title ?? detail?.session.title ?? "New filing chat";
  const sessionSubtitle = openingSession
    ? "Loading conversation…"
    : activeSnapshot
      ? `${activeSnapshot.plan.period.period} · BIR Form ${activeSnapshot.plan.period.formCode}`
      : "Choose a filing period in the conversation";

  const sidebarProps = {
    actionMenuId,
    activeSessionId: openingSessionId ?? detail?.session.id ?? null,
    busy,
    openingSessionId,
    renamingId,
    renameValue,
    sessions,
    onDelete: (session: AgenticSessionSummary) => {
      setActionMenuId(null);
      setIsDrawerOpen(false);
      setDeletingSession(session);
    },
    onMenu: setActionMenuId,
    onNewChat: startNewChat,
    onOpen: (session: AgenticSessionSummary) => {
      if (session.id !== detail?.session.id) {
        void openSession(session);
      } else {
        setIsDrawerOpen(false);
      }
    },
    onPin: (session: AgenticSessionSummary) => {
      void togglePinnedSession(session);
    },
    onRenameCancel: () => {
      setRenamingId(null);
      setRenameValue("");
    },
    onRenameChange: setRenameValue,
    onRenameSave: (session: AgenticSessionSummary) => {
      void renameSession(session);
    },
    onRenameStart: (session: AgenticSessionSummary) => {
      setActionMenuId(null);
      setRenamingId(session.id);
      setRenameValue(session.title);
    },
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="shrink-0 border-b border-grey-300 bg-white px-3 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open filing chats"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-grey-600 hover:bg-grey-100 focus-visible:outline-2 focus-visible:outline-primary-500 md:hidden"
            disabled={busy}
            onClick={() => setIsDrawerOpen(true)}
            ref={drawerButtonRef}
            type="button"
          >
            <Menu aria-hidden size={20} />
          </button>
          <div className="grid size-10 shrink-0 place-items-center">
            <ChatbotIcon size={38} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-grey-800">
              {sessionTitle}
            </p>
            <p className="truncate text-xs text-grey-500">{sessionSubtitle}</p>
          </div>
          <button
            aria-label="Start a new filing chat"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-grey-600 transition hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-primary-500"
            disabled={busy}
            onClick={startNewChat}
            type="button"
          >
            <Plus aria-hidden size={19} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-grey-300 bg-grey-100 p-3 md:flex">
          {isLoading && sessions.length === 0 ? (
            <AgenticSessionListSkeleton />
          ) : (
            <SessionSidebar
              {...sidebarProps}
              focusRename={!isDrawerOpen}
              idPrefix="desktop"
            />
          )}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-grey-100">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <main
              aria-busy={isLoading}
              aria-label="Agentic filing conversation"
              className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6"
            >
              {!openingSessionId && detail?.olderCursor ? (
                <div className="mb-5 text-center">
                  <button
                    className="rounded-full border border-grey-300 bg-white px-4 py-2 text-xs font-semibold text-grey-600 hover:border-primary-300 hover:text-primary-700"
                    disabled={busy}
                    onClick={() => void loadOlderEvents()}
                    type="button"
                  >
                    Load older messages
                  </button>
                </div>
              ) : null}

              {openingSessionId || (isLoading && !detail) ? (
                <AgenticTimelineSkeleton />
              ) : null}

              {!openingSessionId && !isLoading && !detail ? (
                <div className="space-y-6" aria-live="polite">
                  <PeriodSelection disabled={busy} onSelect={selectPeriod} />
                </div>
              ) : null}

              {!openingSessionId && detail ? (
                <div className="space-y-6" aria-live="polite">
                  {detail.events.map((event) => {
                    if (event.kind === "period_selection") {
                      return (
                        <PeriodSelection
                          disabled={
                            busy || detail.session.activeQuarter !== null
                          }
                          key={event.id}
                          onSelect={selectPeriod}
                        />
                      );
                    }

                    if (event.kind === "workflow_stage") {
                      const snapshot = event.quarter
                        ? snapshotMap.get(event.quarter)
                        : undefined;
                      const item = snapshot?.timeline.find(
                        ({ stage }) => stage === event.stage,
                      );

                      if (!snapshot || !item) {
                        return null;
                      }

                      const interactive =
                        event.id === activeWorkflowEventId &&
                        event.contextId === detail.session.activeContextId &&
                        event.quarter === detail.session.activeQuarter;

                      return (
                        <AgenticWorkflowMessage
                          error={error}
                          event={event}
                          expanded={!collapsedEvents.has(event.id)}
                          interactive={interactive}
                          isMutating={isMutating}
                          item={item}
                          key={event.id}
                          onClose={onClose}
                          onRunMutation={(action) => void runMutation(action)}
                          onToggle={() => toggleEvent(event.id)}
                          snapshot={snapshot}
                        />
                      );
                    }

                    return (
                      <TextEvent
                        event={event}
                        key={event.id}
                        onSwitchToAsk={switchToAskEtax}
                      />
                    );
                  })}

                  {error && !activeWorkflowEventId ? (
                    <div
                      aria-live="polite"
                      className="flex items-start gap-2 rounded-xl border border-error-500/25 bg-white p-3 text-sm text-grey-700"
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

                  {optimisticQuestion ? (
                    <div className="flex justify-end">
                      <div className="max-w-[82%] rounded-2xl rounded-br-md bg-primary-500 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                        {optimisticQuestion}
                      </div>
                    </div>
                  ) : null}

                  {isSending ? (
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center">
                        <ChatbotIcon size={30} />
                      </span>
                      <div className="flex items-center gap-2 text-sm text-grey-600">
                        <Loader2
                          aria-hidden
                          className="animate-spin text-primary-500"
                          size={16}
                        />
                        Reading the current filing data…
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {error && !detail ? (
                <div
                  aria-live="polite"
                  className="mt-5 flex items-start gap-2 rounded-xl border border-error-500/25 bg-white p-3 text-sm text-grey-700"
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
              <div ref={messagesEndRef} />
            </main>
          </div>

          <form
            className="shrink-0 px-3 pb-3 sm:px-6"
            onSubmit={handlePromptSubmit}
          >
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex min-h-[54px] items-end gap-2 rounded-2xl border border-grey-300 bg-white p-1.5 shadow-[0_8px_24px_rgba(20,26,33,0.08)] transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50">
                <MessageSquareText
                  aria-hidden
                  className="mb-2.5 ml-2 shrink-0 text-grey-500"
                  size={17}
                />
                <textarea
                  aria-label="Tell the filing agent what to do"
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-5 text-grey-800 outline-none placeholder:text-grey-500"
                  disabled={busy}
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
                  disabled={busy || !prompt.trim()}
                  type="submit"
                >
                  <Send aria-hidden size={16} />
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>

      {isDrawerOpen ? (
        <div
          aria-label="Filing chats"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-grey-900/25 md:hidden"
          role="dialog"
        >
          <button
            aria-label="Close filing chats"
            className="absolute inset-0"
            onClick={() => setIsDrawerOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <div
            className="relative flex h-full w-[min(86vw,320px)] flex-col border-r border-grey-300 bg-grey-100 p-3 shadow-2xl"
            ref={drawerRef}
          >
            <div className="mb-3 flex justify-end">
              <button
                aria-label="Close filing chats"
                className="grid size-9 place-items-center rounded-lg text-grey-600 hover:bg-grey-200 focus-visible:outline-2 focus-visible:outline-primary-500"
                onClick={() => setIsDrawerOpen(false)}
                type="button"
              >
                <X aria-hidden size={18} />
              </button>
            </div>
            <SessionSidebar
              {...sidebarProps}
              focusRename
              idPrefix="mobile"
            />
          </div>
        </div>
      ) : null}

      {deletingSession ? (
        <div
          aria-labelledby="delete-chat-title"
          aria-modal="true"
          className="fixed inset-0 z-[60] grid place-items-center bg-grey-900/30 p-4"
          role="dialog"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-grey-300 bg-white p-5 shadow-2xl"
            ref={deleteDialogRef}
          >
            <h2
              className="text-lg font-semibold text-grey-800"
              id="delete-chat-title"
            >
              Delete this filing chat?
            </h2>
            <p className="mt-2 text-sm leading-6 text-grey-600">
              “{deletingSession.title}” and its messages will be permanently
              deleted. Your filing records, approvals, and payment evidence will
              stay intact.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="min-h-10 rounded-lg px-4 text-sm font-medium text-grey-700 hover:bg-grey-100"
                disabled={busy}
                onClick={() => setDeletingSession(null)}
                ref={deleteCancelRef}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-10 rounded-lg bg-error-500 px-4 text-sm font-semibold text-white hover:opacity-90"
                disabled={busy}
                onClick={() => void deleteSession()}
                type="button"
              >
                Delete chat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
