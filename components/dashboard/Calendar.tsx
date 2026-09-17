"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EVENT_META,
  buildMonthGrid,
  formatMonthLabel,
  groupByDate,
  shiftMonth,
  summarizeDay,
  type CalendarEvent,
} from "@/lib/calendar/events";
import { toneClass } from "@/lib/ui/tones";
import GlassPanel from "@/components/ui/GlassPanel";
import CalendarDayDetail from "./CalendarDayDetail";

type Props = { events: CalendarEvent[]; month: string; today: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function Calendar({ events, month, today }: Props) {
  // 이번 달을 보고 있을 때만 오늘을 미리 펼쳐 둔다. 다른 달로 옮기면 선택이 풀린다.
  const [selected, setSelected] = useState<string | null>(
    month === today.slice(0, 7) ? today : null
  );

  const byDate = groupByDate(events);
  const cells = buildMonthGrid(month);

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold text-[#111827]">
          {formatMonthLabel(month)}
        </h2>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin?month=${shiftMonth(month, -1)}`}
            aria-label="이전 달"
            className="glass-field focus-flame px-3 py-1 text-sm text-[#4b5563]"
          >
            ‹
          </Link>
          <Link href="/admin" className="glass-field focus-flame px-3 py-1 text-sm text-[#4b5563]">
            오늘
          </Link>
          <Link
            href={`/admin?month=${shiftMonth(month, 1)}`}
            aria-label="다음 달"
            className="glass-field focus-flame px-3 py-1 text-sm text-[#4b5563]"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={weekday}
            className={`pb-2 text-center text-sm ${index === 0 ? "text-[#b91c1c]" : "text-[#6b7280]"}`}
          >
            {weekday}
          </div>
        ))}

        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="min-h-[72px]" />;

          const dayEvents = byDate[date] ?? [];
          const { chips, overflow } = summarizeDay(dayEvents);
          const isToday = date === today;
          const isSelected = date === selected;
          const isSunday = index % 7 === 0;

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(isSelected ? null : date)}
              aria-pressed={isSelected}
              className={`focus-flame min-h-[72px] rounded-[10px] border p-1.5 text-left align-top transition-colors ${
                isSelected
                  ? "border-transparent bg-navy-900"
                  : isToday
                    ? "border-navy-900 bg-white/55 hover:bg-white/75"
                    : "border-transparent bg-white/55 hover:bg-white/75"
              }`}
            >
              <span
                className={`font-num block text-sm ${
                  isSelected ? "text-white" : isSunday ? "text-[#b91c1c]" : "text-[#374151]"
                }`}
              >
                {Number(date.slice(8, 10))}
              </span>
              <span className="mt-1 flex flex-col gap-0.5">
                {chips.map(({ kind, count }) => (
                  <span
                    key={kind}
                    className={`truncate rounded px-1.5 py-px text-[11px] leading-tight font-semibold ${toneClass(EVENT_META[kind].tone)}`}
                  >
                    {EVENT_META[kind].shortLabel} {count}
                  </span>
                ))}
                {overflow > 0 && (
                  <span
                    className={`rounded px-1.5 py-px text-[11px] leading-tight font-semibold ${toneClass("gray")}`}
                  >
                    +{overflow}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {selected && <CalendarDayDetail date={selected} events={byDate[selected] ?? []} />}
    </GlassPanel>
  );
}
