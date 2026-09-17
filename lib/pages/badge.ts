import type { PageStatus } from "./types";

export type PageBadge = {
  label: string;
  tone: "neutral" | "informative" | "positive" | "warning";
};

/**
 * "전송됨"은 별도 상태가 아니라 발행된 페이지에 전송일이 적혔는지로 판단한다.
 * 상태를 하나 더 늘리면 발행/보관과의 조합이 복잡해지기 때문이다.
 */
export function getPageBadge(status: PageStatus, sentOn: string | null): PageBadge {
  if (status === "draft") return { label: "임시저장", tone: "warning" };
  if (status === "archived") return { label: "보관", tone: "neutral" };
  return sentOn
    ? { label: "전송됨", tone: "informative" }
    : { label: "발행", tone: "positive" };
}
