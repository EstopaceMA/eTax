import { NextResponse } from "next/server";
import {
  AgenticSessionConflictError,
  AgenticSessionNotFoundError,
  reconcileAgenticChatSession,
} from "@/lib/agentic/sessions";
import { ensureWorkspace } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to refresh this filing chat." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request must contain JSON." }, { status: 400 });
  }

  const expectedVersion =
    typeof body === "object" &&
    body !== null &&
    "expectedVersion" in body &&
    Number.isInteger(body.expectedVersion)
      ? Number(body.expectedVersion)
      : 0;
  const activeContextId =
    typeof body === "object" &&
    body !== null &&
    "activeContextId" in body &&
    (typeof body.activeContextId === "string" || body.activeContextId === null)
      ? body.activeContextId
      : undefined;

  if (expectedVersion < 1 || activeContextId === undefined) {
    return NextResponse.json({ error: "Use the current filing chat context." }, { status: 400 });
  }

  const { sessionId } = await params;

  try {
    await ensureWorkspace();
    return NextResponse.json(
      await reconcileAgenticChatSession({
        activeContextId,
        expectedVersion,
        sessionId,
        userId: user.id,
      }),
    );
  } catch (error) {
    if (error instanceof AgenticSessionNotFoundError) {
      return NextResponse.json({ error: "Filing chat not found." }, { status: 404 });
    }

    if (error instanceof AgenticSessionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Could not reconcile agentic filing chat.", error);
    return NextResponse.json(
      { error: "The filing chat could not be refreshed right now." },
      { status: 502 },
    );
  }
}
