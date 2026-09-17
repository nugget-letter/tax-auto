import { describe, expect, it } from "vitest";
import { getPageBadge } from "./badge";

describe("getPageBadge", () => {
  it("발행 + 전송일 있음 → 전송됨", () => {
    expect(getPageBadge("published", "2026-09-10")).toEqual({
      label: "전송됨",
      tone: "informative",
    });
  });
  it("발행 + 전송일 없음 → 발행", () => {
    expect(getPageBadge("published", null)).toEqual({ label: "발행", tone: "positive" });
  });
  it("임시저장은 전송일이 있어도 임시저장", () => {
    expect(getPageBadge("draft", "2026-09-10")).toEqual({ label: "임시저장", tone: "warning" });
  });
  it("보관은 전송일이 있어도 보관", () => {
    expect(getPageBadge("archived", "2026-09-10")).toEqual({ label: "보관", tone: "neutral" });
  });
});
