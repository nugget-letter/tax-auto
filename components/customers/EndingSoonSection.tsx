import Link from "next/link";
import { Box, HStack, Text } from "@seed-design/react";
import type { CustomerRecord } from "@/lib/customers/types";
import { getTrialDDay } from "@/lib/customers/trial";
import TrialDDayBadge from "./TrialDDayBadge";

type Props = { customers: CustomerRecord[]; today: string };

function ReminderMark({ label, on }: { label: string; on: string | null }) {
  return (
    <Text as="span" textStyle="t2Regular" color={on ? "fg.neutralSubtle" : "fg.critical"}>
      {label} {on ? "✓" : "✗"}
    </Text>
  );
}

export default function EndingSoonSection({ customers, today }: Props) {
  if (customers.length === 0) return null;

  return (
    <Box>
      <Text as="h2" textStyle="t2Bold" color="fg.critical" className="mb-2">
        ⚠ 체험 종료 임박 ({customers.length})
      </Text>
      <Box as="ul" borderWidth={1} borderColor="stroke.criticalWeak" borderRadius="r2">
        {customers.map((customer, index) => (
          <HStack
            key={customer.id}
            as="li"
            align="center"
            justify="space-between"
            gap="x4"
            px="x4"
            py="x3"
            borderBottomWidth={index === customers.length - 1 ? 0 : 1}
            borderColor="stroke.neutralWeak"
          >
            <HStack align="center" gap="x2" minWidth="0">
              <TrialDDayBadge dday={getTrialDDay(customer.trialStartedOn, today)!} />
              <Text as="span" textStyle="t4Medium" color="fg.neutral" maxLines={1}>
                {customer.name}
                {customer.office && ` · ${customer.office}`}
              </Text>
            </HStack>
            <HStack align="center" gap="x3" flexShrink={0}>
              <ReminderMark label="리마인드 1차" on={customer.reminded1On} />
              <ReminderMark label="2차" on={customer.reminded2On} />
              <Link href={`/admin/customers/${customer.id}`} className="text-xs font-medium text-gray-700 underline">
                열기
              </Link>
            </HStack>
          </HStack>
        ))}
      </Box>
    </Box>
  );
}
