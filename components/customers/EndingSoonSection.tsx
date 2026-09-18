import Link from "next/link";
import { HStack, Text } from "@seed-design/react";
import type { CustomerRecord } from "@/lib/customers/types";
import { getTrialDDay } from "@/lib/customers/trial";
import GlassPanel from "@/components/ui/GlassPanel";
import SectionLabel from "@/components/ui/SectionLabel";
import TrialDDayBadge from "./TrialDDayBadge";

type Props = { customers: CustomerRecord[]; today: string };

function ReminderMark({ label, on }: { label: string; on: string | null }) {
  return (
    <Text as="span" textStyle="t4Regular" color={on ? "fg.neutralSubtle" : "fg.critical"}>
      {label} {on ? "✓" : "✗"}
    </Text>
  );
}

export default function EndingSoonSection({ customers, today }: Props) {
  if (customers.length === 0) return null;

  return (
    <GlassPanel tone="warning" className="p-4">
      <SectionLabel as="h2">⚠ 체험 종료 임박 ({customers.length})</SectionLabel>
      <ul>
        {customers.map((customer, index) => (
          <HStack
            key={customer.id}
            as="li"
            align="center"
            justify="space-between"
            gap="x4"
            px="x4"
            py="x4"
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
              <Link
                href={`/admin/customers/${customer.id}`}
                className="focus-flame rounded text-sm font-medium text-[#4b5563] underline"
              >
                열기
              </Link>
            </HStack>
          </HStack>
        ))}
      </ul>
    </GlassPanel>
  );
}
