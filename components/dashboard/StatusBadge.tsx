import type { PageStatus } from "@/lib/pages/types";

const LABELS: Record<PageStatus, string> = {
  draft: "임시저장",
  published: "발행",
  archived: "보관",
};

const STYLES: Record<PageStatus, string> = {
  draft: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  published: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
  archived: "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
};

const DOT_STYLES: Record<PageStatus, string> = {
  draft: "bg-amber-500",
  published: "bg-green-500",
  archived: "bg-slate-400",
};

export default function StatusBadge({ status }: { status: PageStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status]}`} />
      {LABELS[status]}
    </span>
  );
}
