import { describe, expect, it } from "vitest";
import { normalizeSendTags, pageSendSchema } from "./types";

describe("normalizeSendTags", () => {
  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeSendTags(["  세무사 1차  "])).toEqual(["세무사 1차"]);
  });
  it("빈 값을 버린다", () => {
    expect(normalizeSendTags(["a", "", "   ", "b"])).toEqual(["a", "b"]);
  });
  it("중복을 제거하고 입력 순서를 유지한다", () => {
    expect(normalizeSendTags(["b", "a", "b", " a "])).toEqual(["b", "a"]);
  });
  it("빈 배열은 빈 배열", () => {
    expect(normalizeSendTags([])).toEqual([]);
  });
});

describe("pageSendSchema", () => {
  it("날짜와 태그를 통과시킨다", () => {
    const result = pageSendSchema.safeParse({ sentOn: "2026-09-10", sendTags: ["세무사 1차"] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sendTags).toEqual(["세무사 1차"]);
  });
  it("sentOn은 null일 수 있다", () => {
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: [] }).success).toBe(true);
  });
  it("날짜 형식이 아니면 거부한다", () => {
    expect(pageSendSchema.safeParse({ sentOn: "2026.09.10", sendTags: [] }).success).toBe(false);
    expect(pageSendSchema.safeParse({ sentOn: "", sendTags: [] }).success).toBe(false);
  });
  it("태그를 정규화해서 돌려준다", () => {
    const result = pageSendSchema.safeParse({ sentOn: null, sendTags: [" a ", "", "a", "b"] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sendTags).toEqual(["a", "b"]);
  });
  it("50자를 넘는 태그는 거부한다", () => {
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: ["x".repeat(51)] }).success).toBe(false);
  });
  it("정규화 후 20개까지 허용하고 21개는 거부한다", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `t${i}`);
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: twenty }).success).toBe(true);
    expect(pageSendSchema.safeParse({ sentOn: null, sendTags: [...twenty, "t20"] }).success).toBe(false);
  });
});
