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
    expect(grouped["2026-09-16"]).toHaveLength(3);
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

import { EVENT_META, summarizeDay, type CalendarEvent } from "./events";

function ev(kind: CalendarEvent["kind"]): CalendarEvent {
  return { kind, date: "2026-09-18", title: "테스트", href: "/admin", tags: [] };
}

describe("EVENT_META", () => {
  it("네 종류 모두 짧은 라벨과 톤을 갖는다", () => {
    expect(EVENT_META["page-created"].shortLabel).toBe("생성");
    expect(EVENT_META["page-sent"].shortLabel).toBe("전송");
    expect(EVENT_META["customer-applied"].shortLabel).toBe("신청");
    expect(EVENT_META["trial-ending"].shortLabel).toBe("종료");

    expect(EVENT_META["page-created"].tone).toBe("indigo");
    expect(EVENT_META["page-sent"].tone).toBe("blue");
    expect(EVENT_META["customer-applied"].tone).toBe("green");
    expect(EVENT_META["trial-ending"].tone).toBe("red");
  });

  it("상세 목록이 쓰는 icon과 label은 그대로다", () => {
    expect(EVENT_META["trial-ending"].icon).toBe("⚠️");
    expect(EVENT_META["trial-ending"].label).toBe("체험 종료");
  });
});

describe("summarizeDay", () => {
  it("빈 하루는 빈 요약을 낸다", () => {
    expect(summarizeDay([])).toEqual({ chips: [], overflow: 0 });
  });

  it("같은 종류를 하나로 묶고 건수를 센다", () => {
    const events = [ev("page-created"), ev("page-created"), ev("page-sent")];
    expect(summarizeDay(events)).toEqual({
      chips: [
        { kind: "page-created", count: 2 },
        { kind: "page-sent", count: 1 },
      ],
      overflow: 0,
    });
  });

  it("KIND_ORDER 순서를 지킨다 — 입력 순서와 무관하다", () => {
    const events = [ev("trial-ending"), ev("customer-applied"), ev("page-created")];
    expect(summarizeDay(events).chips.map((c) => c.kind)).toEqual([
      "page-created",
      "customer-applied",
      "trial-ending",
    ]);
  });

  it("기본 max는 3이고 넘치는 종류는 overflow로 센다", () => {
    const events = [
      ev("page-created"),
      ev("page-sent"),
      ev("customer-applied"),
      ev("trial-ending"),
    ];
    const summary = summarizeDay(events);
    expect(summary.chips).toHaveLength(3);
    expect(summary.chips.map((c) => c.kind)).toEqual([
      "page-created",
      "page-sent",
      "customer-applied",
    ]);
    expect(summary.overflow).toBe(1);
  });

  it("overflow는 종류 수를 세지 건수를 세지 않는다", () => {
    const events = [
      ev("page-created"),
      ev("page-sent"),
      ev("customer-applied"),
      ev("trial-ending"),
      ev("trial-ending"),
      ev("trial-ending"),
    ];
    expect(summarizeDay(events).overflow).toBe(1);
  });

  it("max를 직접 줄 수 있다", () => {
    const events = [ev("page-created"), ev("page-sent"), ev("customer-applied")];
    const summary = summarizeDay(events, 1);
    expect(summary.chips).toHaveLength(1);
    expect(summary.overflow).toBe(2);
  });
});
