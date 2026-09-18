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

  it(".btn-flame은 color와 border-radius, 그림자를 가진다", () => {
    expect(css).toMatch(/\.btn-flame\s*{[\s\S]*?color:\s*#22150b/);
    expect(css).toMatch(/\.btn-flame\s*{[\s\S]*?border-radius:\s*999px/);
    expect(css).toMatch(/\.btn-flame\s*{[\s\S]*?box-shadow:\s*0\s+10px\s+30px\s+-14px/);
  });

  it(".btn-quiet은 color와 border-radius를 가진다", () => {
    expect(css).toMatch(/\.btn-quiet\s*{[\s\S]*?color:\s*#4b5563/);
    expect(css).toMatch(/\.btn-quiet\s*{[\s\S]*?border-radius:\s*999px/);
  });

  it(".btn-danger는 #b91c1c 색과 border-radius를 가진다", () => {
    expect(css).toMatch(/\.btn-danger\s*{[\s\S]*?color:\s*#b91c1c/);
    expect(css).toMatch(/\.btn-danger\s*{[\s\S]*?border-radius:\s*999px/);
  });
});

describe("globals.css는 플레임 그라데이션을 토큰 하나로 정의한다", () => {
  it("--gradient-flame은 브랜드 색 토큰 세 개를 100deg로 잇는다", () => {
    expect(css).toMatch(
      /--gradient-flame:\s*linear-gradient\(\s*100deg,\s*var\(--color-brand-amber\)\s*0%,\s*var\(--color-brand-orange\)\s*52%,\s*var\(--color-brand-red\)\s*100%\s*\)/
    );
  });

  it.each([".flame-text", ".flame-bar", ".btn-flame"])(
    "%s는 그라데이션을 리터럴로 복제하지 않고 var(--gradient-flame)을 참조한다",
    (selector) => {
      const escaped = selector.replace(/[.]/g, "\\.");
      expect(css).toMatch(
        new RegExp(`${escaped}\\s*{[\\s\\S]*?background:\\s*var\\(--gradient-flame\\)`)
      );
    }
  );

  it("100deg 플레임 그라데이션 리터럴은 토큰 정의 한 곳에만 존재한다", () => {
    const matches = css.match(/linear-gradient\(\s*100deg,\s*(?:var\(--color-brand-amber\)|#ffb03a)/gi) ?? [];
    expect(matches).toHaveLength(1);
  });
});
