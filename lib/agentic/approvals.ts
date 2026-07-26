import { approvalPayloadHash } from "@/lib/agentic/domain";
import { appendAudit } from "@/lib/agentic/orchestrator";
import { createClient } from "@/lib/supabase/server";
import type { AgentTask } from "@/lib/agentic/types";

export async function createExactApproval(input: {
  userId: string;
  task: AgentTask;
  actionType: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const payloadHash = approvalPayloadHash({
    userId: input.userId,
    actionType: input.actionType,
    targetId: input.targetId,
    payload: input.payload,
  });
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("approval_artifacts")
    .select("*")
    .eq("user_id", input.userId)
    .eq("payload_hash", payloadHash)
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && existing.status !== "expired" && existing.status !== "revoked") {
    return existing as { id: string; payload_hash: string; expires_at: string };
  }

  const { data, error } = await supabase
    .from("approval_artifacts")
    .insert({
      user_id: input.userId,
      agent_task_id: input.task.id,
      action_type: input.actionType,
      target_type: input.targetType,
      target_id: input.targetId,
      payload_hash: payloadHash,
      payload_snapshot: input.payload,
      status: "approved",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not record exact-action approval: ${error.message}`);
  }

  await appendAudit(supabase, {
    userId: input.userId,
    actorType: "user",
    actorId: input.userId,
    action: `${input.actionType}.approved`,
    targetType: input.targetType,
    targetId: input.targetId,
    eventData: { approvalId: data.id, payloadHash },
  });

  return data as { id: string; payload_hash: string; expires_at: string };
}
