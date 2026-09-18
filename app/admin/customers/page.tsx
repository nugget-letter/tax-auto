import Link from "next/link";
import { VStack } from "@seed-design/react";
import { listCustomers } from "@/lib/customers/repository";
import { customerStatusSchema, CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/customers/types";
import { isTrialEndingSoon, todayInSeoul } from "@/lib/customers/trial";
import CustomersTable from "@/components/customers/CustomersTable";
import EndingSoonSection from "@/components/customers/EndingSoonSection";
import StatusFilterChips from "@/components/customers/StatusFilterChips";
import CustomerSearch from "@/components/customers/CustomerSearch";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; q?: string }>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: rawStatus, q: rawQ } = await searchParams;
  const statusFilter: CustomerStatus | null = customerStatusSchema.safeParse(rawStatus).success
    ? (rawStatus as CustomerStatus)
    : null;
  const q = rawQ?.trim() ?? "";

  // 상태 필터는 메모리에서 건다 — 건수 뱃지에 전체 분포가 필요하고, 고객 수가
  // 수백 명 이하라 한 번 다 읽는 편이 쿼리 둘보다 단순하다.
  const all = await listCustomers({ q });
  const today = todayInSeoul();

  const counts = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s, 0])) as Record<CustomerStatus, number>;
  for (const customer of all) counts[customer.status] += 1;

  const filtered = statusFilter ? all.filter((c) => c.status === statusFilter) : all;
  const endingSoon = all.filter((c) => isTrialEndingSoon(c, today));

  return (
    <div className="mx-auto max-w-[1160px] p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-[#111827]">고객 신청</h1>
        <Link href="/admin/customers/new" className="btn-flame focus-flame px-4 py-2 text-sm">
          + 고객 추가
        </Link>
      </div>

      <VStack gap="x8">
        <EndingSoonSection customers={endingSoon} today={today} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusFilterChips current={statusFilter} counts={counts} total={all.length} q={q} />
          <CustomerSearch initialQuery={q} status={statusFilter} />
        </div>
        <CustomersTable customers={filtered} today={today} />
      </VStack>
    </div>
  );
}
