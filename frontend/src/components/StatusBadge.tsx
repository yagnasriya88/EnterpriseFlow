import { Badge, type BadgeTone } from "@/components/ui/Badge";

const TONES: Record<string, BadgeTone> = {
  draft: "neutral",
  pending_approval: "warning",
  pending: "warning",
  approved: "success",
  edited: "info",
  sent: "primary",
  rejected: "danger",
  active: "success",
  closed: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}
