# 어드민 글래스모피즘 전면 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 8개 화면과 로그인 화면을 밝은 글래스모피즘 + 너겟 브랜드 색·글꼴 한 벌로 통일하고, 대시보드 달력을 컬러 칩 방식으로 바꿔 가독성을 높인다.

**Architecture:** `app/globals.css`에 디자인 토큰과 유리 표면 클래스를 정의하고, `components/ui/`에 표면 프리미티브 3개(`GlassPanel`, `Chip`, `SectionLabel`)를 만든 뒤, 화면별로 갈아끼운다. 달력 칸 내용은 `lib/calendar/events.ts`의 순수 함수 `summarizeDay`가 계산하고 UI는 그리기만 한다. seed-design은 `Badge`만 걷어내고 나머지(`ActionButton`, `TextField`, `Text`, 레이아웃)는 그대로 쓴다.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, seed-design v2, next/font/google, Vitest

## Global Constraints

이 절의 요구사항은 **모든 태스크에 암묵적으로 포함된다.**

- 범위는 `/admin/*` 8개 화면 + `/login`이다. 공개 랜딩페이지(`app/c/[slug]`)와 `components/public/*`는 건드리지 않는다.
- **`app/globals.css`의 `--font-sans`와 `--font-serif` 값을 바꾸지 않는다.** `<body>`에 걸려 있어 공개 랜딩페이지 본문도 이 값을 쓴다.
- **기존 글꼴 변수 5개를 전부 살려둔다:** `--font-noto-sans-kr`, `--font-noto-serif-kr`, `--font-nanum-gothic`, `--font-nanum-myeongjo`, `--font-gothic-a1`. `components/editor/RichTextEditor.tsx`의 글꼴 선택지가 이 이름들을 문자열로 참조하고, 공개 페이지가 저장된 글꼴을 렌더링하려면 같은 변수가 살아 있어야 한다.
- **`--color-navy-950`(`#0b0b10`)과 `--color-navy-900`(`#15151c`) 값을 바꾸지 않는다.** `components/public/ReadingProgressBar.tsx`가 공개 페이지에서 `bg-navy-950`을 쓴다.
- 브랜드 색 정본 (세일즈 랜딩 `tax-brending-message` 기준):
  - `--color-brand-amber: #FFB03A`
  - `--color-brand-orange: #FF6B2C`
  - `--color-brand-red: #F5333F`
  - 플레임 그라데이션: `linear-gradient(100deg, #FFB03A 0%, #FF6B2C 52%, #F5333F 100%)`
- 어드민 본문 글자는 **최소 14px**(`text-sm`). 뱃지·칩·섹션 라벨만 11~12px 허용.
- `#9ca3af`를 어드민 어디에도 쓰지 않는다 (유리 위 2.5:1로 AA 미달).
- 어드민 본문 폭은 전 화면 `max-w-[1160px]`.
- 모서리: 유리 패널 `14px`, 입력칸·달력 칸 `10px`, 버튼·칩 `999px`.
- 이번 작업으로 **동작이 바뀌는 곳은 없어야 한다.** 스타일 개편이지 기능 개편이 아니다.
- 각 태스크 끝에 `npm test`, `npx tsc --noEmit`, `npm run lint`가 전부 통과해야 한다.
- 커밋 메시지 끝에 다음 줄을 넣는다:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

## File Structure

**새로 만드는 파일**

| 파일 | 책임 |
|---|---|
| `lib/ui/tones.ts` | 톤 이름 → Tailwind 클래스 문자열. 순수 함수 |
| `lib/ui/tones.test.ts` | 위 테스트 |
| `lib/ui/tokens.test.ts` | globals.css가 공개 페이지용 토큰을 계속 갖고 있는지 지키는 회귀 테스트 |
| `components/ui/GlassPanel.tsx` | 유리 표면 하나 |
| `components/ui/Chip.tsx` | 상태 뱃지·태그·D-day를 전부 대신하는 칩 |
| `components/ui/SectionLabel.tsx` | 플레임 바가 붙은 섹션 라벨 |

**고치는 파일**

| 파일 | 하는 일 |
|---|---|
| `app/layout.tsx` | 글꼴 2종 추가, Gothic A1 굵기 확장 |
| `app/globals.css` | 토큰 + 유리 표면 클래스 |
| `app/admin/layout.tsx` | 캔버스 배경, 어드민 본문 글꼴 |
| `components/admin/Sidebar.tsx` | 3색 플레임 로고, 메뉴 글자색, 현재 메뉴 플레임 바 |
| `lib/calendar/events.ts` | `EVENT_META` 확장, `summarizeDay` 추가 |
| `lib/calendar/events.test.ts` | 위 테스트 |
| `components/dashboard/Calendar.tsx` | 칩 방식 달력 |
| `components/dashboard/CalendarDayDetail.tsx` | 칩 적용 |
| `components/dashboard/StatusBadge.tsx` | seed-design `Badge` → `Chip` |
| `components/dashboard/PagesTable.tsx` | 유리 패널, 섹션 라벨, 태그 칩 |
| `components/dashboard/SendControls.tsx` | 입력칸·태그 칩 |
| `components/dashboard/CopyLinkButton.tsx` 외 3개 버튼 | 버튼 스타일 |
| `components/customers/*` 10개 | 유리 패널, 칩, 입력칸 |
| `components/editor/*` 12개 | 표면·입력칸만 |
| `app/admin/page.tsx`, `published/page.tsx`, `customers/page.tsx`, `customers/[id]/page.tsx`, `customers/new/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` | 폭, 제목 글꼴 |
| `app/login/page.tsx` | 유리 카드 |

---

### Task 1: 디자인 토큰과 글꼴 기반

이 태스크가 뒤의 모든 태스크가 쓰는 CSS 클래스와 Tailwind 유틸리티를 만든다.

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: `lib/ui/tokens.test.ts` (create)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: Tailwind 유틸리티 `font-display` `font-admin` `font-num` `bg-brand-amber` `text-brand-orange` `text-ink-muted` `text-ink-sidebar`, CSS 클래스 `.admin-canvas` `.glass-panel` `.glass-panel-warn` `.glass-field` `.btn-flame` `.btn-quiet` `.btn-danger` `.flame-text` `.flame-bar` `.focus-flame`

- [ ] **Step 1: 회귀 테스트를 먼저 쓴다**

공개 페이지를 깨뜨리는 것이 이 개편의 가장 큰 위험이다. `app/globals.css`가 공개 페이지용 토큰을 계속 갖고 있는지 지키는 테스트를 만든다.

`lib/ui/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("globals.css는 공개 페이지가 쓰는 토큰을 그대로 둔다", () => {
  // RichTextEditor의 글꼴 선택지가 이 이름들을 문자열로 참조한다.
  // 공개 페이지가 저장된 글꼴을 렌더링하려면 같은 변수가 살아 있어야 한다.
  it.each([
    "--font-noto-sans-kr",
    "--font-noto-serif-kr",
    "--font-nanum-gothic",
    "--font-nanum-myeongjo",
    "--font-gothic-a1",
  ])("%s를 참조한다", (name) => {
    expect(css).toContain(name);
  });

  it("--font-sans는 노토산스를 가리킨다", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-noto-sans-kr\)/);
  });

  it("--font-serif는 노토명조를 가리킨다", () => {
    expect(css).toMatch(/--font-serif:\s*var\(--font-noto-serif-kr\)/);
  });

  // ReadingProgressBar가 공개 페이지에서 bg-navy-950을 쓴다.
  it("--color-navy-950 값이 그대로다", () => {
    expect(css).toMatch(/--color-navy-950:\s*#0b0b10/i);
  });
});

describe("globals.css는 브랜드 정본 값을 쓴다", () => {
  it.each([
    ["--color-brand-amber", "#FFB03A"],
    ["--color-brand-orange", "#FF6B2C"],
    ["--color-brand-red", "#F5333F"],
  ])("%s = %s", (name, value) => {
    expect(css).toMatch(new RegExp(`${name}:\\s*${value}`, "i"));
  });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npx vitest run lib/ui/tokens.test.ts`

Expected: FAIL. 브랜드 정본 3건이 실패한다 (`--color-brand-amber` 없음, orange/red는 옛 값 `#ffb020`/`#ff5a36`). 공개 페이지 토큰 검사는 통과한다.

- [ ] **Step 3: `app/layout.tsx`에 글꼴을 더한다**

import 줄을 이렇게 바꾼다:

```tsx
import { Noto_Sans_KR, Noto_Serif_KR, Nanum_Gothic, Nanum_Myeongjo, Gothic_A1, IBM_Plex_Sans_KR, IBM_Plex_Mono } from "next/font/google";
```

기존 `gothicA1` 선언에서 굵기만 넓힌다:

```tsx
const gothicA1 = Gothic_A1({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-gothic-a1",
});
```

그 아래에 두 글꼴을 더한다:

```tsx
// 어드민 전용 글꼴. 세일즈 랜딩(tax-brending-message)과 같은 체계를 쓴다.
// body가 아니라 어드민 껍데기에만 거는 이유는 globals.css의 --font-sans를
// 공개 랜딩페이지가 함께 쓰기 때문이다.
const plexKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-kr",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
});
```

`<body>`의 className에 두 변수를 더한다 (`font-sans`는 그대로 둔다):

```tsx
className={`${notoSansKr.variable} ${notoSerifKr.variable} ${nanumGothic.variable} ${nanumMyeongjo.variable} ${gothicA1.variable} ${plexKr.variable} ${plexMono.variable} font-sans antialiased`}
```

- [ ] **Step 4: `app/globals.css`의 `@theme` 블록을 바꾼다**

기존 `@theme { ... }` 전체를 아래로 교체한다. `--font-sans`, `--font-serif`, `--color-navy-*`는 값이 그대로다.

```css
@theme {
  /* 공개 랜딩페이지(/c/[slug]) 본문이 쓰는 값 — 바꾸지 않는다. */
  --font-sans: var(--font-noto-sans-kr), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-noto-serif-kr), ui-serif, serif;

  /* 어드민 전용 3종 체계. 어드민 껍데기에만 건다. */
  --font-display: var(--font-gothic-a1), "Apple SD Gothic Neo", sans-serif;
  --font-admin: var(--font-plex-kr), "Apple SD Gothic Neo", sans-serif;
  --font-num: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;

  /* 너겟 브랜드 정본 — 세일즈 랜딩(tax-brending-message)의 플레임 3정지점. */
  --color-brand-amber: #FFB03A;
  --color-brand-orange: #FF6B2C;
  --color-brand-red: #F5333F;

  /* 공개 페이지의 ReadingProgressBar도 bg-navy-950을 쓴다 — 값 고정. */
  --color-navy-950: #0b0b10;
  --color-navy-900: #15151c;

  /* 어드민 보조 글자색. 유리 위 5.4:1, 네이비 위 7.4:1로 둘 다 AA 통과. */
  --color-ink-muted: #6E665E;
  --color-ink-sidebar: #A79E94;
}
```

- [ ] **Step 5: `app/globals.css`에 유리 표면 클래스를 더한다**

`body { background-color: white; }` 바로 아래에 붙인다. `.rich-text` 규칙들은 건드리지 않는다.

```css
@layer components {
  /* 어드민 캔버스. fixed로 두어 스크롤해도 오로라가 따라오지 않게 한다. */
  .admin-canvas {
    background:
      radial-gradient(760px 420px at 12% -8%, #ffd9a8 0%, transparent 62%),
      radial-gradient(700px 480px at 92% 8%, #cfe0ff 0%, transparent 60%),
      linear-gradient(160deg, #f7f8fc 0%, #eef1f8 100%);
    background-attachment: fixed;
  }

  .glass-panel {
    background: rgb(255 255 255 / 0.76);
    backdrop-filter: blur(18px);
    border: 1px solid rgb(255 255 255 / 0.85);
    box-shadow: 0 6px 22px rgb(20 25 60 / 0.09);
    border-radius: 14px;
  }

  .glass-panel-warn {
    background: rgb(255 247 237 / 0.82);
    border-color: rgb(251 146 60 / 0.35);
  }

  .glass-field {
    background: rgb(255 255 255 / 0.7);
    border: 1px solid rgb(255 255 255 / 0.9);
    box-shadow: 0 1px 4px rgb(20 25 60 / 0.06);
    border-radius: 10px;
  }

  /* 랜딩의 앰버 포커스 링은 다크 바탕 기준(10.8:1)이라 밝은 유리 위에서는
     1.76:1로 WCAG 비텍스트 대비 3:1에 못 미친다. 어두운 바깥선을 덧대 맞춘다. */
  .focus-flame:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px #ffb03a,
      0 0 0 3.5px rgb(21 21 28 / 0.55);
  }

  .flame-text {
    background: linear-gradient(100deg, #ffb03a 0%, #ff6b2c 52%, #f5333f 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .flame-bar {
    background: linear-gradient(100deg, #ffb03a 0%, #ff6b2c 52%, #f5333f 100%);
  }

  .btn-flame {
    background: linear-gradient(100deg, #ffb03a 0%, #ff6b2c 52%, #f5333f 100%);
    color: #22150b;
    border-radius: 999px;
    font-weight: 600;
    box-shadow: 0 10px 30px -14px rgb(255 107 44 / 0.85);
  }

  .btn-quiet {
    background: rgb(255 255 255 / 0.7);
    border: 1px solid rgb(255 255 255 / 0.9);
    color: #4b5563;
    border-radius: 999px;
    font-weight: 500;
  }

  .btn-danger {
    background: rgb(254 226 226 / 0.85);
    color: #b91c1c;
    border-radius: 999px;
    font-weight: 500;
  }
}
```

- [ ] **Step 6: 테스트가 통과하는 것을 확인한다**

Run: `npx vitest run lib/ui/tokens.test.ts`
Expected: PASS (11건)

- [ ] **Step 7: 빌드가 되는지 확인한다**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과. 기존 92건 + 새 11건 = 103건.

- [ ] **Step 8: 공개 페이지가 안 깨졌는지 눈으로 본다**

`npm run dev` 후 발행된 페이지 하나를 `http://localhost:3000/c/<slug>`로 연다. 본문 글꼴이 노토산스 그대로이고, 제목 블록이 노토명조 그대로이고, 읽기 진행바 색이 그대로인지 본다. 이 단계에서 어드민은 아직 안 바뀌어 있는 것이 정상이다.

- [ ] **Step 9: 커밋**

```bash
git add app/layout.tsx app/globals.css lib/ui/tokens.test.ts
git commit -m "$(cat <<'EOF'
feat: 어드민 글래스모피즘 디자인 토큰과 브랜드 글꼴 추가

세일즈 랜딩의 플레임 3정지점을 브랜드 정본으로 채택하고,
Gothic A1 / IBM Plex Sans KR / IBM Plex Mono 3종 체계를 더한다.
공개 페이지가 쓰는 글꼴 변수와 navy 토큰은 테스트로 고정했다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 상태 톤 매핑

**Files:**
- Create: `lib/ui/tones.ts`
- Test: `lib/ui/tones.test.ts` (create)

**Interfaces:**
- Consumes: Task 1의 Tailwind 설정
- Produces: `export type Tone = "indigo" | "blue" | "green" | "red" | "amber" | "gray"`, `export function toneClass(tone: Tone): string`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/ui/tones.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npx vitest run lib/ui/tones.test.ts`
Expected: FAIL — `Failed to resolve import "./tones"`

- [ ] **Step 3: 구현한다**

`lib/ui/tones.ts`:

```ts
/**
 * 어드민 상태 색 한 벌. 상태 뱃지·태그 칩·달력 칩·D-day가 전부 여기서 색을 받는다.
 * 브랜드 플레임과 섞지 않는다 — 플레임은 액센트고 이쪽은 데이터 구분용이다.
 * 여섯 톤 모두 WCAG AA를 통과한다. 가장 낮은 것은 green 4.57:1로 기준(4.5:1)에
 * 아슬아슬하다 — green의 두 색은 더 흐리게 바꾸지 말 것. 가장 높은 것은 indigo 8.06:1.
 */
export const TONES = ["indigo", "blue", "green", "red", "amber", "gray"] as const;

export type Tone = (typeof TONES)[number];

const CLASSES: Record<Tone, string> = {
  indigo: "bg-[#e0e7ff] text-[#3730a3]",
  blue: "bg-[#dbeafe] text-[#1d4ed8]",
  green: "bg-[#dcfce7] text-[#15803d]",
  red: "bg-[#fee2e2] text-[#b91c1c]",
  amber: "bg-[#fef3c7] text-[#92400e]",
  gray: "bg-[#f3f4f6] text-[#4b5563]",
};

export function toneClass(tone: Tone): string {
  return CLASSES[tone];
}
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npx vitest run lib/ui/tones.test.ts`
Expected: PASS (3건)

- [ ] **Step 5: 커밋**

```bash
git add lib/ui/tones.ts lib/ui/tones.test.ts
git commit -m "$(cat <<'EOF'
feat: 어드민 상태 색 한 벌 추가

지금 따로 놀던 seed-design Badge / 회색 태그 칩 / D-day 뱃지가
쓸 공통 톤 여섯 개를 정의한다. 전부 유리 위 AA 통과.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 표면 프리미티브 3종

**Files:**
- Create: `components/ui/GlassPanel.tsx`
- Create: `components/ui/Chip.tsx`
- Create: `components/ui/SectionLabel.tsx`

**Interfaces:**
- Consumes: `lib/ui/tones.ts`의 `Tone`, `toneClass`. Task 1의 `.glass-panel`, `.glass-panel-warn`, `.flame-bar`
- Produces:
  - `GlassPanel({ tone?: "default" | "warning", className?: string, children })`
  - `Chip({ tone: Tone, children })`
  - `SectionLabel({ children })`

세 컴포넌트 모두 서버 컴포넌트다 — `"use client"`를 붙이지 않는다. 상태가 없다.

- [ ] **Step 1: `GlassPanel`을 만든다**

`components/ui/GlassPanel.tsx`:

```tsx
type Props = {
  tone?: "default" | "warning";
  className?: string;
  children: React.ReactNode;
};

/** 어드민의 모든 표면. 회색 테두리 상자를 전부 이걸로 바꾼다. */
export default function GlassPanel({ tone = "default", className = "", children }: Props) {
  const toneClass = tone === "warning" ? "glass-panel glass-panel-warn" : "glass-panel";
  return <div className={`${toneClass} ${className}`}>{children}</div>;
}
```

- [ ] **Step 2: `Chip`을 만든다**

`components/ui/Chip.tsx`:

```tsx
import { toneClass, type Tone } from "@/lib/ui/tones";

type Props = { tone: Tone; children: React.ReactNode };

/** 상태 뱃지·태그·달력 칩·D-day를 전부 대신한다. */
export default function Chip({ tone, children }: Props) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClass(tone)}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: `SectionLabel`을 만든다**

`components/ui/SectionLabel.tsx`:

```tsx
type Props = { children: React.ReactNode };

/**
 * 세일즈 랜딩의 eyebrow를 어드민 그룹 제목에 그대로 쓴다.
 * 한글 라벨에는 uppercase가 영향을 주지 않으므로 그대로 걸어 둔다.
 */
export default function SectionLabel({ children }: Props) {
  return (
    <p className="mb-3 flex items-center gap-2.5 font-num text-[11px] tracking-[0.14em] text-ink-muted uppercase">
      <span aria-hidden="true" className="flame-bar inline-block h-0.5 w-[22px] rounded-sm" />
      {children}
    </p>
  );
}
```

- [ ] **Step 4: 타입과 린트를 확인한다**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: 전부 통과. 아직 아무 화면도 이 컴포넌트를 안 쓰므로 화면 변화는 없다.

- [ ] **Step 5: 커밋**

```bash
git add components/ui
git commit -m "$(cat <<'EOF'
feat: 어드민 표면 프리미티브 3종 추가

GlassPanel(유리 표면), Chip(상태 칩), SectionLabel(플레임 eyebrow).
아직 화면에 연결하지 않았다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 달력 칩 요약 로직

**Files:**
- Modify: `lib/calendar/events.ts`
- Test: `lib/calendar/events.test.ts` (modify)

**Interfaces:**
- Consumes: `lib/ui/tones.ts`의 `Tone`
- Produces:
  - `EVENT_META[kind].shortLabel: string` — 달력 칸 칩용 짧은 라벨
  - `EVENT_META[kind].tone: Tone`
  - `export type DayChip = { kind: CalendarEventKind; count: number }`
  - `export type DaySummary = { chips: DayChip[]; overflow: number }`
  - `export function summarizeDay(events: CalendarEvent[], max?: number): DaySummary`

`EVENT_META`의 기존 `icon`과 `label`은 그대로 둔다 — `CalendarDayDetail`이 계속 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/calendar/events.test.ts` 끝에 붙인다. 기존 테스트는 건드리지 않는다.

```ts
import { EVENT_META, summarizeDay, type CalendarEvent } from "./events";

function ev(kind: CalendarEvent["kind"]): CalendarEvent {
  return { kind, date: "2026-09-18", title: "테스트", href: "/admin", tags: [] };
}

describe("EVENT_META", () => {
  it("네 종류 모두 짧은 라벨과 톤을 갖는다", () => {
    expect(EVENT_META["page-created"].shortLabel).toBe("생성");
    expect(EVENT_META["page-sent"].shortLabel).toBe("전송");
    expect(EVENT_META["customer-applied"].shortLabel).toBe("신청");
    expect(EVENT_META["trial-ending"].shortLabel).toBe("종료");

    expect(EVENT_META["page-created"].tone).toBe("indigo");
    expect(EVENT_META["page-sent"].tone).toBe("blue");
    expect(EVENT_META["customer-applied"].tone).toBe("green");
    expect(EVENT_META["trial-ending"].tone).toBe("red");
  });

  it("상세 목록이 쓰는 icon과 label은 그대로다", () => {
    expect(EVENT_META["trial-ending"].icon).toBe("⚠️");
    expect(EVENT_META["trial-ending"].label).toBe("체험 종료");
  });
});

describe("summarizeDay", () => {
  it("빈 하루는 빈 요약을 낸다", () => {
    expect(summarizeDay([])).toEqual({ chips: [], overflow: 0 });
  });

  it("같은 종류를 하나로 묶고 건수를 센다", () => {
    const events = [ev("page-created"), ev("page-created"), ev("page-sent")];
    expect(summarizeDay(events)).toEqual({
      chips: [
        { kind: "page-created", count: 2 },
        { kind: "page-sent", count: 1 },
      ],
      overflow: 0,
    });
  });

  it("KIND_ORDER 순서를 지킨다 — 입력 순서와 무관하다", () => {
    const events = [ev("trial-ending"), ev("customer-applied"), ev("page-created")];
    expect(summarizeDay(events).chips.map((c) => c.kind)).toEqual([
      "page-created",
      "customer-applied",
      "trial-ending",
    ]);
  });

  it("기본 max는 3이고 넘치는 종류는 overflow로 센다", () => {
    const events = [
      ev("page-created"),
      ev("page-sent"),
      ev("customer-applied"),
      ev("trial-ending"),
    ];
    const summary = summarizeDay(events);
    expect(summary.chips).toHaveLength(3);
    expect(summary.chips.map((c) => c.kind)).toEqual([
      "page-created",
      "page-sent",
      "customer-applied",
    ]);
    expect(summary.overflow).toBe(1);
  });

  it("overflow는 종류 수를 세지 건수를 세지 않는다", () => {
    const events = [
      ev("page-created"),
      ev("page-sent"),
      ev("customer-applied"),
      ev("trial-ending"),
      ev("trial-ending"),
      ev("trial-ending"),
    ];
    expect(summarizeDay(events).overflow).toBe(1);
  });

  it("max를 직접 줄 수 있다", () => {
    const events = [ev("page-created"), ev("page-sent"), ev("customer-applied")];
    const summary = summarizeDay(events, 1);
    expect(summary.chips).toHaveLength(1);
    expect(summary.overflow).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npx vitest run lib/calendar/events.test.ts`
Expected: FAIL — `summarizeDay is not a function`, `shortLabel` undefined

- [ ] **Step 3: `EVENT_META`를 확장한다**

`lib/calendar/events.ts`에서 import 줄에 톤 타입을 더한다:

```ts
import type { Tone } from "@/lib/ui/tones";
```

`EVENT_META` 선언을 통째로 바꾼다:

```ts
/**
 * icon과 label은 하루 상세 목록이 쓴다.
 * shortLabel과 tone은 달력 칸 안 칩이 쓴다 — 칩이 스스로 뜻을 말하므로 범례가 없다.
 */
export const EVENT_META: Record<
  CalendarEventKind,
  { icon: string; label: string; shortLabel: string; tone: Tone }
> = {
  "page-created": { icon: "✏️", label: "생성", shortLabel: "생성", tone: "indigo" },
  "page-sent": { icon: "📤", label: "전송", shortLabel: "전송", tone: "blue" },
  "customer-applied": { icon: "📥", label: "신청", shortLabel: "신청", tone: "green" },
  "trial-ending": { icon: "⚠️", label: "체험 종료", shortLabel: "종료", tone: "red" },
};
```

- [ ] **Step 4: `summarizeDay`를 더한다**

`groupByDate` 함수 바로 아래에 붙인다.

```ts
export type DayChip = { kind: CalendarEventKind; count: number };
export type DaySummary = { chips: DayChip[]; overflow: number };

/**
 * 하루치 이벤트를 종류별로 묶어 달력 칸에 넣을 칩 목록으로 만든다.
 * 종류는 최대 네 가지뿐이라 overflow는 실질적으로 1까지만 나온다.
 */
export function summarizeDay(events: CalendarEvent[], max = 3): DaySummary {
  const counts = new Map<CalendarEventKind, number>();
  for (const event of events) {
    counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  }

  const all: DayChip[] = KIND_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({
    kind,
    count: counts.get(kind)!,
  }));

  return { chips: all.slice(0, max), overflow: Math.max(0, all.length - max) };
}
```

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `npx vitest run lib/calendar/events.test.ts`
Expected: PASS. 기존 테스트도 전부 통과해야 한다.

- [ ] **Step 6: 전체 검증**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: 전부 통과

- [ ] **Step 7: 커밋**

```bash
git add lib/calendar/events.ts lib/calendar/events.test.ts
git commit -m "$(cat <<'EOF'
feat: 달력 칸 칩 요약 로직 추가

이벤트 종류마다 짧은 라벨과 톤을 붙이고, 하루치를 종류별로 묶는
summarizeDay를 더한다. 달력 UI는 다음 태스크에서 갈아끼운다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 어드민 껍데기와 사이드바

여기서부터 화면이 실제로 바뀐다.

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `components/admin/Sidebar.tsx`

**Interfaces:**
- Consumes: Task 1의 `.admin-canvas`, `.flame-text`, `.flame-bar`, `font-admin`, `text-ink-sidebar`
- Produces: 어드민 전체에 캔버스 배경과 본문 글꼴이 걸린 상태

- [ ] **Step 1: `app/admin/layout.tsx`를 바꾼다**

파일 전체를 이렇게 만든다. `font-admin`을 껍데기 `<div>`에 거는 것이 핵심이다 — `<body>`에 걸면 공개 페이지가 같이 바뀐다.

```tsx
import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-seed=""
      data-seed-color-mode="light-only"
      className="font-admin flex min-h-screen"
    >
      <Sidebar />
      <main className="admin-canvas flex-1">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: `components/admin/Sidebar.tsx`를 바꾼다**

`NAV_ITEMS`와 `active` 계산 로직은 그대로 둔다. 바뀌는 것은 로고 그라데이션, 메뉴 글자색, 현재 메뉴의 플레임 바다.

로고 `<span>`을 이렇게 바꾼다:

```tsx
<span className="flame-text text-xl font-extrabold italic font-display">nugget.</span>
```

`<Link>`의 className을 이렇게 바꾼다:

```tsx
className={`relative block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
  active
    ? "bg-white/10 text-white"
    : "text-ink-sidebar hover:bg-white/5 hover:text-white"
}`}
```

그리고 `<Link>` 안, `{item.label}` 앞에 플레임 바를 넣는다:

```tsx
{active && (
  <span
    aria-hidden="true"
    className="flame-bar absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
  />
)}
{item.label}
```

- [ ] **Step 3: 검증**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: 전부 통과

- [ ] **Step 4: 눈으로 본다**

`npm run dev` 후 `http://localhost:3000/admin`을 1280×900에서 연다. 확인할 것:
- 본문 영역에 밝은 오로라 배경이 깔렸는가
- 스크롤해도 오로라가 안 따라오는가
- 로고가 3색 플레임인가
- 현재 메뉴(대시보드) 왼쪽에 플레임 바가 있는가
- 메뉴 글자가 이전보다 밝은가

이 단계에서 본문 내용(달력·목록)은 아직 흰 상자 그대로인 것이 정상이다.

- [ ] **Step 5: 커밋**

```bash
git add app/admin/layout.tsx components/admin/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat: 어드민 껍데기에 글래스 캔버스와 브랜드 사이드바 적용

캔버스 배경과 어드민 본문 글꼴을 껍데기 div에만 걸어
공개 랜딩페이지에 영향이 가지 않게 했다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 대시보드 달력

**Files:**
- Modify: `components/dashboard/Calendar.tsx`
- Modify: `components/dashboard/CalendarDayDetail.tsx`

**Interfaces:**
- Consumes: `summarizeDay`, `EVENT_META[kind].shortLabel/.tone/.icon/.label`, `Chip`, `GlassPanel`, `toneClass`
- Produces: 없음 (화면)

- [ ] **Step 1: `Calendar.tsx`를 바꾼다**

파일 전체를 이렇게 만든다. `useState` 초기값 로직(이번 달일 때만 오늘을 펼침)과 `groupByDate`/`buildMonthGrid` 사용은 그대로다. `countByKind` 지역 함수는 `summarizeDay`로 대체되어 사라진다.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EVENT_META,
  buildMonthGrid,
  formatMonthLabel,
  groupByDate,
  shiftMonth,
  summarizeDay,
  type CalendarEvent,
} from "@/lib/calendar/events";
import { toneClass } from "@/lib/ui/tones";
import GlassPanel from "@/components/ui/GlassPanel";
import CalendarDayDetail from "./CalendarDayDetail";

type Props = { events: CalendarEvent[]; month: string; today: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function Calendar({ events, month, today }: Props) {
  // 이번 달을 보고 있을 때만 오늘을 미리 펼쳐 둔다. 다른 달로 옮기면 선택이 풀린다.
  const [selected, setSelected] = useState<string | null>(
    month === today.slice(0, 7) ? today : null
  );

  const byDate = groupByDate(events);
  const cells = buildMonthGrid(month);

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold text-[#111827]">
          {formatMonthLabel(month)}
        </h2>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin?month=${shiftMonth(month, -1)}`}
            aria-label="이전 달"
            className="glass-field focus-flame px-3 py-1 text-sm text-[#4b5563]"
          >
            ‹
          </Link>
          <Link href="/admin" className="glass-field focus-flame px-3 py-1 text-sm text-[#4b5563]">
            오늘
          </Link>
          <Link
            href={`/admin?month=${shiftMonth(month, 1)}`}
            aria-label="다음 달"
            className="glass-field focus-flame px-3 py-1 text-sm text-[#4b5563]"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={weekday}
            className={`pb-2 text-center text-sm ${index === 0 ? "text-[#b91c1c]" : "text-[#6b7280]"}`}
          >
            {weekday}
          </div>
        ))}

        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="min-h-[72px]" />;

          const dayEvents = byDate[date] ?? [];
          const { chips, overflow } = summarizeDay(dayEvents);
          const isToday = date === today;
          const isSelected = date === selected;
          const isSunday = index % 7 === 0;

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(isSelected ? null : date)}
              aria-pressed={isSelected}
              className={`focus-flame min-h-[72px] rounded-[10px] border p-1.5 text-left align-top transition-colors ${
                isSelected
                  ? "border-transparent bg-navy-900"
                  : isToday
                    ? "border-navy-900 bg-white/55 hover:bg-white/75"
                    : "border-transparent bg-white/55 hover:bg-white/75"
              }`}
            >
              <span
                className={`font-num block text-sm ${
                  isSelected ? "text-white" : isSunday ? "text-[#b91c1c]" : "text-[#374151]"
                }`}
              >
                {Number(date.slice(8, 10))}
              </span>
              <span className="mt-1 flex flex-col gap-0.5">
                {chips.map(({ kind, count }) => (
                  <span
                    key={kind}
                    className={`truncate rounded px-1.5 py-px text-[11px] leading-tight font-semibold ${toneClass(EVENT_META[kind].tone)}`}
                  >
                    {EVENT_META[kind].shortLabel} {count}
                  </span>
                ))}
                {overflow > 0 && (
                  <span
                    className={`rounded px-1.5 py-px text-[11px] leading-tight font-semibold ${toneClass("gray")}`}
                  >
                    +{overflow}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {selected && <CalendarDayDetail date={selected} events={byDate[selected] ?? []} />}
    </GlassPanel>
  );
}
```

- [ ] **Step 2: `CalendarDayDetail.tsx`를 바꾼다**

파일 전체를 이렇게 만든다. 이모지는 여기에 남는다.

```tsx
import Link from "next/link";
import { EVENT_META, type CalendarEvent } from "@/lib/calendar/events";
import Chip from "@/components/ui/Chip";

type Props = { date: string; events: CalendarEvent[] };

function formatDayLabel(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
}

export default function CalendarDayDetail({ date, events }: Props) {
  return (
    <div className="mt-4 border-t border-black/8 pt-4">
      <p className="font-display mb-2.5 text-sm font-bold text-[#374151]">
        {formatDayLabel(date)}
      </p>

      {events.length === 0 ? (
        <p className="text-sm text-[#6b7280]">이 날은 기록이 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event, index) => (
            <li key={`${event.kind}-${event.href}-${index}`}>
              <Link
                href={event.href}
                className="focus-flame flex flex-wrap items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-white/60"
              >
                <span aria-hidden="true">{EVENT_META[event.kind].icon}</span>
                <Chip tone={EVENT_META[event.kind].tone}>{EVENT_META[event.kind].label}</Chip>
                <span className="font-medium text-[#111827] underline">{event.title}</span>
                {event.tags.map((tag) => (
                  <Chip key={tag} tone="gray">
                    {tag}
                  </Chip>
                ))}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 검증**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: 전부 통과

- [ ] **Step 4: 눈으로 본다**

`http://localhost:3000/admin`에서 확인할 것:
- 9/2에 `신청 5` 초록 칩, 9/16에 `생성 4` 남색 칩, 9/18에 `전송 1` 파란 칩이 보이는가
- 일요일 날짜 숫자가 빨간가
- 오늘 칸에 테두리가 있고, 클릭하면 검정으로 채워지며 칩 색이 여전히 읽히는가
- 날짜 숫자가 고정폭이라 세로줄이 맞는가
- Tab으로 이동할 때 앰버 포커스 링이 보이는가

- [ ] **Step 5: 커밋**

```bash
git add components/dashboard/Calendar.tsx components/dashboard/CalendarDayDetail.tsx
git commit -m "$(cat <<'EOF'
feat: 달력을 이모지에서 컬러 칩 방식으로 교체

칸 안에 "생성 4"처럼 글자로 직접 써서 범례 없이 읽히게 했다.
칸 높이 56->72px, 날짜 숫자 12->14px 고정폭, 일요일 빨강.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 대시보드 페이지 목록

**Files:**
- Modify: `components/dashboard/StatusBadge.tsx`
- Modify: `components/dashboard/PagesTable.tsx`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `Chip`, `GlassPanel`, `SectionLabel`, `getPageBadge`
- Produces: `StatusBadge`가 seed-design `Badge` 대신 `Chip`을 쓴다

`lib/pages/badge.ts`의 `getPageBadge`는 건드리지 않는다 — 기존 테스트가 그 tone 값(`"warning"` 등)을 검사한다. 대신 `StatusBadge`가 seed-design tone을 우리 `Tone`으로 옮긴다.

- [ ] **Step 1: `StatusBadge.tsx`를 바꾼다**

```tsx
import type { PageStatus } from "@/lib/pages/types";
import { getPageBadge } from "@/lib/pages/badge";
import type { Tone } from "@/lib/ui/tones";
import Chip from "@/components/ui/Chip";

// getPageBadge는 seed-design 어휘로 tone을 낸다. 기존 테스트가 그 값을
// 검사하므로 건드리지 않고, 여기서 우리 톤으로 옮긴다.
const TONE_MAP: Record<string, Tone> = {
  warning: "amber",
  neutral: "gray",
  positive: "green",
  informative: "blue",
};

export default function StatusBadge({
  status,
  sentOn,
}: {
  status: PageStatus;
  sentOn: string | null;
}) {
  const { label, tone } = getPageBadge(status, sentOn);
  return <Chip tone={TONE_MAP[tone] ?? "gray"}>{label}</Chip>;
}
```

- [ ] **Step 2: `PagesTable.tsx`의 그룹 제목과 표면을 바꾼다**

`export default function PagesTable`의 return을 이렇게 바꾼다. `GROUPS`와 `PageRow`의 구조는 그대로다.

```tsx
  return (
    <VStack gap="x6">
      {GROUPS.map(({ status, heading }) => {
        const groupPages = pages.filter((page) => page.status === status);
        if (groupPages.length === 0) return null;

        return (
          <Box key={status}>
            <SectionLabel>
              {heading} ({groupPages.length})
            </SectionLabel>
            <GlassPanel>
              <ul>
                {groupPages.map((page, index) => (
                  <PageRow key={page.id} page={page} isLast={index === groupPages.length - 1} />
                ))}
              </ul>
            </GlassPanel>
          </Box>
        );
      })}
    </VStack>
  );
```

`GlassPanel`은 `as` prop이 없다. `<ul>`을 안에 넣어 감싼다 — `PageRow`가 `HStack as="li"`라
`<ul>` 직계 자식이 `<li>`가 되어 HTML도 맞는다.

파일 위쪽 import에 두 줄을 더하고, 빈 상태 텍스트도 14px로 올린다:

```tsx
import GlassPanel from "@/components/ui/GlassPanel";
import SectionLabel from "@/components/ui/SectionLabel";
import Chip from "@/components/ui/Chip";
```

- [ ] **Step 3: `PageRow`의 태그 칩과 메타 글자 크기를 바꾼다**

`PageRow` 안의 태그 블록을 이렇게 바꾼다:

```tsx
{page.sendTags.length > 0 && (
  <div className="mt-1.5 flex flex-wrap gap-1">
    {page.sendTags.map((tag) => (
      <Chip key={tag} tone="gray">
        {tag}
      </Chip>
    ))}
  </div>
)}
```

`PageRow`의 `borderColor="stroke.neutralWeak"`는 그대로 둔다 — 유리 패널 안의 행 구분선으로 계속 쓴다.

- [ ] **Step 4: `app/admin/page.tsx`의 폭과 제목을 바꾼다**

return 블록을 이렇게 바꾼다:

```tsx
  return (
    <div className="mx-auto max-w-[1160px] space-y-8 p-8">
      <Calendar events={events} month={month} today={today} />

      <div>
        <h1 className="font-display mb-5 text-2xl font-extrabold text-[#111827]">
          랜딩페이지 목록
        </h1>
        <PagesTable pages={pages} />
      </div>
    </div>
  );
```

- [ ] **Step 5: 검증**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: 전부 통과. `lib/pages/badge.test.ts`가 계속 통과하는지 특히 확인한다.

- [ ] **Step 6: 눈으로 본다**

`http://localhost:3000/admin`에서:
- 발행됨/임시저장/보관 그룹 제목이 플레임 바가 붙은 작은 라벨인가
- 각 그룹이 유리 패널 안에 들어갔는가
- 상태 뱃지가 새 칩 색인가 (전송됨=파랑, 발행=초록, 임시저장=앰버, 보관=회색)
- 전송 태그가 회색 칩으로 보이는가
- 본문이 이전보다 넓게 퍼지는가

- [ ] **Step 7: 커밋**

```bash
git add components/dashboard/StatusBadge.tsx components/dashboard/PagesTable.tsx app/admin/page.tsx
git commit -m "$(cat <<'EOF'
feat: 대시보드 페이지 목록에 유리 패널과 공통 칩 적용

seed-design Badge를 걷어내고 Chip으로 통일했다.
getPageBadge는 기존 테스트가 tone 값을 검사하므로 건드리지 않고
StatusBadge에서 우리 톤으로 옮긴다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 대시보드 버튼 4종

**Files:**
- Modify: `components/dashboard/CopyLinkButton.tsx`
- Modify: `components/dashboard/DuplicateButton.tsx`
- Modify: `components/dashboard/StatusActionButton.tsx`
- Modify: `components/dashboard/DeleteButton.tsx`

**Interfaces:**
- Consumes: Task 1의 `.btn-flame`, `.btn-quiet`, `.btn-danger`, `.focus-flame`
- Produces: 없음 (화면)

네 파일 모두 seed-design `ActionButton`을 쓴다. `ActionButton`의 동작(로딩 상태, `asChild`)은 그대로 두고 `className`만 더한다. `DeleteButton`처럼 확인 절차가 있는 것은 절차를 건드리지 않는다.

- [ ] **Step 1: 네 파일의 버튼에 클래스를 더한다**

각 파일에서 `<ActionButton ...>`에 `className`을 더한다. 이미 `className`이 있으면 뒤에 이어 붙인다.

- `CopyLinkButton`, `DuplicateButton`, `StatusActionButton`의 보조 동작 → `className="btn-quiet focus-flame"`
- `DeleteButton`의 삭제 버튼 → `className="btn-danger focus-flame"`
- `StatusActionButton`에서 발행 동작에 해당하는 버튼 → `className="btn-flame focus-flame"`

`variant`/`size` prop은 그대로 둔다 — seed-design의 크기·간격은 계속 쓴다.

- [ ] **Step 2: 검증**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: 전부 통과

- [ ] **Step 3: 눈으로 본다**

`/admin`에서 각 행의 버튼이 알약형인지, 발행 버튼만 플레임인지, 삭제가 연빨강인지 본다. **삭제를 실제로 누르지 않는다** — 확인 절차가 있는 동작이다.

- [ ] **Step 4: 커밋**

```bash
git add components/dashboard/CopyLinkButton.tsx components/dashboard/DuplicateButton.tsx components/dashboard/StatusActionButton.tsx components/dashboard/DeleteButton.tsx
git commit -m "$(cat <<'EOF'
feat: 대시보드 버튼을 알약형 브랜드 스타일로 통일

seed-design ActionButton의 동작은 그대로 두고 표면만 바꿨다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 고객 신청 화면

가장 복잡한 화면이다. 승인된 목업이 바로 이 화면이므로 목업과 대조하며 만든다.

**Files:**
- Modify: `components/customers/CustomerStatusBadge.tsx`
- Modify: `components/customers/TrialDDayBadge.tsx`
- Modify: `components/customers/StatusFilterChips.tsx`
- Modify: `components/customers/CustomersTable.tsx`
- Modify: `components/customers/EndingSoonSection.tsx`
- Modify: `components/customers/CustomerSearch.tsx`
- Modify: `components/customers/DateField.tsx`
- Modify: `components/customers/CustomerForm.tsx`
- Modify: `components/customers/DeleteCustomerButton.tsx`
- Modify: `components/customers/BulkDeleteBar.tsx`
- Modify: `app/admin/customers/page.tsx`
- Modify: `app/admin/customers/[id]/page.tsx`
- Modify: `app/admin/customers/new/page.tsx`

**Interfaces:**
- Consumes: `Chip`, `GlassPanel`, `SectionLabel`, `toneClass`
- Produces: 없음 (화면)

- [ ] **Step 1: `CustomerStatusBadge.tsx`를 바꾼다**

```tsx
import { CUSTOMER_STATUS_LABELS, type CustomerStatus } from "@/lib/customers/types";
import type { Tone } from "@/lib/ui/tones";
import Chip from "@/components/ui/Chip";

const TONES: Record<CustomerStatus, Tone> = {
  new: "indigo",
  trial: "blue",
  converted: "green",
  churned: "gray",
};

export default function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return <Chip tone={TONES[status]}>{CUSTOMER_STATUS_LABELS[status]}</Chip>;
}
```

- [ ] **Step 2: `TrialDDayBadge.tsx`를 바꾼다**

D-4 이상은 앰버, D-3 이하(오늘·지남 포함)는 빨강이다.

```tsx
import { formatDDay } from "@/lib/customers/trial";
import Chip from "@/components/ui/Chip";

/** D-4 이상은 앰버로 여유, D-3 이하는 빨강으로 급함을 나타낸다. */
export default function TrialDDayBadge({ dday }: { dday: number }) {
  return <Chip tone={dday >= 4 ? "amber" : "red"}>{formatDDay(dday)}</Chip>;
}
```

- [ ] **Step 3: `StatusFilterChips.tsx`의 지역 `Chip`을 바꾼다**

이 파일의 지역 `Chip` 컴포넌트는 링크라서 공통 `Chip`(span)으로 대체할 수 없다. 이름 충돌을 피해 `FilterChip`으로 바꾸고 스타일만 새 토큰으로 맞춘다.

```tsx
function FilterChip({ active, to, children }: { active: boolean; to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={`focus-flame rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-navy-900 text-white" : "glass-field text-[#4b5563] hover:bg-white/90"
      }`}
    >
      {children}
    </Link>
  );
}
```

`StatusFilterChips` 안의 `<Chip ...>` 두 군데를 `<FilterChip ...>`으로 바꾼다.

- [ ] **Step 4: `CustomersTable.tsx`의 표면과 링크를 바꾼다**

바깥 `<Box as="ul" borderWidth={1} ...>`를 `GlassPanel`로 감싼다:

```tsx
  return (
    <GlassPanel>
      <ul>
        {customers.map((customer, index) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            isLast={index === customers.length - 1}
            today={today}
          />
        ))}
      </ul>
    </GlassPanel>
  );
```

`CustomerRow` 안 "열기" 링크의 글자 크기를 올린다:

```tsx
<Link
  href={`/admin/customers/${customer.id}`}
  className="focus-flame rounded text-sm font-medium text-[#4b5563] underline"
>
  열기
</Link>
```

빈 상태 텍스트도 14px로 올린다.

- [ ] **Step 5: `EndingSoonSection.tsx`를 경고 패널로 바꾼다**

`<Text as="h2" ...>`를 `SectionLabel`로 바꾸고, 바깥 `<Box as="ul" borderWidth={1} borderColor="stroke.criticalWeak">`를 경고 톤 `GlassPanel`로 바꾼다.

```tsx
  return (
    <GlassPanel tone="warning" className="p-4">
      <SectionLabel>⚠ 체험 종료 임박 ({customers.length})</SectionLabel>
      <ul>
        {/* 기존 map 내용 그대로 */}
      </ul>
    </GlassPanel>
  );
```

`ReminderMark`의 `color="fg.critical"`은 그대로 둔다 — seed-design `Text`의 의미 색이라 유리 위에서도 충분히 읽힌다.

- [ ] **Step 6: `CustomerSearch.tsx`와 `DateField.tsx`의 입력칸을 바꾼다**

두 파일의 `<input>`에 `className="glass-field focus-flame px-3 py-2 text-sm text-[#111827]"`를 건다. `CustomerSearch`의 렌더 단계 상태 조정 패턴(`react-hooks/set-state-in-effect`를 피하려고 쓴 것)은 **건드리지 않는다.**

- [ ] **Step 7: `CustomerForm.tsx`를 유리 패널 안에 넣는다**

폼 전체를 `<GlassPanel className="p-6">`으로 감싼다. 안의 입력칸들에 `glass-field focus-flame`을 건다. 상태 뱃지와 `<h1>`이 `form.status`/`form.name`을 읽는 것은 **그대로 둔다** — 이전에 고친 버그다. `<h1>`에 `font-display text-2xl font-extrabold`를 건다.

- [ ] **Step 8: `DeleteCustomerButton.tsx`에 위험 버튼 스타일을 건다**

`className="btn-danger focus-flame"`. 확인 절차는 건드리지 않는다.

- [ ] **Step 9: 세 페이지의 폭과 제목을 바꾼다**

`app/admin/customers/page.tsx`의 바깥 `<div className="mx-auto max-w-3xl p-6">`를 `<div className="mx-auto max-w-[1160px] p-8">`로 바꾸고, `<h1>`을 이렇게 바꾼다:

```tsx
<h1 className="font-display text-2xl font-extrabold text-[#111827]">고객 신청</h1>
```

"+ 고객 추가" 링크를 주요 버튼으로 바꾼다:

```tsx
<Link href="/admin/customers/new" className="btn-flame focus-flame px-4 py-2 text-sm">
  + 고객 추가
</Link>
```

`app/admin/customers/[id]/page.tsx`와 `new/page.tsx`도 같은 폭으로 맞춘다.

- [ ] **Step 10: 검증**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: 전부 통과

- [ ] **Step 11: 눈으로 본다**

`http://localhost:3000/admin/customers`를 승인된 목업과 나란히 놓고 본다. 확인할 것:
- 체험 종료 임박이 연주황 경고 패널인가
- 필터 칩이 알약형이고 선택된 것만 검정인가
- 고객 표가 유리 패널 안에 있는가
- 상태 칩이 신규=남색 / 체험중=파랑 / 전환=초록 / 이탈=회색인가
- D-day가 D-3 이하만 빨강인가
- 검색칸에 Tab으로 들어갔을 때 앰버 링이 보이는가
- 고객 하나를 열어 폼이 유리 패널 안에 있는지, 이름을 고치면 제목과 뱃지가 같이 바뀌는지

**고객 삭제는 누르지 않는다.**

- [ ] **Step 12: 커밋**

```bash
git add components/customers app/admin/customers
git commit -m "$(cat <<'EOF'
feat: 고객 신청 화면 전체에 글래스 디자인 적용

상태 뱃지와 D-day를 공통 Chip으로 옮기고, 체험 종료 임박을
경고 톤 유리 패널로 바꿨다. D-day는 D-3 이하만 빨강으로 구분한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: 발행된 URL 화면

**Files:**
- Modify: `app/admin/published/page.tsx`
- Modify: `components/dashboard/SendControls.tsx`

**Interfaces:**
- Consumes: `Chip`, `GlassPanel`
- Produces: 없음 (화면)

- [ ] **Step 1: `app/admin/published/page.tsx`를 바꾼다**

바깥 `<div className="mx-auto max-w-3xl p-6">` → `<div className="mx-auto max-w-[1160px] p-8">`.

`<h1>`과 설명문:

```tsx
<h1 className="font-display text-2xl font-extrabold text-[#111827]">발행된 URL</h1>
<p className="mt-2 max-w-[70ch] text-sm text-[#4b5563]">
  {/* 기존 문구 그대로 */}
</p>
```

목록을 감싸는 `<Box borderWidth={1} borderColor="stroke.neutralWeak" borderRadius="r2" marginTop="x6">`를 `<GlassPanel className="mt-6">`로 바꾼다.

읽기전용 URL 입력칸을 새 토큰으로 바꾼다:

```tsx
<input
  type="text"
  readOnly
  value={`${origin}/c/${page.slug}`}
  className="glass-field focus-flame font-num mt-1.5 w-full px-2.5 py-1.5 text-sm text-[#4b5563]"
/>
```

정렬 로직(`sortKey`), 필터(`publishedAt !== null`), `tagSuggestions` 계산은 **건드리지 않는다.**

- [ ] **Step 2: `SendControls.tsx`의 입력칸과 태그 칩을 바꾼다**

날짜 입력칸에 `glass-field focus-flame px-3 py-1.5 text-sm`을 건다.

태그 칩은 `×` 버튼이 붙어 있어 공통 `Chip`(span)으로 그대로 바꿀 수 없다. 칩 겉모양만 `toneClass("gray")`로 맞춘다:

```tsx
<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass("gray")}`}>
  {tag}
  <button type="button" onClick={...} aria-label={`${tag} 태그 지우기`} className="focus-flame rounded-full">
    ×
  </button>
</span>
```

`<datalist>` 자동완성, 자동 저장 `PATCH /api/pages/${pageId}/send`, 저장 중 `opacity-50` 처리는 **전부 그대로 둔다.**

- [ ] **Step 3: 검증**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: 전부 통과

- [ ] **Step 4: 눈으로 본다**

`http://localhost:3000/admin/published`에서:
- 목록이 유리 패널 안에 있는가
- URL 칸이 고정폭 글꼴이라 읽기 편한가
- 전송일을 하나 바꾸면 저장되고 뱃지가 전송됨으로 바뀌는가
- 태그를 하나 넣고 Enter를 치면 칩이 붙는가, `×`로 지워지는가

이전에 남은 테스트 기록이 있다 — `l0c0fqg6`의 `2026-09-18` + `세무사 1차`, `1mrjqzvw`의 `강남지역`. 이 화면에서 `×`로 지울 수 있다.

- [ ] **Step 5: 커밋**

```bash
git add app/admin/published/page.tsx components/dashboard/SendControls.tsx
git commit -m "$(cat <<'EOF'
feat: 발행된 URL 화면에 글래스 디자인 적용

전송일 자동 저장과 태그 자동완성 동작은 그대로 두고 표면만 바꿨다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: 에디터 화면과 로그인

**Files:**
- Modify: `app/admin/new/page.tsx`
- Modify: `app/admin/[id]/edit/page.tsx`
- Modify: `components/editor/PageEditorForm.tsx`
- Modify: `components/editor/BlockList.tsx`
- Modify: `components/editor/SortableBlockItem.tsx`
- Modify: `components/editor/BannerBlockEditor.tsx`
- Modify: `components/editor/CtaBlockEditor.tsx`
- Modify: `components/editor/DividerBlockEditor.tsx`
- Modify: `components/editor/DividerStyleSelect.tsx`
- Modify: `components/editor/FormBlockEditor.tsx`
- Modify: `components/editor/ScrollEffectSelect.tsx`
- Modify: `components/editor/TableToolbarControls.tsx`
- Modify: `components/editor/TextBlockEditor.tsx`
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: `GlassPanel`, Task 1의 `.glass-field`, `.btn-*`, `.admin-canvas`
- Produces: 없음 (화면)

**적용 수준은 표면과 입력칸까지다.** 블록 편집기 각각의 필드 구성과 드래그 핸들 동작은 손대지 않는다. `RichTextEditor.tsx`는 **건드리지 않는다** — 글꼴 선택 드롭다운이 공개 페이지에 저장되는 값을 다루므로 어드민 글꼴 체계와 별개다.

- [ ] **Step 1: 두 에디터 페이지의 폭을 넓힌다**

`app/admin/new/page.tsx`와 `app/admin/[id]/edit/page.tsx`의 바깥 컨테이너를 `max-w-[1160px] p-8`로 맞추고, `<h1>`이 있으면 `font-display text-2xl font-extrabold text-[#111827]`를 건다.

- [ ] **Step 2: `PageEditorForm.tsx`를 유리 패널 안에 넣는다**

폼 본체를 `<GlassPanel className="p-6">`으로 감싼다. 제목·슬러그 입력칸에 `glass-field focus-flame px-3 py-2 text-sm`을 건다. 저장 버튼에 `btn-flame focus-flame`, 취소에 `btn-quiet focus-flame`를 건다.

- [ ] **Step 3: `BlockList.tsx`와 `SortableBlockItem.tsx`의 표면을 바꾼다**

블록 하나하나를 감싸는 상자를 `GlassPanel`로 바꾼다. **dnd-kit의 `useSortable` 관련 props(`ref`, `style`, `attributes`, `listeners`)와 드래그 핸들은 전부 그대로 둔다** — 드래그가 깨지면 기능 회귀다.

- [ ] **Step 4: 블록 편집기 8개의 입력칸을 바꾼다**

`BannerBlockEditor`, `CtaBlockEditor`, `DividerBlockEditor`, `DividerStyleSelect`, `FormBlockEditor`, `ScrollEffectSelect`, `TableToolbarControls`, `TextBlockEditor`의 `<input>`, `<select>`, `<textarea>`에 `glass-field focus-flame px-3 py-2 text-sm`을 건다. 필드 순서와 `onChange` 처리는 건드리지 않는다.

- [ ] **Step 5: `app/login/page.tsx`를 바꾼다**

```tsx
<main
  data-seed=""
  data-seed-color-mode="light-only"
  className="admin-canvas font-admin flex min-h-screen items-center justify-center px-4"
>
  <form action="/api/login" method="POST" className="glass-panel w-full max-w-sm space-y-5 p-8">
    <h1 className="font-display text-xl font-extrabold text-[#111827]">관리자 로그인</h1>
    {/* hidden next, TextField는 그대로 */}
    <ActionButton type="submit" variant="neutralSolid" className="btn-flame focus-flame w-full">
      로그인
    </ActionButton>
  </form>
</main>
```

`<TextField>`/`<TextFieldInput>`의 오류 처리(`invalid`, `errorMessage`)는 **그대로 둔다.** 로그인 라우트는 form-encoded POST이므로 `action`/`method`를 건드리지 않는다.

- [ ] **Step 6: 검증**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 7: 눈으로 본다**

- `http://localhost:3000/login` — 오로라 배경 위 유리 카드인가. 로그인이 되는가
- `http://localhost:3000/admin/new` — 폼이 유리 패널 안인가
- 기존 페이지 하나를 열어 `/admin/<id>/edit`에서 **블록을 드래그해 순서를 바꿔본다.** 드래그가 이전처럼 동작하는가
- 리치 텍스트 편집기에서 글꼴을 바꿔보고, 표를 넣어본다

- [ ] **Step 8: 커밋**

```bash
git add app/admin/new app/admin/\[id\] components/editor app/login
git commit -m "$(cat <<'EOF'
feat: 에디터 화면과 로그인에 글래스 디자인 적용

표면과 입력칸만 바꾸고 블록 편집기 구성과 dnd-kit 드래그는 그대로 뒀다.
RichTextEditor는 공개 페이지에 저장되는 글꼴을 다루므로 건드리지 않았다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: 전체 회귀 확인

코드를 더 쓰지 않는다. 범위 밖이 안 깨졌는지 확인하는 태스크다.

**Files:** 없음 (확인만). 문제를 찾으면 해당 파일을 고친다.

- [ ] **Step 1: 자동 검사를 전부 돌린다**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과. 테스트는 기존 92건 + Task 1의 11건 + Task 2의 3건 + Task 4의 8건 = **114건**.

- [ ] **Step 2: 공개 페이지 회귀를 확인한다**

`npm run dev` 후 발행된 페이지를 `http://localhost:3000/c/<slug>`로 연다. 확인할 것:

- 본문 글꼴이 노토산스 그대로인가 (IBM Plex로 바뀌지 않았는가)
- 제목 블록이 노토명조 그대로인가
- 리치 텍스트에서 글꼴을 지정한 문단이 그 글꼴로 나오는가 — 나눔고딕·나눔명조·Gothic A1 셋 다 확인한다
- 읽기 진행바(맨 위 3px 바) 색이 검정 그대로인가
- 스크롤 효과(fade-up 등)가 동작하는가

하나라도 어긋나면 Task 1의 글꼴 변수 처리를 다시 본다.

- [ ] **Step 3: 어드민 8개 화면을 1280×900에서 하나씩 본다**

`/login`, `/admin`, `/admin/customers`, `/admin/customers/<id>`, `/admin/customers/new`, `/admin/published`, `/admin/new`, `/admin/<id>/edit`.

각 화면에서:
- 패널 경계가 보이는가
- 글자가 배경에 묻히지 않는가
- Tab을 눌러 이동할 때 포커스 링이 모든 입력칸·버튼·링크에서 보이는가
- 주요 버튼의 플레임이 배경과 싸우지 않는가
- 12px 본문 글자가 남아 있지 않은가

- [ ] **Step 4: 좁은 폭에서 깨지지 않는지 본다**

브라우저 창을 900px 폭으로 줄여 `/admin`과 `/admin/customers`를 본다. `max-w-[1160px]`가 자연스럽게 줄어들고 가로 스크롤이 생기지 않는지 확인한다.

- [ ] **Step 5: 동작이 안 바뀌었는지 확인한다**

이번 작업은 스타일 개편이다. 다음이 전부 이전처럼 동작해야 한다:

- 달력에서 월 이동(‹ › 오늘)과 날짜 선택·해제
- 고객 검색과 상태 필터
- 고객 정보 수정 저장
- 전송일 자동 저장, 태그 추가·삭제
- 에디터 블록 드래그 순서 변경
- 로그인

- [ ] **Step 6: 남은 문제를 고치고 커밋한다**

문제를 찾았으면 고치고 커밋한다. 없으면 이 단계를 건너뛴다.

```bash
git commit -m "$(cat <<'EOF'
fix: 글래스 개편 회귀 확인에서 나온 문제 수정

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: 마무리**

**REQUIRED SUB-SKILL:** superpowers:finishing-a-development-branch를 써서 마무리한다.

---

## 실행 중 발견한 계획서 결함

이 계획은 PR #9(고객 일괄 삭제)가 `main`에 머지되기 **전** 브랜치에서 작성됐다. 그래서
`main` 기준으로 실행할 때 두 가지가 어긋났다.

1. **Task 9의 `CustomersTable.tsx` 코드 블록이 낡았다.** 체크박스 선택(`selected`/`onToggle`)과
   `BulkDeleteBar` 연동이 빠진 버전이라, 그대로 덮었다면 일괄 삭제 기능이 사라졌을 것이다.
   구현자가 이를 알아채고 기능을 보존한 채 스타일만 입혔다.
2. **`BulkDeleteBar.tsx`가 Task 9 파일 목록에서 누락됐다.** 뒤늦게 같은 태스크에 추가했다
   (커밋 `0652b80`).

교훈: 계획서를 쓴 브랜치와 실행할 브랜치가 다르면, 태스크의 코드 블록이 현재 파일보다
낡았을 수 있다. 브리프의 코드를 그대로 복사하되 **현재 파일에만 있는 기능은 보존**해야 한다.
