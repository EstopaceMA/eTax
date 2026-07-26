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

test("gateway return records pending verification, never paid", async () => {
  const route = await source("app/api/egovpay/return/route.ts");

  assert.match(route, /pending_verification/);
  assert.doesNotMatch(route, /payment_status:\s*["']paid["']/);
});

test("controlled actions require acknowledgement and proof before terminal states", async () => {
  const actions = await source("app/actions/agentic.ts");

  assert.match(actions, /acknowledgement_reference:\s*reference/);
  assert.match(actions, /payment\.proof_recorded/);
  assert.match(actions, /payment_status:\s*"paid"/);
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
