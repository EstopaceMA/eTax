import { Badge } from "@/components/ui/badge";

export function statusTone(status: string) {
  if (["complete", "filed", "paid"].includes(status)) {
    return "success" as const;
  }

  if (["ready", "upcoming"].includes(status)) {
    return "primary" as const;
  }

  if (["due_soon", "missing", "unpaid"].includes(status)) {
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
