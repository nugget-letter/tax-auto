import type { PageStatus } from "@/lib/pages/types";

const LABELS: Record<PageStatus, string> = {
  draft: "임시저장",
  published: "발행",
  archived: "보관",
};

const STYLES: Record<PageStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-400",
};

export default function StatusBadge({ status }: { status: PageStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
