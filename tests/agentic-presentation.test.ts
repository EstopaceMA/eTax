import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgenticDataAnswer,
  buildAgenticSnapshot,
  classifyAgenticChatRequest,
  isAgenticTaskRequest,
  quarterFromAgenticRequest,
} from "../lib/agentic/presentation";
import { agenticSteps, type AgenticStep } from "../lib/agentic/domain";
import type { AgenticPlan, AgentTask } from "../lib/agentic/types";

function planAt(
  activeStep: AgenticStep,
  complete = false,
  paymentApproved = false,
): AgenticPlan {
  const activeIndex = agenticSteps.indexOf(activeStep);
  const tasks = agenticSteps.map(
    (taskType, index) =>
      ({
        id: taskType,
        user_id: "user-1",
        filing_obligation_id: "obligation-1",
        task_type: taskType,
        owner_agent: "Filing Agent",
        state:
          complete || index < activeIndex
            ? "completed"
            : index === activeIndex
              ? "ready_for_review"
              : "blocked",
        risk_level: "medium",
        confidence: 1,
        title: taskType,
        reason: "Continue the controlled workflow.",
        blocker: null,
        action_label: "Continue",
        action_href: "/filing",
        evidence: [],
        expected_output: [],
        rule_set_id: null,
        completed_at: complete || index < activeIndex ? "2026-07-27T00:00:00Z" : null,
        created_at: "2026-07-27T00:00:00Z",
        updated_at: "2026-07-27T00:00:00Z",
      }) satisfies AgentTask,
  );

  return {
    task: tasks[activeIndex],
    tasks,
    computation: {
      id: "computation-1",
      filing_obligation_id: "obligation-1",
      rule_set_id: "pilot-rule",
      input_hash: "input-hash",
      input_snapshot: {
        period: "Q2 2026",
        totalIncome: 100_000,
        recordIds: ["record-1"],
      },
      output_snapshot: { amountPayable: 6_000, currency: "PHP" },
      trace: [],
      assumptions: [],
      warnings: [],
      created_at: "2026-07-27T00:00:00Z",
    },
    draft: {
      id: "draft-1",
      filing_obligation_id: "obligation-1",
      computation_run_id: "computation-1",
      version: 1,
      state: complete ? "filed" : "review",
      review_snapshot: {},
      validations: [],
      acknowledgement_reference: "ACK-2026-Q2",
      acknowledged_at: "2026-07-27T00:00:00Z",
      created_at: "2026-07-27T00:00:00Z",
      updated_at: "2026-07-27T00:00:00Z",
    },
    rule: {
      id: "pilot-rule",
      version: "2026.07",
      title: "Pilot rule",
      sourceTitle: "Controlled pilot",
      status: "demo",
    },
    progress: complete ? 100 : Math.round((activeIndex / agenticSteps.length) * 100),
    period: {
      quarter: 2,
      label: "Second quarter",
      shortLabel: "Q2",
      period: "Q2 2026",
      opensOn: "2026-04-01",
      dueDate: "2026-08-15",
      formCode: "1701Q",
      formTitle: "Quarterly Income Tax Return",
      isOpen: true,
      lockedReason: null,
    },
    obligation: {
      id: "obligation-1",
      user_id: "user-1",
      form_name: "BIR Form 1701Q",
      period: "Q2 2026",
      due_date: "2026-08-15",
      status: "review",
      payment_status: "unpaid",
    },
    records: [
      {
        id: "record-1",
        user_id: "user-1",
        quarter: 2,
        period: "Q2 2026",
        original_filename: "income.pdf",
        storage_path: "user-1/income.pdf",
        content_type: "application/pdf",
        size_bytes: 10,
        total_income: 100_000,
        extraction_status: "confirmed",
        extraction_confidence: 0.99,
        extracted_text: null,
        confirmed_at: "2026-07-27T00:00:00Z",
        created_at: "2026-07-27T00:00:00Z",
      },
    ],
    payment: {
      intentState: complete ? "verified" : paymentApproved ? "handed_off" : null,
      approvalRecorded: complete || paymentApproved,
      completed: complete,
      amount: 6_000,
      currency: "PHP",
      reference: complete ? "PAY-Q2-2026" : null,
    },
    snapshotVersion: `snapshot-${activeStep}-${complete}`,
  };
}

test("agentic requests identify filing work and periods", () => {
  assert.equal(isAgenticTaskRequest("Help me file Q2"), true);
  assert.equal(isAgenticTaskRequest("Continue my annual filing"), true);
  assert.equal(quarterFromAgenticRequest("Continue my annual filing"), 4);
  assert.equal(quarterFromAgenticRequest("Prepare my third quarter return"), 3);
});

test("general tax questions stay in Ask eTax", () => {
  assert.equal(isAgenticTaskRequest("What is percentage tax?"), false);
  assert.equal(isAgenticTaskRequest("When is the Q2 deadline?"), false);
  assert.deepEqual(classifyAgenticChatRequest("What is percentage tax?"), {
    kind: "switch_to_ask",
  });
  assert.deepEqual(classifyAgenticChatRequest("When is the Q2 deadline?"), {
    kind: "switch_to_ask",
  });
});

test("courtesy messages stay in the agentic filing conversation", () => {
  for (const message of ["Thanks!!!", "Thank you", "Salamat po!", "Okay", "Got it."]) {
    assert.deepEqual(classifyAgenticChatRequest(message), {
      kind: "courtesy",
    });
  }
});

test("selected-period questions resolve to controlled data topics", () => {
  assert.deepEqual(
    classifyAgenticChatRequest("show me the computation and its total"),
    {
      kind: "data",
      topic: "computation",
    },
  );
  assert.deepEqual(
    classifyAgenticChatRequest(
      "show me the computation and total of my tax for this filing period?",
    ),
    {
      kind: "data",
      topic: "computation",
    },
  );
  assert.deepEqual(classifyAgenticChatRequest("What is my recorded income?"), {
    kind: "data",
    topic: "records",
  });
  assert.deepEqual(classifyAgenticChatRequest("How much do I owe?"), {
    kind: "data",
    topic: "computation",
  });
  assert.deepEqual(classifyAgenticChatRequest("What should I do next?"), {
    kind: "data",
    topic: "next_step",
  });
  assert.deepEqual(classifyAgenticChatRequest("Is payment complete?"), {
    kind: "data",
    topic: "payment",
  });
  assert.deepEqual(classifyAgenticChatRequest("Upload my income record"), {
    kind: "workflow",
  });
});

test("short follow-ups inherit only a whitelisted recent topic", () => {
  assert.deepEqual(
    classifyAgenticChatRequest("What about that?", [
      {
        role: "agent",
        content: "Payment proof is not verified.",
        topic: "payment",
      },
    ]),
    { kind: "data", topic: "payment" },
  );
  assert.deepEqual(
    classifyAgenticChatRequest("Why?", [
      {
        role: "agent",
        content: "The computation is illustrative.",
        topic: "computation",
      },
    ]),
    { kind: "data", topic: "computation" },
  );
  assert.deepEqual(
    classifyAgenticChatRequest("total amount paid I mean", [
      {
        role: "agent",
        content: "The illustrative computation is ₱6,000.00.",
        topic: "computation",
      },
    ]),
    { kind: "data", topic: "payment" },
  );
  assert.deepEqual(
    classifyAgenticChatRequest("what", [
      {
        role: "agent",
        content: "Payment proof is stored and verified.",
        topic: "payment",
      },
    ]),
    { kind: "data", topic: "payment" },
  );
  assert.deepEqual(
    classifyAgenticChatRequest("what", [
      {
        role: "agent",
        content: "No filing acknowledgement is recorded yet.",
        topic: "filing",
      },
      {
        role: "user",
        content: "total amount paid I mean",
      },
      {
        role: "agent",
        content: "Switch to Ask eTax for an explanation.",
      },
    ]),
    { kind: "data", topic: "payment" },
  );
  assert.deepEqual(classifyAgenticChatRequest("What about that?"), {
    kind: "switch_to_ask",
  });
});

test("data answers use exact selected-period facts", () => {
  const plan = planAt("approve_payment", true);
  const records = buildAgenticDataAnswer(plan, "records");
  const computation = buildAgenticDataAnswer(plan, "computation");
  const payment = buildAgenticDataAnswer(plan, "payment");

  assert.equal(records.sourcePeriod, "Q2 2026");
  assert.equal(
    records.facts.find(({ label }) => label === "Confirmed income")?.value,
    "₱100,000.00",
  );
  assert.equal(
    computation.facts.find(({ label }) => label === "Illustrative amount")?.value,
    "₱6,000.00",
  );
  assert.equal(
    payment.facts.find(({ label }) => label === "Payment reference")?.value,
    "PAY-Q2-2026",
  );
  assert.equal(
    payment.facts.find(({ label }) => label === "Payment amount")?.value,
    "₱6,000.00",
  );
  assert.equal(
    payment.facts.find(({ label }) => label === "Payment confirmation")?.value,
    "Confirmed",
  );
});

test("data answers cover configured filing status, dates, blockers, and next action", () => {
  const plan = planAt("capture_acknowledgement");
  const deadline = buildAgenticDataAnswer(plan, "deadline");
  const filing = buildAgenticDataAnswer(plan, "filing");
  const blocker = buildAgenticDataAnswer(plan, "blocker");
  const nextStep = buildAgenticDataAnswer(plan, "next_step");
  const summary = buildAgenticDataAnswer(plan, "summary");

  assert.equal(
    deadline.facts.find(({ label }) => label === "Due date")?.value,
    "Aug 15, 2026",
  );
  assert.equal(
    filing.facts.find(({ label }) => label === "Acknowledgement")?.value,
    "ACK-2026-Q2",
  );
  assert.equal(
    blocker.facts.find(({ label }) => label === "Blocker")?.value,
    "None",
  );
  assert.equal(
    nextStep.facts.find(({ label }) => label === "Next action")?.value,
    "Continue",
  );
  assert.equal(
    summary.facts.find(({ label }) => label === "Filing status")?.value,
    "review",
  );
});

test("a new filing exposes records only", () => {
  const snapshot = buildAgenticSnapshot(planAt("collect_records"));

  assert.deepEqual(
    snapshot.timeline.map(({ stage, state }) => [stage, state]),
    [["records", "active"]],
  );
  assert.equal(snapshot.timeline[0].block?.type, "record_upload");
});

test("the authoritative timeline adds only completed and current stages", () => {
  const review = buildAgenticSnapshot(planAt("review_computation"));
  const handoff = buildAgenticSnapshot(planAt("capture_acknowledgement"));
  const payment = buildAgenticSnapshot(planAt("approve_payment"));

  assert.deepEqual(
    review.timeline.map(({ stage, state }) => [stage, state]),
    [
      ["records", "completed"],
      ["review", "active"],
    ],
  );
  assert.deepEqual(
    handoff.timeline.map(({ stage, state }) => [stage, state]),
    [
      ["records", "completed"],
      ["review", "completed"],
      ["handoff", "active"],
    ],
  );
  assert.deepEqual(
    payment.timeline.map(({ stage, state }) => [stage, state]),
    [
      ["records", "completed"],
      ["review", "completed"],
      ["handoff", "completed"],
      ["payment", "active"],
    ],
  );
});

test("an approved payment waits for gateway confirmation without requesting a receipt", () => {
  const snapshot = buildAgenticSnapshot(planAt("approve_payment", false, true));
  const payment = snapshot.timeline.find(({ stage }) => stage === "payment");

  assert.equal(payment?.state, "active");
  assert.equal(payment?.block?.type, "payment_pending");
});

test("a completed journey reconstructs four read-only summaries", () => {
  const snapshot = buildAgenticSnapshot(planAt("approve_payment", true));

  assert.deepEqual(
    snapshot.timeline.map(({ stage, state, block }) => [stage, state, block]),
    [
      ["records", "completed", null],
      ["review", "completed", null],
      ["handoff", "completed", null],
      ["payment", "completed", null],
    ],
  );
  assert.equal(
    snapshot.timeline.find(({ stage }) => stage === "review")?.summary.some(
      ({ label, value }) => label === "Period" && value === "Q2 2026",
    ),
    true,
  );
});
