import { describe, expect, it } from "vitest";
import {
  bannerBlockSchema,
  ctaBlockSchema,
  normalizeSendTags,
  pageSendSchema,
  textBlockSchema,
} from "./types";

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

describe("ctaBlockSchema", () => {
  const base = { type: "cta", label: "상담", href: "https://a.com", color: "#FEE500" };

  it("모양 필드가 없는 기존 블록도 통과한다", () => {
    const result = ctaBlockSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.variant).toBeUndefined();
  });
  it("outline + 높이/너비/글씨 크기를 받는다", () => {
    const block = { ...base, variant: "outline", height: "lg", width: "auto", fontSize: "xl" };
    expect(ctaBlockSchema.safeParse(block).success).toBe(true);
  });
  it("모르는 값은 거부한다", () => {
    expect(ctaBlockSchema.safeParse({ ...base, variant: "ghost" }).success).toBe(false);
    expect(ctaBlockSchema.safeParse({ ...base, height: "xl" }).success).toBe(false);
    expect(ctaBlockSchema.safeParse({ ...base, width: "half" }).success).toBe(false);
    expect(ctaBlockSchema.safeParse({ ...base, fontSize: "xxl" }).success).toBe(false);
  });
});

describe("textBlockSchema 소제목 스타일", () => {
  it("스타일 필드가 없는 기존 블록도 통과한다", () => {
    expect(textBlockSchema.safeParse({ type: "text", bodyHtml: "<p>a</p>" }).success).toBe(true);
  });
  it("글꼴·크기·색상을 받는다", () => {
    const block = {
      type: "text",
      heading: "소제목",
      headingFont: "nanum-myeongjo",
      headingSize: "xl",
      headingColor: "#ff0000",
      bodyHtml: "",
    };
    expect(textBlockSchema.safeParse(block).success).toBe(true);
  });
  it("목록에 없는 글꼴이나 잘못된 색상은 거부한다", () => {
    const base = { type: "text", bodyHtml: "" };
    expect(textBlockSchema.safeParse({ ...base, headingFont: "comic-sans" }).success).toBe(false);
    expect(textBlockSchema.safeParse({ ...base, headingColor: "red" }).success).toBe(false);
  });
});

describe("bannerBlockSchema 제목 글꼴", () => {
  it("글꼴이 없어도, 목록의 글꼴이어도 통과하고 목록 밖은 거부한다", () => {
    const base = { type: "banner", imageUrl: "https://x/a.png" };
    expect(bannerBlockSchema.safeParse(base).success).toBe(true);
    expect(bannerBlockSchema.safeParse({ ...base, titleFont: "pretendard" }).success).toBe(true);
    expect(bannerBlockSchema.safeParse({ ...base, titleFont: "comic-sans" }).success).toBe(false);
  });
});
