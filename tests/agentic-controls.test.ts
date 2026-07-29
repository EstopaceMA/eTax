import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("viewing a PDF has no filing status side effect", async () => {
  const route = await source("app/api/filing/pdf/route.ts");

  assert.doesNotMatch(route, /\.update\s*\(/);
  assert.doesNotMatch(route, /status:\s*["']ready["']/);
});

test("gateway return completes the approved payment without receipt upload", async () => {
  const route = await source("app/api/egovpay/return/route.ts");

  assert.match(route, /state:\s*["']verified["']/);
  assert.match(route, /payment_status:\s*["']paid["']/);
  assert.match(route, /action:\s*["']payment\.completed["']/);
  assert.doesNotMatch(route, /pending_verification|proof-required/);
});

test("controlled actions keep filing and payment approvals separate", async () => {
  const actions = await source("app/actions/agentic.ts");
  const payment = await source("app/actions/payment.ts");
  const workflow = await source("components/agentic-workflow-message.tsx");

  assert.match(actions, /acknowledgement_reference:\s*reference/);
  assert.match(payment, /actionType:\s*"payment_handoff"/);
  assert.match(payment, /plan\.payment\.approvalRecorded/);
  assert.doesNotMatch(actions, /uploadPaymentProof|payment\.proof_recorded/);
  assert.doesNotMatch(workflow, /Receipt or payment proof|Verify with proof/);
});

test("changes to records in handed-off returns are blocked and audited", async () => {
  const actions = await source("app/actions/workspace.ts");

  assert.match(actions, /locked_record_change/);
  assert.match(actions, /income_record\.change_blocked/);
  assert.match(actions, /returnDraftId/);
});

test("audit events are append-only for authenticated taxpayers", async () => {
  const migration = await source("supabase/migrations/011_agentic_vertical_slice.sql");
  const auditPolicies = migration.slice(migration.indexOf('create policy "Users can append own audit events"'));

  assert.match(auditPolicies, /audit_events for insert/);
  assert.match(auditPolicies, /audit_events for select/);
  assert.doesNotMatch(auditPolicies, /audit_events for update/);
  assert.doesNotMatch(auditPolicies, /audit_events for delete/);
});

test("agentic filing supports period selection and server-side period locks", async () => {
  const orchestrator = await source("lib/agentic/orchestrator.ts");
  const workspaceActions = await source("app/actions/workspace.ts");

  assert.match(orchestrator, /selectedQuarter: FilingQuarter/);
  assert.match(orchestrator, /isFilingPeriodOpen/);
  assert.match(workspaceActions, /This filing period has not opened yet/);
});

test("income evidence stores a content hash for annual deduplication", async () => {
  const migration = await source("supabase/migrations/012_agentic_chat_periods.sql");
  const workspaceActions = await source("app/actions/workspace.ts");

  assert.match(migration, /content_hash/);
  assert.match(workspaceActions, /createHash\("sha256"\)/);
});

test("agentic filing is a main workspace, not an assistant tab", async () => {
  const agenticPage = await source("app/(protected)/agentic/page.tsx");
  const protectedLayout = await source("app/(protected)/layout.tsx");
  const agenticChat = await source("components/agentic-chat.tsx");
  const assistantShell = await source("components/assistant-shell.tsx");
  const navigation = await source("components/app-nav.tsx");

  assert.match(agenticPage, /<AgenticChat/);
  assert.match(agenticPage, /data-full-bleed="true"/);
  assert.doesNotMatch(agenticPage, /rounded-xl|shadow-\[|border border-grey/);
  assert.match(protectedLayout, /protected-main/);
  assert.doesNotMatch(assistantShell, /AgenticChat/);
  assert.match(navigation, /href: "\/agentic"/);
  assert.doesNotMatch(agenticChat, /JourneyProgress/);
});

test("desktop navigation aligns agentic filing and anchors profile at the bottom", async () => {
  const navigation = await source("components/app-nav.tsx");
  const protectedLayout = await source("app/(protected)/layout.tsx");

  assert.match(navigation, /w-\[18px\]/);
  assert.match(navigation, /size=\{item\.icon === "chatbot" \? 24 : 18\}/);
  assert.match(navigation, /className="mt-auto border-t border-grey-300 pt-4"/);
  assert.match(navigation, /href="\/profile"/);
  assert.match(navigation, /<UserRound aria-hidden size=\{18\}/);
  assert.match(
    navigation,
    /aria-current=\{isActive\(pathname, "\/profile"\) \? "page" : undefined\}/,
  );
  assert.match(protectedLayout, /hidden w-\[280px\] flex-col[\s\S]*lg:flex/);
});

test("agentic filing renders an accessible unified session transcript", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");
  const workflowMessage = await source("components/agentic-workflow-message.tsx");

  assert.match(agenticChat, /detail\.events\.map/);
  assert.match(agenticChat, /event\.kind === "workflow_stage"/);
  assert.match(agenticChat, /activeWorkflowEventId/);
  assert.match(workflowMessage, /aria-expanded=\{expanded\}/);
  assert.match(workflowMessage, /eTaxPHCheckIcon\.svg/);
  assert.match(agenticChat, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(agenticChat, /FilingPeriodMenu|Ask about this filing/);
});

test("agentic conversation follows the timeline and uses a fixed bottom composer", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");
  const transcriptIndex = agenticChat.indexOf("detail.events.map");
  const composerIndex = agenticChat.lastIndexOf("<form");

  assert.ok(transcriptIndex > -1);
  assert.ok(composerIndex > transcriptIndex);
  assert.match(agenticChat.slice(composerIndex), /className="shrink-0 px-3 pb-3 sm:px-6"/);
  assert.match(agenticChat, /\.slice\(-6\)/);
  assert.match(agenticChat, /content\.slice\(0, 500\)/);
});

test("agentic answers refresh authenticated data and persist controlled session events", async () => {
  const route = await source("app/api/assistant/route.ts");
  const agenticChat = await source("components/agentic-chat.tsx");
  const sessions = await source("lib/agentic/sessions.ts");

  assert.match(route, /appendAgenticSessionEvent/);
  assert.match(route, /selectAgenticSessionPeriod/);
  assert.match(route, /sessionDetail/);
  assert.match(route, /maxAgenticHistoryItems = 6/);
  assert.match(route, /buildAgenticDataAnswer/);
  assert.match(sessions, /eventPageSize = 50/);
  assert.doesNotMatch(agenticChat, /localStorage|periodStorageKey/);
});

test("agentic filing restores sessions without browser period state", async () => {
  const agenticChat = await source("components/agentic-chat.tsx");

  assert.match(agenticChat, /selectedSessionId/);
  assert.match(agenticChat, /fetchSessionDetail\(selected\)/);
  assert.match(agenticChat, /Which filing period would you like to work on/);
  assert.doesNotMatch(agenticChat, /localStorage|clientReady/);
});

test("assistant surfaces use the branded chatbot icon", async () => {
  const icon = await source("components/chatbot-icon.tsx");
  const assistantChat = await source("components/assistant-chat.tsx");
  const assistantShell = await source("components/assistant-shell.tsx");
  const agenticChat = await source("components/agentic-chat.tsx");
  const navigation = await source("components/app-nav.tsx");

  assert.match(icon, /eTaxPHChatbotIcon\.svg/);

  for (const assistantSurface of [
    assistantChat,
    assistantShell,
    agenticChat,
    navigation,
  ]) {
    assert.match(assistantSurface, /ChatbotIcon/);
    assert.doesNotMatch(assistantSurface, /<Bot\b|MessageCircleQuestion|Headphones/);
  }
});
