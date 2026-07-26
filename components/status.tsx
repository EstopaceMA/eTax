import { Badge } from "@/components/ui/badge";

export function statusTone(status: string) {
  if (["complete", "confirmed", "filed", "paid", "verified"].includes(status)) {
    return "success" as const;
  }

  if (["ready", "ready_for_review", "upcoming"].includes(status)) {
    return "primary" as const;
  }

  if (
    [
      "approval_required",
      "due_soon",
      "missing",
      "needs_review",
      "pending_verification",
      "provisional",
      "unpaid",
    ].includes(status)
  ) {
    return "warning" as const;
  }

  if (["overdue", "blocked"].includes(status)) {
    return "error" as const;
  }

  return "grey" as const;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replaceAll("_", " ")}</Badge>;
}
