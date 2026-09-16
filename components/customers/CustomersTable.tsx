import Link from "next/link";
import { Box, HStack, Text } from "@seed-design/react";
import type { CustomerRecord } from "@/lib/customers/types";
import { formatDate } from "@/lib/format";
import { getTrialDDay, getTrialEndsOn } from "@/lib/customers/trial";
import CustomerStatusBadge from "./CustomerStatusBadge";
import TrialDDayBadge from "./TrialDDayBadge";

type Props = { customers: CustomerRecord[]; today: string };

function CustomerRow({ customer, isLast, today }: { customer: CustomerRecord; isLast: boolean; today: string }) {
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
  if (customers.length === 0) {
    return (
      <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
        조건에 맞는 고객이 없어요.
      </Text>
    );
  }

  return (
    <Box as="ul" borderWidth={1} borderColor="stroke.neutralWeak" borderRadius="r2">
      {customers.map((customer, index) => (
        <CustomerRow
          key={customer.id}
          customer={customer}
          isLast={index === customers.length - 1}
          today={today}
        />
      ))}
    </Box>
  );
}
