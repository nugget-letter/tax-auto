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

function Chip({ active, to, children }: { active: boolean; to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default function StatusFilterChips({ current, counts, total, q }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip active={current === null} to={href(null, q)}>
        전체 {total}
      </Chip>
      {CUSTOMER_STATUSES.map((status) => (
        <Chip key={status} active={current === status} to={href(status, q)}>
          {CUSTOMER_STATUS_LABELS[status]} {counts[status]}
        </Chip>
      ))}
    </div>
  );
}
