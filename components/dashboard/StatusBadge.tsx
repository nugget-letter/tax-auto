import { Badge } from "@seed-design/react";
import type { PageStatus } from "@/lib/pages/types";

const LABELS: Record<PageStatus, string> = {
  draft: "임시저장",
  published: "발행",
  archived: "보관",
};

const TONES: Record<PageStatus, "warning" | "positive" | "neutral"> = {
  draft: "warning",
  published: "positive",
  archived: "neutral",
};

export default function StatusBadge({ status }: { status: PageStatus }) {
  return (
    <Badge tone={TONES[status]} variant="weak">
      {LABELS[status]}
    </Badge>
  );
}
