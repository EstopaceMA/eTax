import assert from "node:assert/strict";
import test from "node:test";
import {
  approvalPayloadHash,
  computeDemoLiability,
  DEMO_RULE_ID,
  DEMO_RULE_VERSION,
  isApprovalExpired,
  nextAgenticStep,
  stableHash,
  type WorkflowFacts,
} from "../lib/agentic/domain";

const readyFacts: WorkflowFacts = {
  uploadCount: 1,
  unconfirmedCount: 0,
  hasComputation: true,
  hasDraft: true,
  draftReviewed: true,
  handoffApproved: true,
  acknowledgementCaptured: true,
  paymentApproved: true,
  paymentCompleted: false,
};

test("the controlled demo computation is deterministic and traceable", () => {
  const input = {
    period: "Q2 2026",
    totalIncome: 125_000,
    recordIds: ["record-b", "record-a"],
  };
  const first = computeDemoLiability(input);
  const second = computeDemoLiability(input);

  assert.deepEqual(first, second);
  assert.equal(first.amountPayable, 7_500);
  assert.equal(first.ruleId, DEMO_RULE_ID);
  assert.equal(first.ruleVersion, DEMO_RULE_VERSION);
  assert.ok(first.trace.some(({ label }) => label === "Demo amount payable"));
  assert.ok(first.warnings[0].includes("tax professional"));
});

test("the illustrative six-percent rule rounds to PHP cents", () => {
  const result = computeDemoLiability({
    period: "Q1 2026",
    totalIncome: 100.1,
    recordIds: ["record-a"],
  });

  assert.equal(result.amountPayable, 6.01);
  assert.ok(result.assumptions.some((assumption) => assumption.includes("6%")));
});

test("the same normalized input produces the same idempotency hash", () => {
  const snapshot = {
    period: "Q2 2026",
    recordIds: ["a", "b"],
    totalIncome: 20_000,
  };

  assert.equal(stableHash(snapshot), stableHash({ ...snapshot }));
});

test("unconfirmed evidence blocks computation review", () => {
  assert.equal(
    nextAgenticStep({
      ...readyFacts,
      unconfirmedCount: 1,
      hasComputation: false,
      hasDraft: false,
      draftReviewed: false,
      handoffApproved: false,
      acknowledgementCaptured: false,
      paymentApproved: false,
    }),
    "confirm_extraction",
  );
});

test("filing acknowledgement and payment approval remain separate steps", () => {
  assert.equal(
    nextAgenticStep({
      ...readyFacts,
      acknowledgementCaptured: false,
      paymentApproved: false,
    }),
    "capture_acknowledgement",
  );
  assert.equal(
    nextAgenticStep({
      ...readyFacts,
      paymentApproved: false,
    }),
    "approve_payment",
  );
});

test("approval hashes bind action, target, user, and exact payload", () => {
  const common = {
    userId: "user-1",
    actionType: "payment_handoff",
    targetId: "obligation-1",
    payload: { amount: 7_440, period: "Q2 2026" },
  };

  assert.equal(approvalPayloadHash(common), approvalPayloadHash(common));
  assert.notEqual(
    approvalPayloadHash(common),
    approvalPayloadHash({ ...common, payload: { ...common.payload, amount: 7_441 } }),
  );
  assert.notEqual(
    approvalPayloadHash(common),
    approvalPayloadHash({ ...common, actionType: "filing_handoff" }),
  );
});

test("approval expiry uses an explicit time boundary", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");

  assert.equal(isApprovalExpired("2026-07-25T23:59:59.000Z", now), true);
  assert.equal(isApprovalExpired("2026-07-26T00:10:00.000Z", now), false);
});
