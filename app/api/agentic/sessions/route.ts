import { NextResponse } from "next/server";
import {
  createAgenticChatSession,
  listAgenticChatSessions,
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

export async function GET() {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to view filing chats." }, { status: 401 });
  }

  try {
    await ensureWorkspace();
    return NextResponse.json(await listAgenticChatSessions(user.id));
  } catch (error) {
    console.error("Could not list agentic filing chats.", error);
    return NextResponse.json(
      { error: "Filing chats could not be loaded right now." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to create a filing chat." }, { status: 401 });
  }

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    // An empty body creates a default chat.
  }

  const title =
    typeof body === "object" &&
    body !== null &&
    "title" in body &&
    typeof body.title === "string"
      ? body.title
      : undefined;

  try {
    await ensureWorkspace();
    const session = await createAgenticChatSession({
      title,
      userId: user.id,
    });
    return NextResponse.json({ sessionId: session.id }, { status: 201 });
  } catch (error) {
    console.error("Could not create agentic filing chat.", error);
    return NextResponse.json(
      { error: "The filing chat could not be created right now." },
      { status: 502 },
    );
  }
}
