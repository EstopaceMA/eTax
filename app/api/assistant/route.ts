import { NextResponse } from "next/server";
import {
  buildAgenticTaxPrompt,
  isEtaxAppQuestion,
} from "@/lib/assistant/prompts";
import { findEtaxHelpDocuments } from "@/lib/assistant/knowledge";
import { generateEgovAssistantResponse } from "@/lib/egov/ai-assistant";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace, getWorkspaceData } from "@/lib/data";
import { getAgenticPlan, refreshAgenticPlan } from "@/lib/agentic/orchestrator";
import {
  buildAgenticDataAnswer,
  buildAgenticSnapshot,
  classifyAgenticChatRequest,
  isAgenticAnswerTopic,
  quarterFromAgenticRequest,
} from "@/lib/agentic/presentation";
import type { FilingQuarter } from "@/lib/filing-periods";
import type { AgenticChatHistoryItem } from "@/lib/agentic/types";

const maxQuestionLength = 1_500;
const maxAgenticHistoryItems = 6;
const maxAgenticHistoryLength = 500;

function parseAgenticHistory(value: unknown): AgenticChatHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(-maxAgenticHistoryItems).flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("role" in item) ||
      (item.role !== "agent" && item.role !== "user") ||
      !("content" in item) ||
      typeof item.content !== "string"
    ) {
      return [];
    }

    const content = item.content.trim().slice(0, maxAgenticHistoryLength);

    if (!content) {
      return [];
    }

    return [
      {
        role: item.role,
        content,
        ...("topic" in item && isAgenticAnswerTopic(item.topic)
          ? { topic: item.topic }
          : {}),
      },
    ];
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to use eTax AI Assistant." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request must contain JSON." }, { status: 400 });
  }

  const question =
    typeof body === "object" &&
    body !== null &&
    "question" in body &&
    typeof body.question === "string"
      ? body.question.trim()
      : "";
  const requestedMode =
    typeof body === "object" &&
    body !== null &&
    "mode" in body &&
    body.mode === "agentic"
      ? "agentic"
      : "ask";
  const requestedQuarter =
    typeof body === "object" &&
    body !== null &&
    "quarter" in body &&
    (body.quarter === 1 || body.quarter === 2 || body.quarter === 3 || body.quarter === 4)
      ? (body.quarter as FilingQuarter)
      : 2;
  const recentHistory =
    typeof body === "object" && body !== null && "history" in body
      ? parseAgenticHistory(body.history)
      : [];

  if (!question) {
    return NextResponse.json({ error: "Enter a question first." }, { status: 400 });
  }

  if (question.length > maxQuestionLength) {
    return NextResponse.json(
      { error: `Keep your question under ${maxQuestionLength.toLocaleString()} characters.` },
      { status: 400 },
    );
  }

  try {
    if (requestedMode === "agentic") {
      const intent = classifyAgenticChatRequest(question, recentHistory);

      if (intent.kind === "switch_to_ask") {
        return NextResponse.json({
          answer:
            "That sounds like a tax question rather than a filing task. Switch to Ask eTax for an explanation.",
          kind: "switch_to_ask",
          mode: "agentic",
          switchToAsk: true,
        });
      }

      await ensureWorkspace();
      const inferredQuarter = quarterFromAgenticRequest(question) as FilingQuarter | null;
      const plan = await refreshAgenticPlan(inferredQuarter ?? requestedQuarter);
      const snapshot = buildAgenticSnapshot(plan);

      if (intent.kind === "data") {
        return NextResponse.json({
          ...snapshot,
          ...buildAgenticDataAnswer(plan, intent.topic),
          kind: "data",
        });
      }

      if (intent.kind === "courtesy") {
        return NextResponse.json({
          ...snapshot,
          kind: "workflow",
          narration:
            plan.progress === 100
              ? "You’re welcome. This filing journey is complete, and its verified records remain available above."
              : `You’re welcome. Your progress for ${plan.period.period} is preserved whenever you’re ready to continue.`,
        });
      }

      return NextResponse.json({
        ...snapshot,
        kind: "workflow",
      });
    }

    const mode = isEtaxAppQuestion(question) ? "etax-app" : "ph-tax";
    const documents = mode === "etax-app" ? await findEtaxHelpDocuments(question, 2) : [];
    await ensureWorkspace();
    const [plan, workspace] = await Promise.all([
      getAgenticPlan(),
      getWorkspaceData(),
    ]);
    const prompt = buildAgenticTaxPrompt({
      question,
      documents,
      workspaceContext: JSON.stringify({
        activeTask: {
          action: plan.task.action_label,
          blocker: plan.task.blocker,
          confidence: plan.task.confidence,
          owner: plan.task.owner_agent,
          reason: plan.task.reason,
          title: plan.task.title,
        },
        computation: plan.computation
          ? {
              amountPayable: plan.computation.output_snapshot.amountPayable,
              currency: plan.computation.output_snapshot.currency,
              label: "Controlled demo computation",
              period: plan.computation.input_snapshot.period,
              ruleVersion: plan.rule.version,
            }
          : null,
        filingStatus: workspace.filingObligations.find(
          ({ period }) => period === plan.period.period,
        )?.status,
        paymentStatus: workspace.filingObligations.find(
          ({ period }) => period === plan.period.period,
        )?.payment_status,
        progress: plan.progress,
        taxpayerClass: workspace.taxpayerProfile?.taxpayer_type,
      }),
    });
    const result = await generateEgovAssistantResponse(prompt);

    return NextResponse.json({
      answer: result.answer,
      assumptions: plan.computation?.assumptions ?? [],
      classification: "recommendation",
      confidence: plan.task.confidence,
      mode,
      nextAction: {
        href: plan.task.action_href,
        label: plan.task.action_label,
        title: plan.task.title,
      },
      sources: [
        ...documents.map(({ filename }) => filename),
        plan.rule.sourceTitle,
      ],
    });
  } catch (error) {
    console.error("eTax assistant request failed", error);

    return NextResponse.json(
      { error: "The assistant could not answer right now. Please try again." },
      { status: 502 },
    );
  }
}
