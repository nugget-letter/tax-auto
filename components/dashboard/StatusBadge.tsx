import { Badge } from "@seed-design/react";
import type { PageStatus } from "@/lib/pages/types";
import { getPageBadge } from "@/lib/pages/badge";

export default function StatusBadge({
  status,
  sentOn,
}: {
  status: PageStatus;
  sentOn: string | null;
}) {
  const { label, tone } = getPageBadge(status, sentOn);

  return (
    <Badge tone={tone} variant="weak">
      {label}
    </Badge>
  );
}
