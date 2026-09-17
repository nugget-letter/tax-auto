import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf-8");

describe("globals.css는 RichTextEditor의 폰트 변수를 유지한다", () => {
  it.each([
    "--font-noto-sans-kr",
    "--font-noto-serif-kr",
    "--font-nanum-gothic",
    "--font-nanum-myeongjo",
    "--font-gothic-a1",
  ])("%s를 정의해야 한다", (fontVar) => {
    expect(css).toMatch(new RegExp(`${fontVar}\\s*:`));
  });

  it("--font-sans는 --font-noto-sans-kr을 기본값으로 사용한다", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-noto-sans-kr\)/);
  });

  it("--font-serif는 --font-noto-serif-kr을 기본값으로 사용한다", () => {
    expect(css).toMatch(/--font-serif:\s*var\(--font-noto-serif-kr\)/);
  });
});

describe("globals.css는 ReadingProgressBar를 위한 navy 토큰을 유지한다", () => {
  it("--color-navy-950은 #0b0b10이다", () => {
    expect(css).toMatch(/--color-navy-950:\s*#0b0b10/i);
  });

  it("--color-navy-900은 #15151c이다", () => {
    expect(css).toMatch(/--color-navy-900:\s*#15151c/i);
  });
});

describe("globals.css는 너겟 브랜드 색을 정의한다", () => {
  it.each([
    ["--color-brand-amber", "#FFB03A"],
    ["--color-brand-orange", "#FF6B2C"],
    ["--color-brand-red", "#F5333F"],
  ])("%s는 %s이다", (name, value) => {
    expect(css).toMatch(
      new RegExp(`${name}:\\s*${value.replace(/[#]/g, "\\#")}`, "i")
    );
  });
});
