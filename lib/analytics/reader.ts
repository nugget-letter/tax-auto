import type { TrackInput } from "./types";

const READER_KEY = "nugget_rid";
const TRACK_ENDPOINT = "/api/track";

/**
 * 구형 안드로이드 WebView(Chrome 92 미만)에는 crypto.randomUUID가 없다.
 * 국내 카카오톡 인앱 브라우저 사용자층에서 무시할 수 없는 비율이라,
 * 폴백이 없으면 그 기기들은 트래킹이 통째로 죽는다.
 */
export function randomId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  );
}

/**
 * 기기 단위 식별자. 같은 사람이 카카오톡에서 링크를 여러 번 눌러도 1명으로 세기 위한 것이다.
 *
 * iOS 프라이빗 모드 등에서 localStorage 접근은 값을 못 읽는 게 아니라 예외를 던진다.
 * 감싸지 않으면 이 줄에서 스크립트 전체가 멈추므로 반드시 try로 감싼다.
 * 실패하면 null을 주고, 서버는 그 방문 하나를 1명으로 계산한다.
 */
export function getReaderId(): string | null {
  try {
    const stored = localStorage.getItem(READER_KEY);
    if (stored) return stored;

    const created = randomId();
    localStorage.setItem(READER_KEY, created);
    return created;
  } catch {
    return null;
  }
}

/**
 * 통계 전송. 페이지가 죽는 순간에도 도착해야 하므로 sendBeacon을 먼저 쓴다
 * (일반 fetch는 페이지와 함께 취소되어, 끝까지 읽고 닫은 방문을 놓친다).
 *
 * 실패는 전부 삼킨다 — 통계 때문에 독자 화면이 깨지면 안 된다.
 */
export function sendTrack(payload: TrackInput): void {
  const body = JSON.stringify(payload);

  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.(TRACK_ENDPOINT, blob)) return;
  } catch {
    // sendBeacon이 없거나 막힌 환경 → 아래 fetch로 떨어진다.
  }

  try {
    void fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 여기까지 실패하면 이 방문은 포기한다.
  }
}
