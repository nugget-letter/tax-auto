import type { PageStatus } from "@/lib/pages/types";
import { getPageBadge } from "@/lib/pages/badge";
import type { Tone } from "@/lib/ui/tones";
import Chip from "@/components/ui/Chip";

// getPageBadge는 seed-design 어휘로 tone을 낸다. 기존 테스트가 그 값을
// 검사하므로 건드리지 않고, 여기서 우리 톤으로 옮긴다.
const TONE_MAP: Record<string, Tone> = {
  warning: "amber",
  neutral: "gray",
  positive: "green",
  informative: "blue",
};

export default function StatusBadge({
  status,
  sentOn,
}: {
  status: PageStatus;
  sentOn: string | null;
}) {
  const { label, tone } = getPageBadge(status, sentOn);
  return <Chip tone={TONE_MAP[tone] ?? "gray"}>{label}</Chip>;
}
