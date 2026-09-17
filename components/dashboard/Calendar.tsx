"use client";

import { useState } from "react";
import Link from "next/link";
import { Text } from "@seed-design/react";
import {
  EVENT_META,
  buildMonthGrid,
  formatMonthLabel,
  groupByDate,
  shiftMonth,
  type CalendarEvent,
  type CalendarEventKind,
} from "@/lib/calendar/events";
import CalendarDayDetail from "./CalendarDayDetail";

type Props = { events: CalendarEvent[]; month: string; today: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function countByKind(events: CalendarEvent[]): [CalendarEventKind, number][] {
  const counts = new Map<CalendarEventKind, number>();
  for (const event of events) counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  return [...counts.entries()];
}

export default function Calendar({ events, month, today }: Props) {
  // 이번 달을 보고 있을 때만 오늘을 미리 펼쳐 둔다. 다른 달로 옮기면 선택이 풀린다.
  const [selected, setSelected] = useState<string | null>(
    month === today.slice(0, 7) ? today : null
  );

  const byDate = groupByDate(events);
  const cells = buildMonthGrid(month);

  return (
    <section className="rounded border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Text as="h2" textStyle="t4Bold" color="fg.neutral">
          {formatMonthLabel(month)}
        </Text>
        <div className="flex items-center gap-1">
          <Link
            href={`/admin?month=${shiftMonth(month, -1)}`}
            aria-label="이전 달"
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          >
            ‹
          </Link>
          <Link href="/admin" className="rounded border border-gray-300 px-2 py-1 text-xs">
            오늘
          </Link>
          <Link
            href={`/admin?month=${shiftMonth(month, 1)}`}
            aria-label="다음 달"
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px text-center">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="pb-1 text-xs text-gray-400">
            {weekday}
          </div>
        ))}

        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="min-h-14" />;

          const dayEvents = byDate[date] ?? [];
          const isToday = date === today;
          const isSelected = date === selected;

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(isSelected ? null : date)}
              className={`min-h-14 rounded p-1 text-left align-top transition-colors ${
                isSelected ? "bg-gray-900 text-white" : "hover:bg-gray-100"
              } ${isToday && !isSelected ? "ring-1 ring-gray-900" : ""}`}
            >
              <span className={`block text-xs ${isSelected ? "text-white" : "text-gray-700"}`}>
                {Number(date.slice(8, 10))}
              </span>
              <span className="mt-0.5 flex flex-wrap gap-0.5 text-[10px] leading-none">
                {countByKind(dayEvents).map(([kind, count]) => (
                  <span key={kind} title={EVENT_META[kind].label}>
                    {EVENT_META[kind].icon}
                    {count > 1 && count}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {selected && <CalendarDayDetail date={selected} events={byDate[selected] ?? []} />}
    </section>
  );
}
