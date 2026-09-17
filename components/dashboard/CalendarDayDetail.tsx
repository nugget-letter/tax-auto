import Link from "next/link";
import { Text } from "@seed-design/react";
import { EVENT_META, type CalendarEvent } from "@/lib/calendar/events";

type Props = { date: string; events: CalendarEvent[] };

function formatDayLabel(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
}

export default function CalendarDayDetail({ date, events }: Props) {
  return (
    <div className="mt-3 rounded border border-gray-200 p-3">
      <Text as="p" textStyle="t2Bold" color="fg.neutralSubtle" className="mb-2">
        {formatDayLabel(date)}
      </Text>

      {events.length === 0 ? (
        <Text as="p" textStyle="t2Regular" color="fg.neutralSubtle">
          이 날은 기록이 없어요.
        </Text>
      ) : (
        <ul className="space-y-1.5">
          {events.map((event, index) => (
            <li key={`${event.kind}-${event.href}-${index}`}>
              <Link href={event.href} className="flex flex-wrap items-center gap-2 text-sm">
                <span aria-hidden="true">{EVENT_META[event.kind].icon}</span>
                <span className="text-gray-500">{EVENT_META[event.kind].label}</span>
                <span className="font-medium text-gray-900 underline">{event.title}</span>
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
