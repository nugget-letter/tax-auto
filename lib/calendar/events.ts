import type { PageRecord } from "@/lib/pages/types";
import type { CustomerRecord } from "@/lib/customers/types";
import { getTrialEndsOn } from "@/lib/customers/trial";
import type { Tone } from "@/lib/ui/tones";

export type CalendarEventKind =
  | "page-created"
  | "page-sent"
  | "customer-applied"
  | "trial-ending";

export type CalendarEvent = {
  kind: CalendarEventKind;
  date: string;
  title: string;
  href: string;
  tags: string[];
};

/**
 * icon과 label은 하루 상세 목록이 쓴다.
 * shortLabel과 tone은 달력 칸 안 칩이 쓴다 — 칩이 스스로 뜻을 말하므로 범례가 없다.
 */
export const EVENT_META: Record<
  CalendarEventKind,
  { icon: string; label: string; shortLabel: string; tone: Tone }
> = {
  "page-created": { icon: "✏️", label: "생성", shortLabel: "생성", tone: "indigo" },
  "page-sent": { icon: "📤", label: "전송", shortLabel: "전송", tone: "blue" },
  "customer-applied": { icon: "📥", label: "신청", shortLabel: "신청", tone: "green" },
  "trial-ending": { icon: "⚠️", label: "체험 종료", shortLabel: "종료", tone: "red" },
};

// 이벤트가 같은 날에 여러 개일 때 항상 같은 순서로 보이도록 고정한다.
const KIND_ORDER: CalendarEventKind[] = [
  "page-created",
  "page-sent",
  "customer-applied",
  "trial-ending",
];

/** 타임스탬프를 서울 기준 날짜로 바꾼다. UTC 자정 근처에서 하루가 밀리는 것을 막는다. */
export function toSeoulDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

function customerTitle(customer: CustomerRecord): string {
  return customer.office ? `${customer.name} · ${customer.office}` : customer.name;
}

export function toCalendarEvents(
  pages: PageRecord[],
  customers: CustomerRecord[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const page of pages) {
    events.push({
      kind: "page-created",
      date: toSeoulDate(page.createdAt),
      title: page.title,
      href: `/admin/${page.id}/edit`,
      tags: [],
    });
    if (page.sentOn) {
      events.push({
        kind: "page-sent",
        date: page.sentOn,
        title: page.title,
        href: "/admin/published",
        tags: page.sendTags,
      });
    }
  }

  for (const customer of customers) {
    events.push({
      kind: "customer-applied",
      date: toSeoulDate(customer.submittedAt),
      title: customerTitle(customer),
      href: `/admin/customers/${customer.id}`,
      tags: [],
    });
    // 이미 전환/이탈한 고객도 "그때 체험이 끝났다"는 기록으로 남긴다.
    const endsOn = getTrialEndsOn(customer.trialStartedOn);
    if (endsOn) {
      events.push({
        kind: "trial-ending",
        date: endsOn,
        title: customerTitle(customer),
        href: `/admin/customers/${customer.id}`,
        tags: [],
      });
    }
  }

  return events;
}

export function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    (grouped[event.date] ??= []).push(event);
  }
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }
  return grouped;
}

export type DayChip = { kind: CalendarEventKind; count: number };
export type DaySummary = { chips: DayChip[]; overflow: number };

/**
 * 하루치 이벤트를 종류별로 묶어 달력 칸에 넣을 칩 목록으로 만든다.
 * 종류는 최대 네 가지뿐이라 overflow는 실질적으로 1까지만 나온다.
 */
export function summarizeDay(events: CalendarEvent[], max = 3): DaySummary {
  const counts = new Map<CalendarEventKind, number>();
  for (const event of events) {
    counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  }

  const all: DayChip[] = KIND_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({
    kind,
    count: counts.get(kind)!,
  }));

  return { chips: all.slice(0, max), overflow: Math.max(0, all.length - max) };
}

export function parseMonth(raw: string | undefined, fallbackToday: string): string {
  const fallback = fallbackToday.slice(0, 7);
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return fallback;
  const month = Number(raw.slice(5, 7));
  return month >= 1 && month <= 12 ? raw : fallback;
}

export function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1 + delta;
  const nextYear = year + Math.floor(index / 12);
  const nextMonth = ((index % 12) + 12) % 12;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}`;
}

/**
 * 일요일 시작 7열 격자. 앞뒤로 남는 칸은 null로 둔다 — 이전/다음 달 날짜를 채우면
 * 클릭 대상이 늘어 헷갈린다.
 */
export function buildMonthGrid(month: string): (string | null)[] {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatMonthLabel(month: string): string {
  return `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`;
}
