import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  automaticSessionTitle,
  buildPeriodSelectionBlock,
} from "../lib/agentic/sessions";

const root = process.cwd();

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("session titles and period choices are deterministic", () => {
  assert.equal(
    automaticSessionTitle("  Help   me file Q2  "),
    "Help me file Q2",
  );
  assert.equal(automaticSessionTitle(" ".repeat(20)), "New filing chat");
  assert.equal(buildPeriodSelectionBlock().periods.length, 4);
});

test("chat session schema isolates transcripts and supports idempotency", async () => {
  const migration = await source(
    "supabase/migrations/015_agentic_chat_sessions.sql",
  );

  assert.match(migration, /create table if not exists public\.agentic_chat_sessions/);
  assert.match(migration, /create table if not exists public\.agentic_chat_events/);
  assert.match(migration, /on delete cascade/);
  assert.match(migration, /client_request_id/);
  assert.match(migration, /agentic_chat_events_client_request_idx/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /Users can read own agentic chat sessions/);
  assert.match(migration, /Users can read own agentic chat events/);
  assert.doesNotMatch(migration, /filing_obligations.*on delete cascade/);
});

test("chat session pins persist without changing filing data", async () => {
  const migration = await source(
    "supabase/migrations/016_agentic_chat_session_pins.sql",
  );
  const sessions = await source("lib/agentic/sessions.ts");

  assert.match(migration, /add column if not exists pinned_at timestamptz/);
  assert.match(migration, /agentic_chat_sessions_pinned_idx/);
  assert.match(migration, /where pinned_at is not null/);
  assert.doesNotMatch(migration, /agentic_chat_events|filing_obligations/);
  assert.match(sessions, /setAgenticChatSessionPinned/);
  assert.match(sessions, /pinned_at: pinned \? now : null/);
  assert.match(sessions, /\.eq\("user_id", userId\)/);
  assert.match(sessions, /\.eq\("version", expectedVersion\)/);
});

test("session APIs authenticate, scope ownership, and reject stale contexts", async () => {
  const detailRoute = await source(
    "app/api/agentic/sessions/[sessionId]/route.ts",
  );
  const reconcileRoute = await source(
    "app/api/agentic/sessions/[sessionId]/reconcile/route.ts",
  );
  const sessions = await source("lib/agentic/sessions.ts");

  assert.match(detailRoute, /supabase\.auth\.getUser/);
  assert.match(sessions, /\.eq\("user_id", userId\)/);
  assert.match(sessions, /AgenticSessionConflictError/);
  assert.match(reconcileRoute, /expectedVersion/);
  assert.match(reconcileRoute, /activeContextId/);
  assert.match(detailRoute, /deleteAgenticChatSession/);
});

test("new chats remain client-only until the first action", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");
  const start = agenticChat.slice(
    agenticChat.indexOf("function startNewChat"),
    agenticChat.indexOf("function toggleEvent"),
  );

  assert.match(start, /setDetail\(null\)/);
  assert.doesNotMatch(start, /fetch\(/);
  assert.match(agenticChat, /method: "POST"/);
  assert.match(agenticChat, /crypto\.randomUUID\(\)/);
});

test("the responsive session UI supports history management and a mobile dialog", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");

  assert.match(agenticChat, /New chat/);
  assert.match(agenticChat, /Rename/);
  assert.match(agenticChat, /Delete chat/);
  assert.match(agenticChat, /aria-modal="true"/);
  assert.match(agenticChat, /event\.key === "Escape"/);
  assert.match(agenticChat, /event\.key !== "Tab"/);
  assert.match(agenticChat, /Load older messages/);
});

test("the session sidebar groups pinned and recent chats", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");

  assert.match(agenticChat, /session\.isPinned/);
  assert.match(agenticChat, /session\.isPinned \? "Unpin chat" : "Pin chat"/);
  assert.match(agenticChat, /\? "Pinned"\s*: "Recent"/);
  assert.match(agenticChat, /left\.pinnedAt/);
  assert.match(agenticChat, /left\.lastOpenedAt/);
  assert.match(agenticChat, /setSessions\(\(current\) =>/);
});

test("session selection updates immediately while its transcript loads", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");
  const openSession = agenticChat.slice(
    agenticChat.indexOf("const openSession"),
    agenticChat.indexOf("useEffect(() =>", agenticChat.indexOf("const openSession")),
  );

  assert.match(
    openSession,
    /setOpeningSessionId\(session\.id\)[\s\S]*await fetchSessionDetail\(session\)/,
  );
  assert.match(
    agenticChat,
    /activeSessionId: openingSessionId \?\? detail\?\.session\.id \?\? null/,
  );
  assert.match(agenticChat, /aria-busy=\{opening\}/);
  assert.match(agenticChat, /requestId !== sessionOpenRequestRef\.current/);
});
