import { Badge } from "@seed-design/react";
import { formatDDay } from "@/lib/customers/trial";

// 아직 남았으면 경고(노랑), 오늘이거나 지났으면 위험(빨강).
export default function TrialDDayBadge({ dday }: { dday: number }) {
  return (
    <Badge tone={dday > 0 ? "warning" : "critical"} variant="solid">
      {formatDDay(dday)}
    </Badge>
  );
}
