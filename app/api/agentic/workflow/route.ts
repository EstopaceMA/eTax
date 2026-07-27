import { NextResponse } from "next/server";
import { buildAgenticSnapshot } from "@/lib/agentic/presentation";
import { refreshAgenticPlan } from "@/lib/agentic/orchestrator";
import type { FilingQuarter } from "@/lib/filing-periods";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/data";

function parseQuarter(value: string | null): FilingQuarter | null {
  const quarter = Number(value);
  return quarter === 1 || quarter === 2 || quarter === 3 || quarter === 4
    ? quarter
    : null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to use agentic filing." }, { status: 401 });
  }

  const quarter = parseQuarter(new URL(request.url).searchParams.get("quarter"));

  if (!quarter) {
    return NextResponse.json({ error: "Choose a filing period from 1 to 4." }, { status: 400 });
  }

  try {
    await ensureWorkspace();
    const plan = await refreshAgenticPlan(quarter);
    return NextResponse.json(buildAgenticSnapshot(plan));
  } catch (error) {
    console.error("Could not load the agentic filing workflow.", error);
    return NextResponse.json(
      { error: "The filing workflow could not be loaded right now." },
      { status: 502 },
    );
  }
}
