"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Box, HStack, Text } from "@seed-design/react";
import type { CustomerRecord } from "@/lib/customers/types";
import { formatDate } from "@/lib/format";
import { getTrialDDay, getTrialEndsOn } from "@/lib/customers/trial";
import CustomerStatusBadge from "./CustomerStatusBadge";
import TrialDDayBadge from "./TrialDDayBadge";
import BulkDeleteBar from "./BulkDeleteBar";

type Props = { customers: CustomerRecord[]; today: string };

function CustomerRow({
  customer,
  isLast,
  today,
  selected,
  onToggle,
}: {
  customer: CustomerRecord;
  isLast: boolean;
  today: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const dday = customer.status === "trial" ? getTrialDDay(customer.trialStartedOn, today) : null;
  const endsOn = getTrialEndsOn(customer.trialStartedOn);
  const contact = [customer.phone, customer.email].filter(Boolean).join(" · ");

  return (
    <HStack
      as="li"
      align="center"
      justify="space-between"
      gap="x4"
      px="x4"
      py="x4"
      borderBottomWidth={isLast ? 0 : 1}
      borderColor="stroke.neutralWeak"
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={`${customer.name} 선택`}
        className="h-4 w-4 flex-none"
      />
      <Box minWidth="0" flexGrow={1}>
        <HStack align="center" gap="x2" minWidth="0">
          <CustomerStatusBadge status={customer.status} />
          <Text as="span" textStyle="t4Medium" color="fg.neutral" maxLines={1}>
            {customer.name}
            {customer.office && ` · ${customer.office}`}
          </Text>
        </HStack>
        <Text as="p" textStyle="t2Regular" color="fg.neutralSubtle" className="mt-1">
          {contact}
        </Text>
        <Text as="p" textStyle="t2Regular" color="fg.neutralSubtle" className="mt-0.5">
          접수 {formatDate(customer.submittedAt)}
          {customer.source && ` · 유입: ${customer.source}`}
        </Text>
      </Box>
      <HStack flexShrink={0} align="center" gap="x3">
        {customer.trialStartedOn && endsOn && (
          <HStack align="center" gap="x2">
            <Text as="span" textStyle="t2Regular" color="fg.neutralSubtle">
              체험 {customer.trialStartedOn.slice(5).replace("-", ".")}~{endsOn.slice(5).replace("-", ".")}
            </Text>
            {dday !== null && <TrialDDayBadge dday={dday} />}
          </HStack>
        )}
        <Link href={`/admin/customers/${customer.id}`} className="text-xs font-medium text-gray-700 underline">
          열기
        </Link>
      </HStack>
    </HStack>
  );
}

export default function CustomersTable({ customers, today }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const headerRef = useRef<HTMLInputElement>(null);

  const visibleIds = useMemo(() => customers.map((c) => c.id).join(","), [customers]);
  const [syncedIds, setSyncedIds] = useState(visibleIds);

  // 필터·검색이 바뀌면 보이는 목록 자체가 달라지므로 선택을 버린다. 화면에 없는
  // 고객이 선택된 채로 남아 있으면 무엇을 지우는지 알 수 없다.
  if (visibleIds !== syncedIds) {
    setSyncedIds(visibleIds);
    setSelected([]);
  }

  const allSelected = customers.length > 0 && selected.length === customers.length;
  const someSelected = selected.length > 0 && !allSelected;

  // indeterminate는 속성이 아니라 DOM 프로퍼티라 JSX로는 지정할 수 없다.
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  if (customers.length === 0) {
    return (
      <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
        조건에 맞는 고객이 없어요.
      </Text>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : customers.map((c) => c.id));
  }

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
        <input
          ref={headerRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4"
        />
        전체 선택
      </label>

      <Box as="ul" borderWidth={1} borderColor="stroke.neutralWeak" borderRadius="r2">
        {customers.map((customer, index) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            isLast={index === customers.length - 1}
            today={today}
            selected={selected.includes(customer.id)}
            onToggle={() => toggle(customer.id)}
          />
        ))}
      </Box>

      {selected.length > 0 && <BulkDeleteBar ids={selected} onCleared={() => setSelected([])} />}
    </div>
  );
}
