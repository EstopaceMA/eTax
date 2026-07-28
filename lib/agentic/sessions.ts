import { randomUUID } from "node:crypto";
import { buildAgenticSnapshot } from "@/lib/agentic/presentation";
import { refreshAgenticPlan } from "@/lib/agentic/orchestrator";
import type {
  AgenticAnswerFact,
  AgenticAnswerTopic,
  AgenticSessionDetail,
  AgenticSessionEvent,
  AgenticSessionSnapshot,
  AgenticSessionSummary,
  AgenticSnapshotResponse,
  AgenticStage,
} from "@/lib/agentic/types";
import {
  filingQuarters,
  getQuarterMeta,
  isFilingPeriodOpen,
  type FilingQuarter,
} from "@/lib/filing-periods";
import { createAdminClient } from "@/lib/supabase/admin";

const defaultSessionTitle = "New filing chat";
const eventPageSize = 50;

type SessionRow = {
  id: string;
  user_id: string;
  title: string;
  title_is_custom: boolean;
  pinned_at: string | null;
  active_quarter: FilingQuarter | null;
  active_context_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
};

type EventRow = {
  id: string;
  sequence_number: number;
  session_id: string;
  user_id: string;
  context_id: string | null;
  role: "user" | "assistant";
  kind:
    | "user_text"
    | "assistant_text"
    | "assistant_data"
    | "switch_to_ask"
    | "period_selection"
    | "period_context"
    | "workflow_stage";
  content: string;
  quarter: FilingQuarter | null;
  stage: AgenticStage | null;
  topic: AgenticAnswerTopic | null;
  facts: AgenticAnswerFact[];
  snapshot_version: string | null;
  client_request_id: string | null;
  reply_to_event_id: string | null;
  created_at: string;
};

export class AgenticSessionNotFoundError extends Error {}
export class AgenticSessionConflictError extends Error {}

function cleanTitle(value: string, limit = 80) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function automaticSessionTitle(value: string) {
  const title = cleanTitle(value, 60);
  return title || defaultSessionTitle;
}

function periodSelectionContent() {
  return "Which filing period would you like to work on?";
}

export function buildPeriodSelectionBlock() {
  const now = new Date();

  return {
    type: "period_selection" as const,
    periods: filingQuarters.map(({ quarter, label, period, formCode, opensOn }) => ({
      quarter,
      label,
      period,
      formCode,
      isOpen: isFilingPeriodOpen(opensOn, now),
    })),
  };
}

function mapEvent(row: EventRow): AgenticSessionEvent {
  const base = {
    id: row.id,
    sequenceNumber: Number(row.sequence_number),
    content: row.content,
    contextId: row.context_id,
    quarter: row.quarter,
    createdAt: row.created_at,
  };

  if (row.kind === "user_text") {
    return { ...base, kind: row.kind, role: "user" };
  }

  if (row.kind === "assistant_data") {
    return {
      ...base,
      kind: row.kind,
      role: "assistant",
      facts: Array.isArray(row.facts) ? row.facts : [],
      topic: row.topic ?? "summary",
    };
  }

  if (row.kind === "workflow_stage") {
    return {
      ...base,
      kind: row.kind,
      role: "assistant",
      stage: row.stage ?? "records",
      snapshotVersion: row.snapshot_version ?? "",
    };
  }

  return { ...base, kind: row.kind, role: "assistant" };
}

async function filingStatusByPeriod(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("filing_obligations")
    .select("period, status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Could not load filing statuses: ${error.message}`);
  }

  return new Map(
    (data ?? []).map(({ period, status }) => [String(period), String(status)]),
  );
}

function summarizeSession(
  row: SessionRow,
  statuses: Map<string, string>,
): AgenticSessionSummary {
  const period = row.active_quarter
    ? getQuarterMeta(row.active_quarter).period
    : null;

  return {
    id: row.id,
    title: row.title,
    activeQuarter: row.active_quarter,
    activeContextId: row.active_context_id,
    activePeriod: period,
    filingStatus: period ? statuses.get(period) ?? null : null,
    isPinned: row.pinned_at !== null,
    pinnedAt: row.pinned_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at,
  };
}

export async function listAgenticChatSessions(userId: string) {
  const admin = createAdminClient();
  const [sessionResult, statuses] = await Promise.all([
    admin
      .from("agentic_chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("last_opened_at", { ascending: false }),
    filingStatusByPeriod(userId),
  ]);

  if (sessionResult.error) {
    throw new Error(`Could not load filing chats: ${sessionResult.error.message}`);
  }

  const rows = (sessionResult.data ?? []) as SessionRow[];
  const selected = rows.reduce<SessionRow | null>((latest, row) => {
    if (!latest) {
      return row;
    }

    return new Date(row.last_opened_at) > new Date(latest.last_opened_at)
      ? row
      : latest;
  }, null);

  return {
    sessions: rows.map((row) => summarizeSession(row, statuses)),
    selectedSessionId: selected?.id ?? null,
  };
}

export async function getAgenticChatSession(
  userId: string,
  sessionId: string,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agentic_chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load filing chat: ${error.message}`);
  }

  if (!data) {
    throw new AgenticSessionNotFoundError("Filing chat not found.");
  }

  return data as SessionRow;
}

export async function createAgenticChatSession({
  title = defaultSessionTitle,
  userId,
}: {
  title?: string;
  userId: string;
}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("agentic_chat_sessions")
    .insert({
      user_id: userId,
      title: automaticSessionTitle(title),
      title_is_custom: false,
      updated_at: now,
      last_opened_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not create filing chat: ${error.message}`);
  }

  return data as SessionRow;
}

export async function renameAgenticChatSession({
  expectedVersion,
  sessionId,
  title,
  userId,
}: {
  expectedVersion: number;
  sessionId: string;
  title: string;
  userId: string;
}) {
  const nextTitle = cleanTitle(title);

  if (!nextTitle) {
    throw new Error("Enter a chat title.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("agentic_chat_sessions")
    .update({
      title: nextTitle,
      title_is_custom: true,
      version: expectedVersion + 1,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("version", expectedVersion)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not rename filing chat: ${error.message}`);
  }

  if (!data) {
    const existing = await getAgenticChatSession(userId, sessionId);
    throw new AgenticSessionConflictError(
      `This chat changed from version ${expectedVersion} to ${existing.version}.`,
    );
  }

  return data as SessionRow;
}

export async function setAgenticChatSessionPinned({
  expectedVersion,
  pinned,
  sessionId,
  userId,
}: {
  expectedVersion: number;
  pinned: boolean;
  sessionId: string;
  userId: string;
}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("agentic_chat_sessions")
    .update({
      pinned_at: pinned ? now : null,
      version: expectedVersion + 1,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("version", expectedVersion)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not ${pinned ? "pin" : "unpin"} filing chat: ${error.message}`);
  }

  if (!data) {
    const existing = await getAgenticChatSession(userId, sessionId);
    throw new AgenticSessionConflictError(
      `This chat changed from version ${expectedVersion} to ${existing.version}.`,
    );
  }

  return data as SessionRow;
}

export async function deleteAgenticChatSession(
  userId: string,
  sessionId: string,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agentic_chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not delete filing chat: ${error.message}`);
  }

  if (!data) {
    throw new AgenticSessionNotFoundError("Filing chat not found.");
  }
}

export async function appendAgenticSessionEvent({
  clientRequestId,
  content,
  contextId,
  facts = [],
  kind,
  quarter,
  replyToEventId,
  role,
  sessionId,
  snapshotVersion,
  stage,
  topic,
  userId,
}: {
  clientRequestId?: string;
  content: string;
  contextId?: string | null;
  facts?: AgenticAnswerFact[];
  kind: EventRow["kind"];
  quarter?: FilingQuarter | null;
  replyToEventId?: string;
  role: EventRow["role"];
  sessionId: string;
  snapshotVersion?: string;
  stage?: AgenticStage;
  topic?: AgenticAnswerTopic;
  userId: string;
}) {
  const admin = createAdminClient();
  const payload = {
    session_id: sessionId,
    user_id: userId,
    context_id: contextId ?? null,
    role,
    kind,
    content: content.trim().slice(0, 4000),
    quarter: quarter ?? null,
    stage: stage ?? null,
    topic: topic ?? null,
    facts,
    snapshot_version: snapshotVersion ?? null,
    client_request_id: clientRequestId ?? null,
    reply_to_event_id: replyToEventId ?? null,
  };
  const { data, error } = await admin
    .from("agentic_chat_events")
    .insert(payload)
    .select("*")
    .single();

  if (!error) {
    const now = new Date().toISOString();
    await admin
      .from("agentic_chat_sessions")
      .update({ updated_at: now, last_opened_at: now })
      .eq("id", sessionId)
      .eq("user_id", userId);
    return data as EventRow;
  }

  if (error.code === "23505" && clientRequestId) {
    const { data: existing } = await admin
      .from("agentic_chat_events")
      .select("*")
      .eq("session_id", sessionId)
      .eq("client_request_id", clientRequestId)
      .maybeSingle();

    if (existing) {
      return existing as EventRow;
    }
  }

  if (error.code === "23505" && replyToEventId) {
    const { data: existing } = await admin
      .from("agentic_chat_events")
      .select("*")
      .eq("session_id", sessionId)
      .eq("reply_to_event_id", replyToEventId)
      .maybeSingle();

    if (existing) {
      return existing as EventRow;
    }
  }

  throw new Error(`Could not save filing chat event: ${error.message}`);
}

async function appendWorkflowStages({
  contextId,
  quarter,
  sessionId,
  snapshot: providedSnapshot,
  userId,
}: {
  contextId: string;
  quarter: FilingQuarter;
  sessionId: string;
  snapshot?: AgenticSnapshotResponse;
  userId: string;
}) {
  const admin = createAdminClient();
  const snapshot =
    providedSnapshot ??
    buildAgenticSnapshot(await refreshAgenticPlan(quarter));
  const { data: existing, error } = await admin
    .from("agentic_chat_events")
    .select("stage")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("context_id", contextId)
    .eq("kind", "workflow_stage");

  if (error) {
    throw new Error(`Could not reconcile filing chat: ${error.message}`);
  }

  const existingStages = new Set(
    (existing ?? []).map(({ stage }) => String(stage)),
  );

  for (const item of snapshot.timeline) {
    if (existingStages.has(item.stage)) {
      continue;
    }

    await appendAgenticSessionEvent({
      content: item.narration,
      contextId,
      kind: "workflow_stage",
      quarter,
      role: "assistant",
      sessionId,
      snapshotVersion: snapshot.snapshotVersion,
      stage: item.stage,
      userId,
    });
  }

  return snapshot;
}

export async function selectAgenticSessionPeriod({
  expectedVersion,
  quarter,
  sessionId,
  userId,
}: {
  expectedVersion: number;
  quarter: FilingQuarter;
  sessionId: string;
  userId: string;
}) {
  const current = await getAgenticChatSession(userId, sessionId);

  if (current.version !== expectedVersion) {
    throw new AgenticSessionConflictError("This chat changed. Refresh and try again.");
  }

  if (
    current.active_quarter === quarter &&
    current.active_context_id
  ) {
    const snapshot = await appendWorkflowStages({
      contextId: current.active_context_id,
      quarter,
      sessionId,
      userId,
    });

    return { session: current, snapshot };
  }

  const admin = createAdminClient();
  const meta = getQuarterMeta(quarter);
  const contextId = randomUUID();
  const now = new Date().toISOString();
  const nextTitle =
    current.title === defaultSessionTitle && !current.title_is_custom
      ? `${meta.shortLabel} 2026 filing`
      : current.title;
  const { data, error } = await admin
    .from("agentic_chat_sessions")
    .update({
      active_quarter: quarter,
      active_context_id: contextId,
      title: nextTitle,
      version: expectedVersion + 1,
      updated_at: now,
      last_opened_at: now,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("version", expectedVersion)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not change filing period: ${error.message}`);
  }

  if (!data) {
    throw new AgenticSessionConflictError("This chat changed. Refresh and try again.");
  }

  await appendAgenticSessionEvent({
    content: `We’ll work from the verified ${meta.period} filing data.`,
    contextId,
    kind: "period_context",
    quarter,
    role: "assistant",
    sessionId,
    userId,
  });
  const snapshot = await appendWorkflowStages({
    contextId,
    quarter,
    sessionId,
    userId,
  });

  return { session: data as SessionRow, snapshot };
}

export async function appendPeriodSelection({
  replyToEventId,
  sessionId,
  userId,
}: {
  replyToEventId?: string;
  sessionId: string;
  userId: string;
}) {
  return appendAgenticSessionEvent({
    content: periodSelectionContent(),
    kind: "period_selection",
    replyToEventId,
    role: "assistant",
    sessionId,
    userId,
  });
}

export async function reconcileAgenticChatSession({
  activeContextId,
  expectedVersion,
  sessionId,
  snapshot,
  userId,
}: {
  activeContextId: string | null;
  expectedVersion: number;
  sessionId: string;
  snapshot?: AgenticSnapshotResponse;
  userId: string;
}) {
  const session = await getAgenticChatSession(userId, sessionId);

  if (
    session.version !== expectedVersion ||
    session.active_context_id !== activeContextId
  ) {
    throw new AgenticSessionConflictError("This chat context changed. Reload it and try again.");
  }

  if (session.active_quarter && session.active_context_id) {
    await appendWorkflowStages({
      contextId: session.active_context_id,
      quarter: session.active_quarter,
      sessionId,
      snapshot,
      userId,
    });
  }

  const admin = createAdminClient();
  await admin
    .from("agentic_chat_sessions")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return loadAgenticSessionDetail(
    userId,
    sessionId,
    null,
    snapshot ? [{ quarter: session.active_quarter!, snapshot }] : [],
  );
}

export async function loadAgenticSessionDetail(
  userId: string,
  sessionId: string,
  before?: number | null,
  knownSnapshots: AgenticSessionSnapshot[] = [],
): Promise<AgenticSessionDetail> {
  const admin = createAdminClient();
  const session = await getAgenticChatSession(userId, sessionId);
  let eventQuery = admin
    .from("agentic_chat_events")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("sequence_number", { ascending: false })
    .limit(eventPageSize);

  if (before) {
    eventQuery = eventQuery.lt("sequence_number", before);
  }

  const [eventResult, statuses] = await Promise.all([
    eventQuery,
    filingStatusByPeriod(userId),
  ]);

  if (eventResult.error) {
    throw new Error(`Could not load filing chat events: ${eventResult.error.message}`);
  }

  const rows = ((eventResult.data ?? []) as EventRow[]).reverse();
  const quarters = new Set<FilingQuarter>();

  for (const event of rows) {
    if (event.quarter) {
      quarters.add(event.quarter);
    }
  }

  if (session.active_quarter) {
    quarters.add(session.active_quarter);
  }

  const knownSnapshotMap = new Map(
    knownSnapshots.map((item) => [item.quarter, item.snapshot]),
  );
  const snapshots = await Promise.all(
    Array.from(quarters).map(async (quarter) => ({
      quarter,
      snapshot:
        knownSnapshotMap.get(quarter) ??
        buildAgenticSnapshot(await refreshAgenticPlan(quarter)),
    })),
  );

  return {
    session: summarizeSession(session, statuses),
    events: rows.map(mapEvent),
    snapshots,
    olderCursor:
      rows.length === eventPageSize ? rows[0]?.sequence_number ?? null : null,
  };
}
