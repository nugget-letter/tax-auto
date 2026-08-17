# 구분선 스타일 다양화 + 인라인 구분선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구분선 블록에 5가지 선택 가능한 스타일(연한 실선/진한 실선/점선/파선/점 3개 장식)을 추가하고, 리치텍스트 에디터 본문 안에서도 같은 5가지 스타일의 구분선을 삽입할 수 있게 한다.

**Architecture:** 5개 프리셋 정의를 `lib/pages/dividerStyle.ts` 한 곳에 두고 블록 에디터/공개 렌더링/Tiptap 삽입 세 곳에서 재사용한다. 공개 페이지의 블록 간 자동 회색 선(`divide-y`)을 걷어내고 배너/텍스트/CTA가 각자 자기 상단 테두리를 그리게 바꿔, 구분선 블록이 그 공용 선에서 완전히 독립적으로 자기 스타일을 그릴 수 있게 한다. 인라인 구분선은 새 Tiptap 커스텀 노드(`<hr style="...">`)로 구현하고, 서버 sanitizer가 그 스타일 값을 화이트리스트로 허용하도록 확장한다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Zod, Tiptap(`@tiptap/core`), sanitize-html.

## Global Constraints

- 새 외부 의존성(npm 패키지)을 추가하지 않는다 — Tiptap 커스텀 노드는 `@tiptap/core`의 `Node.create()`로 직접 작성한다(`@tiptap/extension-horizontal-rule`은 import하지 않는다 — package.json에 명시된 의존성이 아니다).
- 5개 프리셋(`solid-light`/`solid-dark`/`dotted`/`dashed`/`dots`)의 라벨과 CSS 값은 `lib/pages/dividerStyle.ts` 한 곳에서만 정의하고, 다른 모든 파일은 그 값을 참조만 한다 — 값을 다른 파일에 복사하지 않는다.
- `style`/`variant` 필드가 없는 기존 데이터는 항상 `"solid-light"`로 취급한다(하위 호환, 마이그레이션 없음).
- 배너/텍스트/CTA 블록의 화면상 모습(테두리 위치)은 이번 변경 전후로 완전히 동일해야 한다 — `isFirst`가 아닌 블록에 `border-t border-gray-100`을 직접 그려 기존 `divide-y divide-gray-100`과 동일한 결과를 재현한다.
- 이 프로젝트는 별도 유닛 테스트 프레임워크를 두지 않는다. 각 태스크의 검증은 `npx tsc --noEmit` + `npm run lint` + 명시된 수동 QA로 한다. 마지막 태스크에서 `npm run build`로 전체 빌드를 통과시킨다.
- sanitizer(`lib/sanitize.ts`)에 새로 허용하는 스타일 속성 값은 반드시 정규식으로 제한한다(임의 값 허용 금지) — 기존 `COLOR_PATTERNS` 재사용 원칙을 따른다.

---

## Task 1: 데이터 모델 — `dividerStyleSchema` + 공유 프리셋 정의

**Files:**
- Modify: `lib/pages/types.ts`
- Create: `lib/pages/dividerStyle.ts`

**Interfaces:**
- Produces: `dividerStyleSchema`(zod), `DividerStyle` 타입(`lib/pages/types.ts`에서 export), `dividerBlockSchema`에 `style?: DividerStyle` 필드 추가. `DIVIDER_STYLE_PRESETS: Record<DividerStyle, LinePreset | DotsPreset>`, `DEFAULT_DIVIDER_STYLE: DividerStyle`(`lib/pages/dividerStyle.ts`에서 export).

- [ ] **Step 1: `dividerStyleSchema` 추가 및 `dividerBlockSchema`에 `style` 필드 추가**

`lib/pages/types.ts`에서 `scrollEffectSchema` 선언 바로 다음에 추가:

```ts
export const dividerStyleSchema = z.enum(["solid-light", "solid-dark", "dotted", "dashed", "dots"]);
export type DividerStyle = z.infer<typeof dividerStyleSchema>;
```

기존 `dividerBlockSchema`를 다음과 같이 수정한다:

```ts
export const dividerBlockSchema = z.object({
  type: z.literal("divider"),
  style: dividerStyleSchema.optional(),
  scrollEffect: scrollEffectSchema.optional(),
});
```

- [ ] **Step 2: `lib/pages/dividerStyle.ts` 신규 작성**

```ts
import type { DividerStyle } from "./types";

type LinePreset = { label: string; kind: "line"; borderTop: string };
type DotsPreset = { label: string; kind: "dots" };

export const DIVIDER_STYLE_PRESETS: Record<DividerStyle, LinePreset | DotsPreset> = {
  "solid-light": { label: "연한 실선", kind: "line", borderTop: "1px solid #E5E7EB" },
  "solid-dark": { label: "진한 실선", kind: "line", borderTop: "2px solid #9CA3AF" },
  dotted: { label: "점선", kind: "line", borderTop: "1px dotted #D1D5DB" },
  dashed: { label: "파선", kind: "line", borderTop: "1px dashed #D1D5DB" },
  dots: { label: "점 3개 장식", kind: "dots" },
};

export const DEFAULT_DIVIDER_STYLE: DividerStyle = "solid-light";
```

- [ ] **Step 3: 타입 체크로 검증**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npx tsc --noEmit`
Expected: 에러 없음. (다른 파일이 아직 `style` 필드나 새 프리셋을 쓰지 않으므로 새 에러가 생기지 않아야 한다.)

- [ ] **Step 4: 커밋**

```bash
git add lib/pages/types.ts lib/pages/dividerStyle.ts
git commit -m "feat: add divider style schema and shared preset definitions"
```

---

## Task 2: 공개 페이지 — `DividerBlock` 스타일 렌더링

**Files:**
- Modify: `components/public/DividerBlock.tsx`

**Interfaces:**
- Consumes: `DIVIDER_STYLE_PRESETS`, `DEFAULT_DIVIDER_STYLE`(`@/lib/pages/dividerStyle`, Task 1), `DividerStyle`(`@/lib/pages/types`, Task 1).
- Produces: `DividerBlock({ style }: { style?: DividerStyle })` — Task 4에서 `app/c/[slug]/page.tsx`가 `style={block.style}`로 호출.

- [ ] **Step 1: `DividerBlock` 컴포넌트 수정**

`components/public/DividerBlock.tsx` 전체를 다음으로 교체한다:

```tsx
import { DIVIDER_STYLE_PRESETS, DEFAULT_DIVIDER_STYLE } from "@/lib/pages/dividerStyle";
import type { DividerStyle } from "@/lib/pages/types";

export default function DividerBlock({ style = DEFAULT_DIVIDER_STYLE }: { style?: DividerStyle }) {
  const preset = DIVIDER_STYLE_PRESETS[style];

  if (preset.kind === "dots") {
    return (
      <div className="mx-auto max-w-xl px-6 py-6 text-center text-sm tracking-widest text-gray-400">
        • • •
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <div style={{ borderTop: preset.borderTop }} />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 / 린트**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (아직 `app/c/[slug]/page.tsx`가 `style` prop 없이 `<DividerBlock />`을 호출 중이므로 `style` prop이 optional이라 에러 없음.)

- [ ] **Step 3: 커밋**

```bash
git add components/public/DividerBlock.tsx
git commit -m "feat: render divider block per selected style preset"
```

---

## Task 3: 에디터 UI — `DividerStyleSelect` + `DividerBlockEditor`

**Files:**
- Create: `components/editor/DividerStyleSelect.tsx`
- Modify: `components/editor/DividerBlockEditor.tsx`

**Interfaces:**
- Consumes: `DIVIDER_STYLE_PRESETS`(`@/lib/pages/dividerStyle`, Task 1), `DividerStyle`(`@/lib/pages/types`, Task 1), `ScrollEffectSelect`(기존).
- Produces: `DividerStyleSelect({ value, onChange }: { value: DividerStyle | undefined; onChange: (value: DividerStyle) => void })`.

- [ ] **Step 1: `DividerStyleSelect` 작성**

`components/editor/DividerStyleSelect.tsx` 새로 작성 (기존 `components/editor/ScrollEffectSelect.tsx`와 동일한 패턴):

```tsx
"use client";

import type { DividerStyle } from "@/lib/pages/types";
import { DIVIDER_STYLE_PRESETS } from "@/lib/pages/dividerStyle";

type Props = {
  value: DividerStyle | undefined;
  onChange: (value: DividerStyle) => void;
};

export default function DividerStyleSelect({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500">구분선 스타일</label>
      <select
        value={value ?? "solid-light"}
        onChange={(e) => onChange(e.target.value as DividerStyle)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {Object.entries(DIVIDER_STYLE_PRESETS).map(([id, preset]) => (
          <option key={id} value={id}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: `DividerBlockEditor`에 스타일 선택 배치**

`components/editor/DividerBlockEditor.tsx` 전체를 다음으로 교체한다:

```tsx
"use client";

import type { DividerBlock } from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";
import DividerStyleSelect from "./DividerStyleSelect";

type Props = {
  block: DividerBlock;
  onChange: (block: DividerBlock) => void;
};

export default function DividerBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">구분선</p>
      <DividerStyleSelect
        value={block.style}
        onChange={(style) => onChange({ ...block, style })}
      />
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크 / 린트**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add components/editor/DividerStyleSelect.tsx components/editor/DividerBlockEditor.tsx
git commit -m "feat: add divider style selector to block editor"
```

---

## Task 4: 공개 페이지 — 블록 구분선 렌더링 구조 변경 (`divide-y` 제거)

**Files:**
- Modify: `components/public/BannerBlock.tsx`
- Modify: `components/public/TextBlock.tsx`
- Modify: `components/public/CtaButton.tsx`
- Modify: `app/c/[slug]/page.tsx`

**Interfaces:**
- Produces: `BannerBlock({ block, isFirst }: { block: BannerBlockType; isFirst: boolean })`, `TextBlock({ block, isFirst }: { block: TextBlockType; isFirst: boolean })`, `CtaButton({ label, href, color, isFirst }: { label: string; href: string; color: string; isFirst: boolean })` — 모두 새 필수 prop `isFirst` 추가.
- Consumes: Task 2의 `DividerBlock({ style })`.

이 태스크는 배너/텍스트/CTA 블록의 **화면상 모습을 이번 변경 전후로 완전히 동일하게 유지**하면서, 구분선 블록만 공용 회색 선에서 분리하는 것이 목적이다. 지금은 `app/c/[slug]/page.tsx`의 블록 컨테이너가 `divide-y divide-gray-100`으로 모든 블록 사이(첫 블록 제외)에 자동으로 얇은 회색 선(`border-top: 1px solid`, Tailwind `gray-100`)을 긋는다. 이 태스크는 그 자동 선을 없애고, 배너/텍스트/CTA가 각자 조건부로 똑같은 선을 직접 그리게 바꾼다.

- [ ] **Step 1: `BannerBlock`에 `isFirst` prop 추가**

`components/public/BannerBlock.tsx` 전체를 다음으로 교체한다:

```tsx
import type { BannerBlock as BannerBlockType } from "@/lib/pages/types";

export default function BannerBlock({
  block,
  isFirst,
}: {
  block: BannerBlockType;
  isFirst: boolean;
}) {
  return (
    <figure className={`w-full ${isFirst ? "" : "border-t border-gray-100"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.imageUrl} alt={block.title ?? ""} className="w-full object-cover" />
      {(block.title || block.subtitle) && (
        <figcaption className="mx-auto max-w-xl px-6 py-6 text-center">
          {block.title && (
            <p className="font-serif text-xl font-bold text-gray-900">{block.title}</p>
          )}
          {block.subtitle && <p className="mt-1 text-sm text-gray-500">{block.subtitle}</p>}
        </figcaption>
      )}
    </figure>
  );
}
```

- [ ] **Step 2: `TextBlock`에 `isFirst` prop 추가**

`components/public/TextBlock.tsx` 전체를 다음으로 교체한다:

```tsx
import type { TextBlock as TextBlockType } from "@/lib/pages/types";

export default function TextBlock({
  block,
  isFirst,
}: {
  block: TextBlockType;
  isFirst: boolean;
}) {
  return (
    <div className={`mx-auto max-w-xl px-6 py-6 ${isFirst ? "" : "border-t border-gray-100"}`}>
      {block.heading && (
        <h2 className="mb-3 font-serif text-lg font-bold text-gray-900">{block.heading}</h2>
      )}
      <div
        className="rich-text text-[15px] leading-relaxed text-gray-700"
        dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
      />
    </div>
  );
}
```

- [ ] **Step 3: `CtaButton`에 `isFirst` prop 추가**

`components/public/CtaButton.tsx` 전체를 다음으로 교체한다:

```tsx
import { getReadableTextColor } from "@/lib/contrast";

type Props = { label: string; href: string; color: string; isFirst: boolean };

export default function CtaButton({ label, href, color, isFirst }: Props) {
  if (!label || !href) return null;

  return (
    <div className={`mx-auto max-w-xl px-6 py-10 text-center ${isFirst ? "" : "border-t border-gray-100"}`}>
      <a
        href={href}
        className="inline-block w-full rounded-full px-6 py-4 text-base font-bold"
        style={{ backgroundColor: color, color: getReadableTextColor(color) }}
      >
        {label}
      </a>
    </div>
  );
}
```

- [ ] **Step 4: `app/c/[slug]/page.tsx`에서 컨테이너 수정 + `isFirst`/`style` 전달**

`app/c/[slug]/page.tsx`에서 블록 컨테이너 `<div className="divide-y divide-gray-100 overflow-x-clip">`를 `<div className="overflow-x-clip">`로 바꾼다(`divide-y divide-gray-100` 제거, `overflow-x-clip`은 유지).

블록 렌더링 `.map()` 콜백 전체를 다음으로 교체한다:

```tsx
{page.blocks.map((block, index) => {
  const isFirst = index === 0;
  if (block.type === "banner")
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <BannerBlock block={block} isFirst={isFirst} />
      </ScrollReveal>
    );
  if (block.type === "text")
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <TextBlock block={block} isFirst={isFirst} />
      </ScrollReveal>
    );
  if (block.type === "divider")
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <DividerBlock style={block.style} />
      </ScrollReveal>
    );
  if (block.type === "cta") {
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <CtaButton
          label={block.label}
          href={block.href}
          color={block.color}
          isFirst={isFirst}
        />
      </ScrollReveal>
    );
  }
  // 알 수 없는 블록 타입(과거 숫자카드 데이터, 수동 편집/스키마 변경)은
  // 공개 페이지를 500으로 떨어뜨리지 않도록 조용히 건너뛴다.
  return null;
})}
```

- [ ] **Step 5: 타입 체크 / 린트**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 개발 서버로 시각적 회귀 확인**

`.env.local`은 이미 이 워크트리에 존재한다(Supabase 라이브 DB 연결).

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npm run dev`

1. 기존에 발행된, 구분선이 없는 페이지 하나를 `/c/[slug]`로 열어 배너/텍스트/CTA 블록 사이의 회색 선 위치와 두께가 이번 변경 전과 동일하게 보이는지 확인한다(브라우저 개발자 도구로 `border-top` 값이 `1px solid`인지, 각 블록의 실제 픽셀 위치가 이전과 같은지 확인).
2. 구분선이 포함된 페이지를 열어 구분선 위/아래에 중복된 선이 없는지(이번 태스크로 자동 선이 제거되었으므로) 확인한다.
3. 서버를 종료한다(다음 태스크로 넘어가기 전에 background 프로세스를 정리).

- [ ] **Step 7: 커밋**

```bash
git add components/public/BannerBlock.tsx components/public/TextBlock.tsx components/public/CtaButton.tsx "app/c/[slug]/page.tsx"
git commit -m "fix: replace shared divide-y border with per-block border so divider blocks can own their own line style"
```

---

## Task 5: Sanitizer 확장 — `hr` 태그 + 테두리/정렬 스타일 허용

**Files:**
- Modify: `lib/sanitize.ts`

**Interfaces:**
- 이 태스크는 순수하게 `sanitizeBodyHtml` 함수의 허용 목록만 넓힌다. 다른 파일에 영향 없음.

- [ ] **Step 1: `ALLOWED_TAGS`에 `"hr"` 추가**

`lib/sanitize.ts`의 `ALLOWED_TAGS` 배열을 수정한다:

```ts
const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "span", "mark", "hr"];
```

- [ ] **Step 2: `allowedStyles`에 테두리/정렬 속성 추가**

`sanitizeBodyHtml`의 `allowedStyles["*"]` 객체에 다음 네 항목을 추가한다(기존 `color`/`background-color`/`font-family`/`font-size`/`letter-spacing`/`line-height`는 그대로 유지):

```ts
"border-top-style": [/^(solid|dashed|dotted)$/],
"border-top-color": COLOR_PATTERNS,
"border-top-width": [/^[12]px$/],
"text-align": [/^(left|center|right)$/],
```

전체 `allowedStyles` 블록은 다음과 같아야 한다:

```ts
allowedStyles: {
  "*": {
    color: COLOR_PATTERNS,
    "background-color": COLOR_PATTERNS,
    "font-family": [/^var\(--font-[a-z0-9-]+\)$/],
    "font-size": [/^\d+(\.\d+)?px$/],
    "letter-spacing": [/^-?\d+(\.\d+)?em$/],
    "line-height": [/^\d+(\.\d+)?$/],
    "border-top-style": [/^(solid|dashed|dotted)$/],
    "border-top-color": COLOR_PATTERNS,
    "border-top-width": [/^[12]px$/],
    "text-align": [/^(left|center|right)$/],
  },
},
```

- [ ] **Step 3: 타입 체크 / 린트**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 수동 검증 — sanitize-html 동작 확인**

Run 아래 명령으로 `sanitizeBodyHtml`이 실제로 `hr`과 새 스타일 속성을 통과시키는지, 화이트리스트 밖 값은 걸러내는지 직접 확인한다:

```bash
cd "tax auto/.claude/worktrees/page-editor-enhancements" && node -e '
const sanitizeHtml = require("sanitize-html");
const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "span", "mark", "hr"];
const COLOR_PATTERNS = [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, /^rgba\([\d.,\s%]+\)$/];
const result = sanitizeHtml(
  "<p>text</p><hr style=\"border-top: 1px dashed #D1D5DB\"><p style=\"text-align:center\">dots</p><hr style=\"border-top: 999px double red\">",
  {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { "*": ["style"] },
    allowedStyles: {
      "*": {
        color: COLOR_PATTERNS,
        "background-color": COLOR_PATTERNS,
        "font-family": [/^var\(--font-[a-z0-9-]+\)$/],
        "font-size": [/^\d+(\.\d+)?px$/],
        "letter-spacing": [/^-?\d+(\.\d+)?em$/],
        "line-height": [/^\d+(\.\d+)?$/],
        "border-top-style": [/^(solid|dashed|dotted)$/],
        "border-top-color": COLOR_PATTERNS,
        "border-top-width": [/^[12]px$/],
        "text-align": [/^(left|center|right)$/],
      },
    },
  }
);
console.log(result);
'
```

Expected 출력: 첫 번째 `<hr>`은 `style="border-top:1px dashed #D1D5DB"`가 그대로 남아있고, `<p style="text-align:center">`도 유지되며, 두 번째 `<hr>`(`999px double red`)은 `border-top-width`가 `[12]px` 패턴에 안 맞고 `border-top-style`이 `double`이라 패턴에 안 맞으므로 style 속성이 비거나 해당 값들이 제거된 `<hr>`로 남아야 한다(태그 자체는 유지되지만 위험하거나 화이트리스트 밖인 값은 제거).

- [ ] **Step 5: 커밋**

```bash
git add lib/sanitize.ts
git commit -m "feat: allow hr tag and border/text-align styles in sanitized rich text"
```

---

## Task 6: Tiptap 커스텀 구분선 노드

**Files:**
- Create: `lib/tiptap/dividerNode.ts`

**Interfaces:**
- Consumes: `DIVIDER_STYLE_PRESETS`, `DEFAULT_DIVIDER_STYLE`(`@/lib/pages/dividerStyle`, Task 1), `DividerStyle`(`@/lib/pages/types`, Task 1).
- Produces: `DividerNode`(Tiptap `Node`, 이름 `"divider"`) — Task 7에서 `RichTextEditor.tsx`의 `extensions` 배열에 추가하고, `insertContent({ type: "divider", attrs: { variant } })`로 삽입.

이 노드는 `@tiptap/extension-horizontal-rule`을 import하지 않고 `@tiptap/core`의 `Node.create()`로 직접 작성한다(해당 패키지는 이 프로젝트의 `package.json` 의존성이 아니다). 저장된 HTML은 `<hr style="border-top: ...">` 형태이며, 에디터에 다시 불러올 때 그 `style` 값을 보고 어떤 프리셋이었는지 역추적한다(별도 데이터 속성 없이 스타일 값 자체가 유일한 소스).

- [ ] **Step 1: `lib/tiptap/dividerNode.ts` 작성**

```ts
import { Node } from "@tiptap/core";
import { DIVIDER_STYLE_PRESETS, DEFAULT_DIVIDER_STYLE } from "@/lib/pages/dividerStyle";
import type { DividerStyle } from "@/lib/pages/types";

function styleAttrFor(variant: DividerStyle): string {
  const preset = DIVIDER_STYLE_PRESETS[variant];
  return preset.kind === "line" ? `border-top: ${preset.borderTop}` : "";
}

function variantFromStyleAttr(styleAttr: string | null): DividerStyle {
  if (!styleAttr) return DEFAULT_DIVIDER_STYLE;
  const normalized = styleAttr.replace(/\s+/g, "");
  for (const [id, preset] of Object.entries(DIVIDER_STYLE_PRESETS)) {
    if (
      preset.kind === "line" &&
      normalized === `border-top:${preset.borderTop}`.replace(/\s+/g, "")
    ) {
      return id as DividerStyle;
    }
  }
  return DEFAULT_DIVIDER_STYLE;
}

export const DividerNode = Node.create({
  name: "divider",
  group: "block",

  addAttributes() {
    return {
      variant: { default: DEFAULT_DIVIDER_STYLE },
    };
  },

  parseHTML() {
    return [
      {
        tag: "hr",
        getAttrs: (element) => ({
          variant: variantFromStyleAttr((element as HTMLElement).getAttribute("style")),
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const variant = node.attrs.variant as DividerStyle;
    return ["hr", { style: styleAttrFor(variant) }];
  },
});
```

- [ ] **Step 2: 타입 체크 / 린트**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (아직 어디서도 이 노드를 import하지 않으므로 사용되지 않는 파일 경고만 없으면 됨.)

- [ ] **Step 3: 커밋**

```bash
git add lib/tiptap/dividerNode.ts
git commit -m "feat: add custom Tiptap divider node with style-based variant round-trip"
```

---

## Task 7: 리치텍스트 에디터 — 인라인 구분선 삽입 UI

**Files:**
- Modify: `components/editor/RichTextEditor.tsx`

**Interfaces:**
- Consumes: `DividerNode`(`@/lib/tiptap/dividerNode`, Task 6), `DIVIDER_STYLE_PRESETS`(`@/lib/pages/dividerStyle`, Task 1), `DividerStyle`(`@/lib/pages/types`, Task 1).

- [ ] **Step 1: import 추가**

`components/editor/RichTextEditor.tsx` 상단 import 목록에 추가:

```ts
import { DividerNode } from "@/lib/tiptap/dividerNode";
import { DIVIDER_STYLE_PRESETS } from "@/lib/pages/dividerStyle";
import type { DividerStyle } from "@/lib/pages/types";
```

- [ ] **Step 2: `extensions` 배열에 `DividerNode` 추가**

`useEditor`의 `extensions: [...]` 배열에서 기존 `Highlight,` 다음에 `DividerNode,`를 추가한다(`StarterKit.configure`의 `horizontalRule: false`는 그대로 둔다 — 기본 `horizontalRule` 노드는 계속 비활성 상태를 유지하고, 새로 추가하는 `DividerNode`는 이름이 `"divider"`라서 충돌하지 않는다):

```ts
extensions: [
  StarterKit.configure({
    bulletList: false,
    orderedList: false,
    listItem: false,
    heading: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: false,
  }),
  TextStyleKit.configure({
    backgroundColor: false,
  }),
  LetterSpacing,
  Highlight,
  DividerNode,
],
```

- [ ] **Step 3: 툴바에 "구분선 삽입" 드롭다운 추가**

기존 "강조" 버튼(`toggleHighlight` 버튼) 바로 다음, 툴바를 감싸는 `<div>`의 닫는 태그 앞에 추가:

```tsx
<select
  className="rounded border border-gray-200 px-1 text-sm"
  defaultValue="placeholder"
  onChange={(e) => {
    const variant = e.target.value as DividerStyle;
    const preset = DIVIDER_STYLE_PRESETS[variant];
    if (preset.kind === "dots") {
      editor.chain().focus().insertContent('<p style="text-align:center">• • •</p>').run();
    } else {
      editor.chain().focus().insertContent({ type: "divider", attrs: { variant } }).run();
    }
    e.target.value = "placeholder";
  }}
>
  <option value="placeholder">구분선 삽입</option>
  {Object.entries(DIVIDER_STYLE_PRESETS).map(([id, preset]) => (
    <option key={id} value={id}>
      {preset.label}
    </option>
  ))}
</select>
```

- [ ] **Step 4: 타입 체크 / 린트**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 개발 서버로 수동 검증**

`.env.local`은 이미 이 워크트리에 존재한다.

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npm run dev`

1. `/admin/new`(또는 기존 페이지 수정 화면)에서 텍스트 블록을 추가하고, 리치텍스트 본문에 "구분선 삽입" 드롭다운으로 5개 스타일을 각각 삽입해본다 — 에디터 안에서 각 스타일이 실제로 다르게 보이는지 확인한다.
2. "임시저장" 후 페이지를 새로고침해 다시 편집 화면을 열어, 삽입했던 구분선들이 원래 스타일 그대로 유지되는지 확인한다(Task 6의 `variantFromStyleAttr` 역추적이 정상 동작하는지 검증).
3. 발행해서 `/c/[slug]`에서도 본문 안 구분선들이 올바르게 보이는지 확인한다.
4. 서버를 종료한다.

- [ ] **Step 6: 커밋**

```bash
git add components/editor/RichTextEditor.tsx
git commit -m "feat: add inline divider insertion to rich text editor toolbar"
```

---

## Task 8: 전체 빌드 + 통합 수동 QA

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 빌드**

Run: `cd "tax auto/.claude/worktrees/page-editor-enhancements" && npm run build`
Expected: 빌드 성공, 타입/린트 에러 없음.

- [ ] **Step 2: 통합 수동 QA**

`npm run dev`로 로컬 서버를 띄우고(`.env.local` 이미 존재) 스펙 문서(`docs/superpowers/specs/2026-08-17-divider-style-variants-design.md`)의 테스트 계획을 순서대로 확인한다:

1. 기존 페이지(구분선 스타일 필드 없음)를 열어 "연한 실선"으로 정상 렌더링되는지, 배너/텍스트/CTA 블록의 화면상 모습이 이번 변경 전후로 동일한지
2. 구분선 블록에서 5개 스타일을 각각 선택 → 저장 → 공개 페이지에서 의도한 스타일로 보이는지
3. 리치텍스트 툴바에서 5개 스타일을 각각 본문에 삽입 → 저장 → 공개 페이지에서 그대로 나타나는지
4. 인라인 구분선이 포함된 본문을 다시 열어 편집해도 스타일이 유지되는지
5. 페이지 첫 블록이 구분선인 경우에도 정상적으로 보이는지

- [ ] **Step 3: 위 QA에서 발견된 문제가 있다면 해당 태스크로 돌아가 수정 후 재검증**

문제가 없으면 이 태스크는 커밋 없이 종료한다(검증 전용 태스크).
