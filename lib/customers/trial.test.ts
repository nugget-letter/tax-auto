import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatDDay,
  getTrialDDay,
  getTrialEndsOn,
  isTrialEndingSoon,
  todayInSeoul,
} from "./trial";

describe("addDays / diffDays", () => {
  it("월 경계를 넘어 더한다", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-09-01", 30)).toBe("2026-10-01");
  });
  it("차이를 일 단위로 돌려준다", () => {
    expect(diffDays("2026-09-01", "2026-09-04")).toBe(3);
    expect(diffDays("2026-09-04", "2026-09-01")).toBe(-3);
  });
});

describe("todayInSeoul", () => {
  it("UTC 자정 직전은 서울 기준 다음날이다", () => {
    expect(todayInSeoul(new Date("2026-09-15T23:30:00Z"))).toBe("2026-09-16");
  });
});

describe("getTrialEndsOn", () => {
  it("시작일 + 30일", () => {
    expect(getTrialEndsOn("2026-09-01")).toBe("2026-10-01");
  });
  it("시작일 없으면 null", () => {
    expect(getTrialEndsOn(null)).toBeNull();
  });
});

describe("getTrialDDay", () => {
  it("종료일까지 남은 일수(양수), 지났으면 음수", () => {
    expect(getTrialDDay("2026-09-01", "2026-09-28")).toBe(3);
    expect(getTrialDDay("2026-09-01", "2026-10-01")).toBe(0);
    expect(getTrialDDay("2026-09-01", "2026-10-03")).toBe(-2);
  });
  it("시작일 없으면 null", () => {
    expect(getTrialDDay(null, "2026-09-28")).toBeNull();
  });
});

describe("formatDDay", () => {
  it("D-3 / D-day / D+2", () => {
    expect(formatDDay(3)).toBe("D-3");
    expect(formatDDay(0)).toBe("D-day");
    expect(formatDDay(-2)).toBe("D+2");
  });
});

describe("isTrialEndingSoon", () => {
  const start = "2026-09-01"; // 종료 2026-10-01
  it("종료 7일 전부터 true", () => {
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-09-23")).toBe(false); // D-8
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-09-24")).toBe(true); // D-7
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-10-01")).toBe(true); // D-day
  });
  it("종료 후 3일까지 true, 4일째부터 false", () => {
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-10-04")).toBe(true); // D+3
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: start }, "2026-10-05")).toBe(false); // D+4
  });
  it("trial 상태가 아니거나 시작일이 없으면 false", () => {
    expect(isTrialEndingSoon({ status: "converted", trialStartedOn: start }, "2026-10-01")).toBe(false);
    expect(isTrialEndingSoon({ status: "trial", trialStartedOn: null }, "2026-10-01")).toBe(false);
  });
});
