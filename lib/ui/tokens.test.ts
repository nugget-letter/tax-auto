import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf-8");

describe("globals.css는 RichTextEditor의 폰트 변수를 유지한다", () => {
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

describe("globals.css는 잉크 색상 토큰을 정의한다", () => {
  it("--color-ink-muted는 #6E665E이다", () => {
    expect(css).toMatch(/--color-ink-muted:\s*#6E665E/i);
  });

  it("--color-ink-sidebar는 #A79E94이다", () => {
    expect(css).toMatch(/--color-ink-sidebar:\s*#A79E94/i);
  });
});

describe("globals.css는 @layer components로 유리 표면을 정의한다", () => {
  it("@layer components 블록이 있다", () => {
    expect(css).toMatch(/@layer\s+components/);
  });

  it(".admin-canvas는 올바른 radial-gradient at 위치를 가진다", () => {
    expect(css).toMatch(/at\s+12%\s+-8%/);
    expect(css).toMatch(/at\s+92%\s+8%/);
  });

  it(".btn-flame은 color와 border-radius를 가진다", () => {
    expect(css).toMatch(/\.btn-flame\s*{[\s\S]*?color:\s*white/);
    expect(css).toMatch(/\.btn-flame\s*{[\s\S]*?border-radius:\s*999px/);
  });

  it(".btn-quiet은 color와 border-radius를 가진다", () => {
    expect(css).toMatch(/\.btn-quiet\s*{[\s\S]*?color:\s*#1f2937/);
    expect(css).toMatch(/\.btn-quiet\s*{[\s\S]*?border-radius:\s*999px/);
  });

  it(".btn-danger는 #b91c1c 색과 border-radius를 가진다", () => {
    expect(css).toMatch(/\.btn-danger\s*{[\s\S]*?color:\s*#b91c1c/);
    expect(css).toMatch(/\.btn-danger\s*{[\s\S]*?border-radius:\s*999px/);
  });
});
