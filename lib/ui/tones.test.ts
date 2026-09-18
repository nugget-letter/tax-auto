import { describe, expect, it } from "vitest";
import { TONES, toneClass, type Tone } from "./tones";

describe("toneClass", () => {
  it("톤마다 배경과 글자색 클래스를 함께 돌려준다", () => {
    expect(toneClass("indigo")).toBe("bg-[#e0e7ff] text-[#3730a3]");
    expect(toneClass("blue")).toBe("bg-[#dbeafe] text-[#1d4ed8]");
    expect(toneClass("green")).toBe("bg-[#dcfce7] text-[#15803d]");
    expect(toneClass("red")).toBe("bg-[#fee2e2] text-[#b91c1c]");
    expect(toneClass("amber")).toBe("bg-[#fef3c7] text-[#92400e]");
    expect(toneClass("gray")).toBe("bg-[#f3f4f6] text-[#4b5563]");
  });

  it("여섯 톤을 모두 정의한다", () => {
    expect(TONES).toEqual(["indigo", "blue", "green", "red", "amber", "gray"]);
  });

  it("모든 톤이 비어 있지 않은 클래스를 낸다", () => {
    for (const tone of TONES) {
      expect(toneClass(tone as Tone)).toMatch(/^bg-\[#[0-9a-f]{6}\] text-\[#[0-9a-f]{6}\]$/);
    }
  });
});
