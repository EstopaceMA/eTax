import { NextResponse } from "next/server";
import {
  AgenticSessionConflictError,
  AgenticSessionNotFoundError,
  deleteAgenticChatSession,
  loadAgenticSessionDetail,
  renameAgenticChatSession,
  setAgenticChatSessionPinned,
} from "@/lib/agentic/sessions";
import { ensureWorkspace } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

async function authenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function routeError(error: unknown) {
  if (error instanceof AgenticSessionNotFoundError) {
    return NextResponse.json({ error: "Filing chat not found." }, { status: 404 });
  }

  if (error instanceof AgenticSessionConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  console.error("Agentic filing chat request failed.", error);
  return NextResponse.json(
    { error: "The filing chat could not be updated right now." },
    { status: 502 },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to view this filing chat." }, { status: 401 });
  }

  const { sessionId } = await params;
  const cursorValue = Number(new URL(request.url).searchParams.get("before"));
  const cursor = Number.isSafeInteger(cursorValue) && cursorValue > 0
    ? cursorValue
    : null;

  try {
    await ensureWorkspace();
    return NextResponse.json(
      await loadAgenticSessionDetail(user.id, sessionId, cursor),
    );
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to rename this filing chat." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request must contain JSON." }, { status: 400 });
  }

  const bodyRecord =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  const title =
    typeof bodyRecord?.title === "string" ? bodyRecord.title.trim() : "";
  const hasTitle = bodyRecord ? "title" in bodyRecord : false;
  const hasPinned = bodyRecord ? "pinned" in bodyRecord : false;
  const pinned =
    hasPinned && typeof bodyRecord?.pinned === "boolean"
      ? bodyRecord.pinned
      : null;
  const expectedVersion =
    Number.isInteger(bodyRecord?.expectedVersion)
      ? Number(bodyRecord?.expectedVersion)
      : 0;

  if (
    expectedVersion < 1 ||
    hasTitle === hasPinned ||
    (hasTitle && (!title || title.length > 80)) ||
    (hasPinned && pinned === null)
  ) {
    return NextResponse.json(
      { error: "Provide one valid chat update and the current chat version." },
      { status: 400 },
    );
  }

  const { sessionId } = await params;

  try {
    if (hasTitle) {
      await renameAgenticChatSession({
        expectedVersion,
        sessionId,
        title,
        userId: user.id,
      });
    } else {
      await setAgenticChatSessionPinned({
        expectedVersion,
        pinned: pinned!,
        sessionId,
        userId: user.id,
      });
    }

    return NextResponse.json(await loadAgenticSessionDetail(user.id, sessionId));
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to delete this filing chat." }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    await deleteAgenticChatSession(user.id, sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
