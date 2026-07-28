import { NextResponse } from "next/server";
import {
  AgenticSessionConflictError,
  AgenticSessionNotFoundError,
  appendAgenticSessionEvent,
  getAgenticChatSession,
  loadAgenticSessionDetail,
  selectAgenticSessionPeriod,
} from "@/lib/agentic/sessions";
import { ensureWorkspace } from "@/lib/data";
import type { FilingQuarter } from "@/lib/filing-periods";
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
    return NextResponse.json({ error: "Please sign in to select a filing period." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request must contain JSON." }, { status: 400 });
  }

  const quarter =
    typeof body === "object" &&
    body !== null &&
    "quarter" in body &&
    (body.quarter === 1 || body.quarter === 2 || body.quarter === 3 || body.quarter === 4)
      ? (body.quarter as FilingQuarter)
      : null;
  const expectedVersion =
    typeof body === "object" &&
    body !== null &&
    "expectedVersion" in body &&
    Number.isInteger(body.expectedVersion)
      ? Number(body.expectedVersion)
      : 0;
  const clientRequestId =
    typeof body === "object" &&
    body !== null &&
    "clientRequestId" in body &&
    typeof body.clientRequestId === "string"
      ? body.clientRequestId
      : "";

  if (!quarter || expectedVersion < 1 || !/^[0-9a-f-]{36}$/i.test(clientRequestId)) {
    return NextResponse.json(
      { error: "Choose a valid period using the current chat context." },
      { status: 400 },
    );
  }

  const { sessionId } = await params;

  try {
    await ensureWorkspace();
    const session = await getAgenticChatSession(user.id, sessionId);

    if (session.version !== expectedVersion) {
      throw new AgenticSessionConflictError("This chat changed. Refresh and try again.");
    }

    await appendAgenticSessionEvent({
      clientRequestId,
      content: `Work on ${quarter === 4 ? "Annual" : `Q${quarter}`} 2026`,
      contextId: session.active_context_id,
      kind: "user_text",
      quarter: session.active_quarter,
      role: "user",
      sessionId,
      userId: user.id,
    });
    const selected = await selectAgenticSessionPeriod({
      expectedVersion,
      quarter,
      sessionId,
      userId: user.id,
    });
    return NextResponse.json(
      await loadAgenticSessionDetail(user.id, sessionId, null, [
        { quarter, snapshot: selected.snapshot },
      ]),
    );
  } catch (error) {
    if (error instanceof AgenticSessionNotFoundError) {
      return NextResponse.json({ error: "Filing chat not found." }, { status: 404 });
    }

    if (error instanceof AgenticSessionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Could not select an agentic filing period.", error);
    return NextResponse.json(
      { error: "The filing period could not be changed right now." },
      { status: 502 },
    );
  }
}
