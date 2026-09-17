# 대시보드 캘린더 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` 최상단에 월 단위 달력을 두고, 페이지 생성·전송과 고객 신청·체험 종료를 한 판에 보여준다.

**Architecture:** 새 테이블 없이 기존 `pages`/`customers`의 날짜를 읽어 `CalendarEvent[]`로 변환한다. 변환과 격자 계산은 `lib/calendar/events.ts`의 순수 함수로 두고 TDD로 만든다. 서버 컴포넌트(`app/admin/page.tsx`)가 두 목록을 조회해 이벤트로 바꾼 뒤 클라이언트 컴포넌트에는 `CalendarEvent[]`만 내린다.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase, seed-design (`@seed-design/react`), Tailwind 4, Vitest.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-09-18-dashboard-calendar-design.md`
- 브랜치 `dashboard-calendar`에서 작업한다 (이미 생성됨, HEAD `9c6f876`).
- 이 브랜치는 `page-send-tracking`(PR #10)이 머지된 `main`에서 갈라져 나왔다. `pages.sentOn`/`pages.sendTags`가 이미 존재한다고 가정한다.
- Next.js 16: 페이지의 `searchParams`는 `Promise`이며 `await` 해야 한다. 미들웨어 파일은 `proxy.ts`.
- **새 테이블·컬럼을 만들지 않는다.** 이미 있는 데이터만 읽는다.
- 타임스탬프(`createdAt`, `submittedAt`)는 `Asia/Seoul` 기준 날짜로 변환한다. `sentOn`, `trialStartedOn`은 이미 `"YYYY-MM-DD"` 문자열이다.
- "오늘"은 서버에서 `todayInSeoul()`로 계산해 prop으로 내린다. 클라이언트에서 계산하지 않는다.
- 체험 종료 이벤트는 `status`와 무관하게 `trialStartedOn`이 있으면 만든다. 종료일 = 시작일 + 30일 (`getTrialEndsOn`).
- 발행일(`publishedAt`) 이벤트는 만들지 않는다.
- 격자는 일요일 시작 7열. 앞뒤 달 날짜는 넣지 않고 빈 칸으로 둔다.
- 월 상태는 URL 쿼리 `?month=YYYY-MM`. 잘못된 값은 이번 달로 대체한다.
- 어드민 UI는 seed-design `Box/HStack/VStack/Text` + Tailwind, 기존 `PagesTable.tsx` 패턴을 따른다. 존재하는 stroke 토큰은 `stroke.neutralWeak`, `stroke.criticalWeak`.
- 주석은 한국어, "왜"를 설명할 때만.
- 커밋 메시지는 `feat:`/`fix:`/`test:` 접두어, 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- 각 태스크 끝에 `npx tsc --noEmit && npm run lint && npm test`가 통과해야 한다.
- **프로덕션 Supabase에 실제 페이지 16건·고객 5건이 있다.** 읽기만 하며, 데이터를 바꾸지 않는다.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `lib/calendar/events.ts` (신규) | 순수 함수: 이벤트 변환, 월 격자 계산, 월 파싱·이동 |
| `lib/calendar/events.test.ts` (신규) | 위 함수 테스트 |
| `components/dashboard/CalendarDayDetail.tsx` (신규) | 선택된 날의 이벤트 목록 |
| `components/dashboard/Calendar.tsx` (신규, client) | 격자 + 월 이동 + 날짜 선택 |
| `app/admin/page.tsx` (수정) | 고객 목록도 조회, 이벤트 변환, 캘린더 배치 |

---

### Task 1: 캘린더 순수 로직

**Files:**
- Create: `lib/calendar/events.ts`, `lib/calendar/events.test.ts`

**Interfaces:**
- Consumes: `PageRecord`(`lib/pages/types.ts`), `CustomerRecord`(`lib/customers/types.ts`), `getTrialEndsOn`·`todayInSeoul`(`lib/customers/trial.ts`)
- Produces:
  ```ts
  export type CalendarEventKind = "page-created" | "page-sent" | "customer-applied" | "trial-ending";
  export type CalendarEvent = {
    kind: CalendarEventKind;
    date: string;      // "YYYY-MM-DD"
    title: string;
    href: string;
    tags: string[];    // page-sent만 채워지고 나머지는 []
  };
  export const EVENT_META: Record<CalendarEventKind, { icon: string; label: string }>;
  export function toSeoulDate(iso: string): string;                    // 타임스탬프 → "YYYY-MM-DD"
  export function toCalendarEvents(pages: PageRecord[], customers: CustomerRecord[]): CalendarEvent[];
  export function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]>;
  export function parseMonth(raw: string | undefined, fallbackToday: string): string; // "YYYY-MM"
  export function shiftMonth(month: string, delta: number): string;
  export function buildMonthGrid(month: string): (string | null)[];    // null = 앞뒤 빈 칸
  export function formatMonthLabel(month: string): string;             // "2026년 9월"
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/calendar/events.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { PageRecord } from "@/lib/pages/types";
import type { CustomerRecord } from "@/lib/customers/types";
import {
  buildMonthGrid,
  formatMonthLabel,
  groupByDate,
  parseMonth,
  shiftMonth,
  toCalendarEvents,
  toSeoulDate,
} from "./events";

function makePage(over: Partial<PageRecord> = {}): PageRecord {
  return {
    id: "p1",
    slug: "abc",
    title: "테스트 페이지",
    status: "published",
    blocks: [],
    createdAt: "2026-09-16T01:00:00.000Z",
    updatedAt: "2026-09-16T01:00:00.000Z",
    publishedAt: "2026-09-16T01:00:00.000Z",
    sentOn: null,
    sendTags: [],
    ...over,
  };
}

function makeCustomer(over: Partial<CustomerRecord> = {}): CustomerRecord {
  return {
    id: "c1",
    submittedAt: "2026-09-02T01:00:00.000Z",
    name: "김세무",
    office: "세무법인 A",
    phone: "01012345678",
    email: "",
    consented: true,
    source: "direct",
    sourcePageId: null,
    status: "new",
    trialStartedOn: null,
    kakaoAdminSetOn: null,
    reminded1On: null,
    reminded2On: null,
    memo: "",
    createdAt: "2026-09-02T01:00:00.000Z",
    updatedAt: "2026-09-02T01:00:00.000Z",
    ...over,
  };
}

describe("toSeoulDate", () => {
  it("UTC 자정 직전은 서울 기준 다음날이다", () => {
    expect(toSeoulDate("2026-09-15T15:30:00.000Z")).toBe("2026-09-16");
  });
  it("UTC 오전은 같은 날이다", () => {
    expect(toSeoulDate("2026-09-16T01:00:00.000Z")).toBe("2026-09-16");
  });
});

describe("toCalendarEvents", () => {
  it("페이지 생성 이벤트를 만든다", () => {
    const events = toCalendarEvents([makePage()], []);
    expect(events).toContainEqual({
      kind: "page-created",
      date: "2026-09-16",
      title: "테스트 페이지",
      href: "/admin/p1/edit",
      tags: [],
    });
  });
  it("전송일이 있으면 전송 이벤트를 태그와 함께 만든다", () => {
    const events = toCalendarEvents([makePage({ sentOn: "2026-09-18", sendTags: ["세무사 1차"] })], []);
    expect(events).toContainEqual({
      kind: "page-sent",
      date: "2026-09-18",
      title: "테스트 페이지",
      href: "/admin/published",
      tags: ["세무사 1차"],
    });
  });
  it("전송일이 없으면 전송 이벤트가 없다", () => {
    const events = toCalendarEvents([makePage()], []);
    expect(events.some((e) => e.kind === "page-sent")).toBe(false);
  });
  it("고객 신청 이벤트를 만든다", () => {
    const events = toCalendarEvents([], [makeCustomer()]);
    expect(events).toContainEqual({
      kind: "customer-applied",
      date: "2026-09-02",
      title: "김세무 · 세무법인 A",
      href: "/admin/customers/c1",
      tags: [],
    });
  });
  it("사무실이 없으면 이름만 쓴다", () => {
    const events = toCalendarEvents([], [makeCustomer({ office: "" })]);
    expect(events.find((e) => e.kind === "customer-applied")?.title).toBe("김세무");
  });
  it("체험 시작일이 있으면 시작 + 30일에 종료 이벤트를 만든다", () => {
    const events = toCalendarEvents([], [makeCustomer({ trialStartedOn: "2026-09-01" })]);
    expect(events).toContainEqual({
      kind: "trial-ending",
      date: "2026-10-01",
      title: "김세무 · 세무법인 A",
      href: "/admin/customers/c1",
      tags: [],
    });
  });
  it("이미 전환한 고객도 체험 종료 이벤트를 남긴다", () => {
    const events = toCalendarEvents(
      [],
      [makeCustomer({ trialStartedOn: "2026-09-01", status: "converted" })]
    );
    expect(events.some((e) => e.kind === "trial-ending")).toBe(true);
  });
  it("체험 시작일이 없으면 종료 이벤트가 없다", () => {
    const events = toCalendarEvents([], [makeCustomer()]);
    expect(events.some((e) => e.kind === "trial-ending")).toBe(false);
  });
});

describe("groupByDate", () => {
  it("같은 날 이벤트를 한 키로 묶는다", () => {
    const events = toCalendarEvents(
      [makePage({ sentOn: "2026-09-16" })],
      [makeCustomer({ submittedAt: "2026-09-16T01:00:00.000Z" })]
    );
    const grouped = groupByDate(events);
    expect(grouped["2026-09-16"]).toHaveLength(3); // 생성 + 전송 + 신청
  });
  it("이벤트가 없으면 빈 객체", () => {
    expect(groupByDate([])).toEqual({});
  });
});

describe("parseMonth", () => {
  it("올바른 값은 그대로 쓴다", () => {
    expect(parseMonth("2026-09", "2026-09-18")).toBe("2026-09");
  });
  it("잘못된 값은 오늘이 속한 달로 대체한다", () => {
    expect(parseMonth("2026-13", "2026-09-18")).toBe("2026-09");
    expect(parseMonth("abc", "2026-09-18")).toBe("2026-09");
    expect(parseMonth(undefined, "2026-09-18")).toBe("2026-09");
    expect(parseMonth("", "2026-09-18")).toBe("2026-09");
  });
});

describe("shiftMonth", () => {
  it("연도를 넘어 이동한다", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("같은 해 안에서 이동한다", () => {
    expect(shiftMonth("2026-09", 1)).toBe("2026-10");
  });
});

describe("buildMonthGrid", () => {
  it("2026년 9월은 앞에 빈 칸 2개로 시작한다(9/1이 화요일)", () => {
    const grid = buildMonthGrid("2026-09");
    expect(grid[0]).toBeNull();
    expect(grid[1]).toBeNull();
    expect(grid[2]).toBe("2026-09-01");
  });
  it("칸 수는 7의 배수다", () => {
    expect(buildMonthGrid("2026-09").length % 7).toBe(0);
    expect(buildMonthGrid("2026-02").length % 7).toBe(0);
  });
  it("마지막 날짜가 그 달의 말일이다", () => {
    expect(buildMonthGrid("2026-09").filter(Boolean).at(-1)).toBe("2026-09-30");
    expect(buildMonthGrid("2026-02").filter(Boolean).at(-1)).toBe("2026-02-28");
  });
  it("그 달의 날짜 수만큼만 채운다", () => {
    expect(buildMonthGrid("2026-02").filter(Boolean)).toHaveLength(28);
    expect(buildMonthGrid("2026-09").filter(Boolean)).toHaveLength(30);
  });
});

describe("formatMonthLabel", () => {
  it("연월을 한국어로 만든다", () => {
    expect(formatMonthLabel("2026-09")).toBe("2026년 9월");
    expect(formatMonthLabel("2026-12")).toBe("2026년 12월");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/calendar/events.test.ts`
Expected: FAIL — `Failed to resolve import "./events"`

- [ ] **Step 3: 구현**

`lib/calendar/events.ts`:
```ts
import type { PageRecord } from "@/lib/pages/types";
import type { CustomerRecord } from "@/lib/customers/types";
import { getTrialEndsOn } from "@/lib/customers/trial";

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

export const EVENT_META: Record<CalendarEventKind, { icon: string; label: string }> = {
  "page-created": { icon: "✏️", label: "생성" },
  "page-sent": { icon: "📤", label: "전송" },
  "customer-applied": { icon: "📥", label: "신청" },
  "trial-ending": { icon: "⚠️", label: "체험 종료" },
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/calendar/events.test.ts`
Expected: PASS (모든 케이스)

- [ ] **Step 5: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/calendar
git commit -m "feat: add calendar event and month grid helpers

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 2: 캘린더 컴포넌트

**Files:**
- Create: `components/dashboard/CalendarDayDetail.tsx`, `components/dashboard/Calendar.tsx`

**Interfaces:**
- Consumes: `CalendarEvent`·`EVENT_META`·`buildMonthGrid`·`formatMonthLabel`·`groupByDate`·`shiftMonth`(Task 1)
- Produces:
  ```ts
  // CalendarDayDetail: { date: string; events: CalendarEvent[] }
  // Calendar: { events: CalendarEvent[]; month: string; today: string }
  ```

- [ ] **Step 1: 하루 상세 컴포넌트**

`components/dashboard/CalendarDayDetail.tsx` (서버 컴포넌트로 충분하다 — 상태가 없다):
```tsx
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
```

- [ ] **Step 2: 격자 컴포넌트**

`components/dashboard/Calendar.tsx`:
```tsx
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
```

- [ ] **Step 3: 타입·린트 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 오류 없음.

`react-hooks/set-state-in-effect` 규칙은 이 컴포넌트에 해당하지 않는다(`useEffect`를 쓰지 않는다). 월이 바뀌면 `Link` 이동으로 서버 렌더가 새로 일어나고, `Calendar`는 `month`가 바뀐 채 다시 마운트되므로 `useState` 초기값이 다시 평가된다.

- [ ] **Step 4: 커밋**

```bash
npm test
git add components/dashboard/Calendar.tsx components/dashboard/CalendarDayDetail.tsx
git commit -m "feat: add dashboard calendar grid and day detail

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 3: 대시보드에 배치

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `Calendar`(Task 2), `toCalendarEvents`·`parseMonth`(Task 1), `listCustomers`(`lib/customers/repository.ts`), `todayInSeoul`(`lib/customers/trial.ts`), `listPages`(기존)

- [ ] **Step 1: 페이지 교체**

`app/admin/page.tsx` 전체를 아래로 바꾼다:
```tsx
import { listPages } from "@/lib/pages/repository";
import { listCustomers } from "@/lib/customers/repository";
import { todayInSeoul } from "@/lib/customers/trial";
import { parseMonth, toCalendarEvents } from "@/lib/calendar/events";
import PagesTable from "@/components/dashboard/PagesTable";
import Calendar from "@/components/dashboard/Calendar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { month: rawMonth } = await searchParams;
  const [pages, customers] = await Promise.all([listPages(), listCustomers()]);

  const today = todayInSeoul();
  const month = parseMonth(rawMonth, today);
  const events = toCalendarEvents(pages, customers);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Calendar events={events} month={month} today={today} />

      <div>
        <h1 className="mb-6 text-xl font-bold text-gray-900">랜딩페이지 목록</h1>
        <PagesTable pages={pages} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 화면 수동 확인**

dev 서버를 백그라운드로 띄운다: `npx next dev -p 3001`. 로그인은 **form-encoded**다.
```bash
cd "/Users/yeongseonpark/Desktop/클로드/tax auto"
set -a && source .env.local && set +a
COOKIE=$(curl -s -i -X POST localhost:3001/api/login -d "password=$ADMIN_PASSWORD" | grep -o 'nugget_admin_session=[^;]*' | head -1)

curl -s -H "Cookie: $COOKIE" localhost:3001/admin > /tmp/dash.html
grep -c "년 .*월" /tmp/dash.html        # 월 라벨 1 이상
grep -o "일</div>" /tmp/dash.html | wc -l  # 요일 헤더
grep -c "랜딩페이지 목록" /tmp/dash.html    # 기존 목록이 그대로 있는지 1

# 다른 달로 이동
curl -s -H "Cookie: $COOKIE" "localhost:3001/admin?month=2026-08" | grep -o "2026년 8월" | head -1
# 잘못된 값은 이번 달로
curl -s -H "Cookie: $COOKIE" "localhost:3001/admin?month=2026-13" | grep -o "2026년 [0-9]*월" | head -1
```
Expected: 월 라벨이 렌더링되고, `?month=2026-08`은 "2026년 8월", `?month=2026-13`은 오늘이 속한 달을 보여준다. 기존 랜딩페이지 목록도 그대로 남아 있어야 한다.

브라우저 클릭(날짜 선택 → 상세 펼침)은 자동화로 실행할 수 없다. 실행하지 못한 검증은 보고서에 그대로 적는다.

- [ ] **Step 3: 커밋**

```bash
npx tsc --noEmit && npm run lint && npm test
git add app/admin/page.tsx
git commit -m "feat: show the calendar at the top of the dashboard

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log -1 --format='%h %s'; git status --short
```

---

### Task 4: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 게이트**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```
Expected: 전부 통과.

- [ ] **Step 2: 스펙 대조**

스펙의 각 항목을 훑는다: 이벤트 4종과 출처, 발행일 이벤트 없음, 체험 종료가 상태와 무관, KST 변환, 격자 일요일 시작·앞뒤 빈 칸, `?month=` 유지와 잘못된 값 대체, 오늘 강조와 기본 선택, 빈 날 안내 문구, 이벤트 클릭 이동 경로.

- [ ] **Step 3: 데이터 확인**

```bash
cd "/Users/yeongseonpark/Desktop/클로드/tax auto"
set -a && source .env.local && set +a
curl -s "$SUPABASE_URL/rest/v1/pages?select=id" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)),'pages')"
curl -s "$SUPABASE_URL/rest/v1/customers?select=id" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)),'customers')"
```
Expected: 16 pages, 5 customers — 이 태스크는 읽기만 하므로 수가 그대로여야 한다. dev 서버를 종료한다.

- [ ] **Step 4: PR**

```bash
git push -u origin dashboard-calendar
```
PR 제목: `feat: add a month calendar to the dashboard`. 본문에 스펙 링크와 검증 결과를 적고, 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
