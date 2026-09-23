import { DEPTH_MILESTONES } from "./types";

/**
 * 스크롤 진행률(0~1)을 기록용 도달률(0~100)로 바꾼다.
 *
 * 모바일 브라우저는 주소창 높이 변화와 소수점 오차 때문에 바닥에서도 진행률이
 * 정확히 1.0이 되지 않는 경우가 많다. 그대로 내림하면 끝까지 읽은 방문이 99%로
 * 남아 완독률이 실제보다 낮게 나오므로, 0.99 이상은 완독으로 본다.
 */
export function toDepth(progress: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  if (progress >= 0.99) return 100;
  return Math.floor(progress * 100);
}

/**
 * 이미 기록한 도달률(prevDepth) 이후로 새로 통과한 마일스톤들을 오름차순으로 준다.
 * 한 번 통과한 지점은 다시 잡히지 않으므로, 위로 올렸다 내려도 중복 전송되지 않는다.
 */
export function crossedMilestones(prevDepth: number, progress: number): number[] {
  const depth = toDepth(progress);
  return DEPTH_MILESTONES.filter((milestone) => milestone > prevDepth && milestone <= depth);
}
