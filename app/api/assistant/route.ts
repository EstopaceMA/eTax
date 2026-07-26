import { NextResponse } from "next/server";
import {
  buildAgenticTaxPrompt,
  isEtaxAppQuestion,
} from "@/lib/assistant/prompts";
import { findEtaxHelpDocuments } from "@/lib/assistant/knowledge";
import { generateEgovAssistantResponse } from "@/lib/egov/ai-assistant";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace, getWorkspaceData } from "@/lib/data";
import { getAgenticPlan } from "@/lib/agentic/orchestrator";

const maxQuestionLength = 1_500;

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
          ({ period }) => period === "Q2 2026",
        )?.status,
        paymentStatus: workspace.filingObligations.find(
          ({ period }) => period === "Q2 2026",
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
