export const TRIAL_DAYS = 30;

// 종료 7일 전부터 종료 후 3일까지를 "임박"으로 본다 — 리마인드를 보낼 창과
// 종료 직후 전환 여부를 확인할 창을 같이 덮는다.
const ENDING_SOON_MIN_DDAY = -3;
const ENDING_SOON_MAX_DDAY = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return fromUtcMs(toUtcMs(isoDate) + days * MS_PER_DAY);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

// 서버가 UTC로 떠 있으면 자정 전후로 날짜가 하루 밀린다. en-CA 로케일은 YYYY-MM-DD를 준다.
export function todayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

export function getTrialEndsOn(trialStartedOn: string | null): string | null {
  return trialStartedOn ? addDays(trialStartedOn, TRIAL_DAYS) : null;
}

export function getTrialDDay(trialStartedOn: string | null, today: string): number | null {
  const endsOn = getTrialEndsOn(trialStartedOn);
  return endsOn ? diffDays(today, endsOn) : null;
}

export function formatDDay(dday: number): string {
  if (dday === 0) return "D-day";
  return dday > 0 ? `D-${dday}` : `D+${-dday}`;
}

export function isTrialEndingSoon(
  customer: { status: string; trialStartedOn: string | null },
  today: string
): boolean {
  if (customer.status !== "trial") return false;
  const dday = getTrialDDay(customer.trialStartedOn, today);
  return dday !== null && dday >= ENDING_SOON_MIN_DDAY && dday <= ENDING_SOON_MAX_DDAY;
}
