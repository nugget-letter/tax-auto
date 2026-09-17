import { formatDDay } from "@/lib/customers/trial";
import Chip from "@/components/ui/Chip";

/** D-4 이상은 앰버로 여유, D-3 이하는 빨강으로 급함을 나타낸다. */
export default function TrialDDayBadge({ dday }: { dday: number }) {
  return <Chip tone={dday >= 4 ? "amber" : "red"}>{formatDDay(dday)}</Chip>;
}
