import Link from "next/link";
import { CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS, type CustomerStatus } from "@/lib/customers/types";

type Props = {
  current: CustomerStatus | null;
  counts: Record<CustomerStatus, number>;
  total: number;
  q: string;
};

function href(status: CustomerStatus | null, q: string): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/admin/customers?${query}` : "/admin/customers";
}

function FilterChip({ active, to, children }: { active: boolean; to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={`focus-flame rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-navy-900 text-white" : "glass-field text-[#4b5563] hover:bg-white/90"
      }`}
    >
      {children}
    </Link>
  );
}

export default function StatusFilterChips({ current, counts, total, q }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterChip active={current === null} to={href(null, q)}>
        전체 {total}
      </FilterChip>
      {CUSTOMER_STATUSES.map((status) => (
        <FilterChip key={status} active={current === status} to={href(status, q)}>
          {CUSTOMER_STATUS_LABELS[status]} {counts[status]}
        </FilterChip>
      ))}
    </div>
  );
}
