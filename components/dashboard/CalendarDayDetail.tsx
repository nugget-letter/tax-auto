import Link from "next/link";
import { EVENT_META, type CalendarEvent } from "@/lib/calendar/events";
import Chip from "@/components/ui/Chip";

type Props = { date: string; events: CalendarEvent[] };

function formatDayLabel(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
}

export default function CalendarDayDetail({ date, events }: Props) {
  return (
    <div className="mt-4 border-t border-black/8 pt-4">
      <p className="font-display mb-2.5 text-sm font-bold text-[#374151]">
        {formatDayLabel(date)}
      </p>

      {events.length === 0 ? (
        <p className="text-sm text-[#6b7280]">이 날은 기록이 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event, index) => (
            <li key={`${event.kind}-${event.href}-${index}`}>
              <Link
                href={event.href}
                className="focus-flame flex flex-wrap items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-white/60"
              >
                <span aria-hidden="true">{EVENT_META[event.kind].icon}</span>
                <Chip tone={EVENT_META[event.kind].tone}>{EVENT_META[event.kind].label}</Chip>
                <span className="font-medium text-[#111827] underline">{event.title}</span>
                {event.tags.map((tag) => (
                  <Chip key={tag} tone="gray">
                    {tag}
                  </Chip>
                ))}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
