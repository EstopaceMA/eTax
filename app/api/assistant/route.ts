import { NextResponse } from "next/server";
import {
  buildEtaxAppPrompt,
  buildPhilippineTaxPrompt,
  isEtaxAppQuestion,
} from "@/lib/assistant/prompts";
import { findEtaxHelpDocuments } from "@/lib/assistant/knowledge";
import { generateEgovAssistantResponse } from "@/lib/egov/ai-assistant";
import { createClient } from "@/lib/supabase/server";

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
    const prompt =
      mode === "etax-app"
        ? buildEtaxAppPrompt(question, documents)
        : buildPhilippineTaxPrompt(question);
    const result = await generateEgovAssistantResponse(prompt);

    return NextResponse.json({
      answer: result.answer,
      mode,
      sources: documents.map(({ filename }) => filename),
    });
  } catch (error) {
    console.error("eTax assistant request failed", error);

    return NextResponse.json(
      { error: "The assistant could not answer right now. Please try again." },
      { status: 502 },
    );
  }
}
