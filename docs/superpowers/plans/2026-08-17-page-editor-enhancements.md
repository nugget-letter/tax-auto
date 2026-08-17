# 페이지 에디터 확장 (복제 / 구분선 블록 / 스크롤 인터랙션) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩페이지 생성기(`tax auto`)에 (1) 대시보드에서 페이지 복제, (2) 블록 사이 구분선, (3) 블록별 스크롤 등장 애니메이션 세 기능을 추가한다.

**Architecture:** Next.js 15 App Router + Supabase 기반 기존 블록 조립식 에디터를 그대로 확장한다. `blocks` jsonb 배열에 새 블록 타입(`divider`)과 공통 옵션 필드(`scrollEffect`)를 추가하고, 공개 페이지(`/c/[slug]`)에서는 순수 CSS transition + `IntersectionObserver`로 스크롤 등장 효과를 구현한다. 새 외부 라이브러리는 추가하지 않는다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Zod, Supabase(Postgres jsonb), 기존 `nanoid` 기반 슬러그 생성.

## Global Constraints

- 새 외부 의존성(애니메이션 라이브러리 등)을 추가하지 않는다 — CSS transition + `IntersectionObserver`만 사용한다.
- `blocks` 스키마 변경은 하위 호환을 유지한다 — 기존 데이터에 없는 필드(`scrollEffect`)는 항상 optional이며, 없으면 `"none"`(효과 없음)으로 취급한다.
- 구분선 블록은 색상/두께/여백 커스텀 옵션이 없다 — 고정 스타일만 지원한다.
- 스크롤 애니메이션은 블록이 뷰포트에 처음 들어올 때 **최초 1회만** 재생하고, `prefers-reduced-motion: reduce` 환경에서는 애니메이션 없이 바로 최종 상태로 표시한다.
- 이 프로젝트는 별도 유닛 테스트 프레임워크를 두지 않는다(`docs/superpowers/specs/2026-08-09-landing-page-generator-design.md`의 결정). 각 태스크의 검증은 `npx tsc --noEmit`(타입 체크) + `npm run lint`(ESLint) + 명시된 수동 QA 절차로 한다. 마지막 태스크에서 `npm run build`로 전체 빌드를 통과시킨다.
- 커밋 메시지는 한국어/영어 무관하지만 기존 커밋처럼 간결한 현재형 요약을 사용한다.

---

## Task 1: 데이터 모델 — `scrollEffect` 필드 + 구분선 블록 타입

**Files:**
- Modify: `lib/pages/types.ts`

**Interfaces:**
- Produces: `scrollEffectSchema` (zod), `ScrollEffect` 타입, `dividerBlockSchema` (zod), `DividerBlock` 타입. `BannerBlock`/`TextBlock`/`CtaBlock`에 `scrollEffect?: ScrollEffect` 필드 추가. `blockSchema` 유니온에 `dividerBlockSchema` 포함.

- [ ] **Step 1: `scrollEffectSchema`와 각 블록 스키마에 `scrollEffect` 필드 추가**

`lib/pages/types.ts`의 최상단(파일 첫 부분, `bannerBlockSchema` 선언 앞)에 추가:

```ts
export const scrollEffectSchema = z.enum([
  "none",
  "fade",
  "fade-up",
  "slide-left",
  "slide-right",
  "scale",
]);
export type ScrollEffect = z.infer<typeof scrollEffectSchema>;
```

기존 `bannerBlockSchema`, `textBlockSchema`, `ctaBlockSchema` 각각에 `scrollEffect: scrollEffectSchema.optional(),` 필드를 추가한다. 예를 들어 `bannerBlockSchema`는:

```ts
export const bannerBlockSchema = z.object({
  type: z.literal("banner"),
  imageUrl: z.string().min(1),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  scrollEffect: scrollEffectSchema.optional(),
});
```

같은 방식으로 `textBlockSchema`(`bodyHtml` 다음 줄), `ctaBlockSchema`(`color` 다음 줄)에도 `scrollEffect: scrollEffectSchema.optional(),`를 추가한다.

- [ ] **Step 2: `dividerBlockSchema` 추가 및 유니온에 포함**

`ctaBlockSchema` 선언과 `blockSchema` 선언 사이에 추가:

```ts
export const dividerBlockSchema = z.object({
  type: z.literal("divider"),
  scrollEffect: scrollEffectSchema.optional(),
});
export type DividerBlock = z.infer<typeof dividerBlockSchema>;
```

`blockSchema` 유니온을 다음과 같이 수정한다:

```ts
export const blockSchema = z.discriminatedUnion("type", [
  bannerBlockSchema,
  textBlockSchema,
  ctaBlockSchema,
  dividerBlockSchema,
]);
```

- [ ] **Step 3: 타입 체크로 검증**

Run: `cd "tax auto" && npx tsc --noEmit`

이 시점에는 다른 파일이 아직 `divider` 케이스를 처리하지 않으므로 새 에러가 생기지 않아야 한다(기존에 통과하던 타입 체크가 그대로 통과). 만약 다른 파일에서 `block.type`을 exhaustive하게 switch하는 곳이 있어 에러가 나면 해당 위치를 메모해두고, 이후 태스크에서 처리한다.

- [ ] **Step 4: 커밋**

```bash
git add lib/pages/types.ts
git commit -m "feat: add scrollEffect field and divider block schema"
```

---

## Task 2: 페이지 복제 API

**Files:**
- Create: `app/api/pages/[id]/duplicate/route.ts`

**Interfaces:**
- Consumes: `getPageById(id: string): Promise<PageRecord | null>`, `createPage(input: PageInput): Promise<PageRecord>`, `SlugConflictError` (모두 `@/lib/pages/repository`에 이미 존재), `generateSlug(): string` (`@/lib/pages/slug`에 이미 존재), `requireAdminSession(request: NextRequest): Promise<boolean>` (`@/lib/auth/session`에 이미 존재).
- Produces: `POST /api/pages/[id]/duplicate` — 성공 시 201 + 새 `PageRecord` JSON, 인증 실패 401, 원본 없음 404, 슬러그 충돌 409, 그 외 실패 500.

- [ ] **Step 1: 라우트 핸들러 작성**

`app/api/pages/[id]/duplicate/route.ts` 새로 작성:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPage, getPageById, SlugConflictError } from "@/lib/pages/repository";
import { generateSlug } from "@/lib/pages/slug";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const original = await getPageById(id);

  if (!original) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const duplicate = await createPage({
      title: `${original.title} (사본)`,
      slug: generateSlug(),
      status: "draft",
      blocks: original.blocks,
    });
    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    if (error instanceof SlugConflictError) {
      console.error("[pages] 복제 중 슬러그 중복", error);
      return NextResponse.json(
        { error: "slug_conflict", message: "슬러그 생성 중 충돌이 발생했어요. 다시 시도해주세요." },
        { status: 409 }
      );
    }
    console.error("[pages] 복제 실패", error);
    return NextResponse.json({ error: "duplicate_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 개발 서버로 수동 검증**

Run: `cd "tax auto" && npm run dev` (백그라운드로 띄운 뒤 아래 진행)

1. 브라우저에서 `/login`으로 로그인해 관리자 세션 쿠키를 발급받는다.
2. `/admin`에서 기존 페이지 하나의 id를 확인한다(URL 복사 버튼 또는 수정 링크의 `/admin/[id]/edit`에서 id 확인).
3. 로그인한 브라우저의 개발자 도구 콘솔에서 다음을 실행해 쿠키 포함 요청을 보낸다:
   ```js
   fetch("/api/pages/<원본id>/duplicate", { method: "POST" }).then((r) => r.json()).then(console.log)
   ```
4. 응답이 201과 함께 새 `id`, `title`이 `"{원본 제목} (사본)"`, `status: "draft"`, `blocks`가 원본과 동일한 JSON인지 확인한다.
5. 로그인하지 않은(쿠키 없는) 상태에서 같은 요청을 보내면 401이 오는지 확인한다(시크릿 창 등에서 재현).
6. 존재하지 않는 id로 요청하면 404가 오는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add app/api/pages/[id]/duplicate/route.ts
git commit -m "feat: add page duplication API route"
```

---

## Task 3: 대시보드 "복제" 버튼

**Files:**
- Create: `components/dashboard/DuplicateButton.tsx`
- Modify: `components/dashboard/PagesTable.tsx`

**Interfaces:**
- Consumes: Task 2의 `POST /api/pages/[id]/duplicate`, `PageRecord` 타입(`@/lib/pages/types`).
- Produces: `DuplicateButton({ id }: { id: string })` — 클릭 시 복제 API 호출 후 `/admin/[새id]/edit`로 이동하는 클라이언트 컴포넌트.

- [ ] **Step 1: `DuplicateButton` 컴포넌트 작성**

`components/dashboard/DuplicateButton.tsx` 새로 작성 (기존 `components/dashboard/StatusActionButton.tsx`와 동일한 loading/error 패턴):

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PageRecord } from "@/lib/pages/types";

export default function DuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${id}/duplicate`, { method: "POST" });

      if (!response.ok) {
        setError("복제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

      const record: PageRecord = await response.json();
      router.push(`/admin/${record.id}/edit`);
    } catch {
      setError("복제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-gray-600 hover:underline disabled:opacity-50"
      >
        {loading ? "복제 중..." : "복제"}
      </button>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: `PagesTable`에서 버튼 배치**

`components/dashboard/PagesTable.tsx` 상단 import에 추가:

```ts
import DuplicateButton from "./DuplicateButton";
```

`PageRow` 함수 안의 액션 영역(`<CopyLinkButton .../>` 다음, `<Link ...>수정</Link>` 다음, `<StatusActionButton .../>` 앞)을 다음과 같이 수정한다:

```tsx
<div className="flex shrink-0 items-center gap-3">
  <CopyLinkButton slug={page.slug} />
  <Link href={`/admin/${page.id}/edit`} className="text-xs text-gray-600 hover:underline">
    수정
  </Link>
  <DuplicateButton id={page.id} />
  <StatusActionButton id={page.id} status={page.status} />
</div>
```

- [ ] **Step 3: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 개발 서버에서 수동 검증**

`npm run dev` 상태에서:
1. `/admin`에 로그인해서 접속, 아무 행에서 "복제" 버튼을 클릭한다.
2. `/admin/[새id]/edit` 화면으로 자동 이동하는지 확인한다.
3. 제목 입력란에 `"{원본 제목} (사본)"`이 들어있는지, 블록 내용이 원본과 동일한지 확인한다.
4. `/admin`으로 돌아가 "임시저장" 그룹에 방금 만든 사본이 있는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add components/dashboard/DuplicateButton.tsx components/dashboard/PagesTable.tsx
git commit -m "feat: add duplicate button to dashboard"
```

---

## Task 4: 공통 `ScrollEffectSelect` 에디터 컴포넌트

**Files:**
- Create: `components/editor/ScrollEffectSelect.tsx`

**Interfaces:**
- Consumes: `ScrollEffect` 타입(`@/lib/pages/types`, Task 1에서 생성).
- Produces: `ScrollEffectSelect({ value, onChange }: { value: ScrollEffect | undefined; onChange: (value: ScrollEffect) => void })` — Task 5, 6에서 각 블록 에디터가 재사용.

- [ ] **Step 1: 컴포넌트 작성**

`components/editor/ScrollEffectSelect.tsx` 새로 작성:

```tsx
"use client";

import type { ScrollEffect } from "@/lib/pages/types";

const OPTIONS: { value: ScrollEffect; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "fade", label: "페이드인" },
  { value: "fade-up", label: "페이드인 + 상승" },
  { value: "slide-left", label: "슬라이드 (왼쪽에서)" },
  { value: "slide-right", label: "슬라이드 (오른쪽에서)" },
  { value: "scale", label: "확대" },
];

type Props = {
  value: ScrollEffect | undefined;
  onChange: (value: ScrollEffect) => void;
};

export default function ScrollEffectSelect({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500">스크롤 효과</label>
      <select
        value={value ?? "none"}
        onChange={(e) => onChange(e.target.value as ScrollEffect)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음. (아직 어디서도 이 컴포넌트를 import하지 않으므로 사용되지 않는 파일 경고만 없으면 됨 — ESLint가 미사용 파일 자체를 에러로 잡지는 않는다.)

- [ ] **Step 3: 커밋**

```bash
git add components/editor/ScrollEffectSelect.tsx
git commit -m "feat: add shared scroll effect select component"
```

---

## Task 5: 구분선 블록 — 에디터 통합

**Files:**
- Create: `components/editor/DividerBlockEditor.tsx`
- Modify: `components/editor/BlockList.tsx`

**Interfaces:**
- Consumes: `DividerBlock` 타입(Task 1), `ScrollEffectSelect`(Task 4).
- Produces: `+ 구분선` 버튼으로 블록 추가 가능, `DividerBlockEditor`가 `BlockList` 안에서 렌더링됨.

- [ ] **Step 1: `DividerBlockEditor` 작성**

`components/editor/DividerBlockEditor.tsx` 새로 작성:

```tsx
"use client";

import type { DividerBlock } from "@/lib/pages/types";
import ScrollEffectSelect from "./ScrollEffectSelect";

type Props = {
  block: DividerBlock;
  onChange: (block: DividerBlock) => void;
};

export default function DividerBlockEditor({ block, onChange }: Props) {
  return (
    <div className="space-y-2 rounded border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">구분선 — 편집할 내용 없음</p>
      <ScrollEffectSelect
        value={block.scrollEffect}
        onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
      />
    </div>
  );
}
```

- [ ] **Step 2: `BlockList`에 구분선 타입 연결**

`components/editor/BlockList.tsx` 상단 import에 추가:

```ts
import DividerBlockEditor from "./DividerBlockEditor";
```

`createDefaultBlock` 함수를 수정해 `divider` 케이스를 추가한다:

```ts
function createDefaultBlock(type: Block["type"]): Block {
  if (type === "banner") return { type: "banner", imageUrl: "", title: "", subtitle: "" };
  if (type === "text") return { type: "text", heading: "", bodyHtml: "<p></p>" };
  if (type === "cta") return { type: "cta", label: "상담 신청하기", href: "", color: "#FEE500" };
  return { type: "divider" };
}
```

블록 렌더링 부분(`{block.type === "cta" && (...)}` 다음)에 추가:

```tsx
{block.type === "divider" && (
  <DividerBlockEditor block={block} onChange={(b) => updateBlock(index, b)} />
)}
```

"+ 블록 추가" 버튼 목록(`+ CTA 버튼` 버튼 다음)에 추가:

```tsx
<button
  type="button"
  onClick={() => addBlock("divider")}
  className="rounded border border-gray-300 px-3 py-1 text-sm"
>
  + 구분선
</button>
```

- [ ] **Step 3: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 개발 서버에서 수동 검증**

`npm run dev` 상태에서 `/admin/new`(또는 기존 페이지 수정 화면)에 접속해:
1. "+ 구분선" 버튼을 클릭해 블록이 추가되는지 확인.
2. 추가된 구분선 블록에 "스크롤 효과" 드롭다운이 보이는지 확인.
3. 위/아래 이동, 삭제 버튼이 다른 블록과 동일하게 동작하는지 확인.
4. "임시저장" 후 페이지를 새로고침해도 구분선 블록이 유지되는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add components/editor/DividerBlockEditor.tsx components/editor/BlockList.tsx
git commit -m "feat: add divider block to page editor"
```

---

## Task 6: 배너/텍스트/CTA 에디터에 스크롤 효과 선택 추가

**Files:**
- Modify: `components/editor/BannerBlockEditor.tsx`
- Modify: `components/editor/TextBlockEditor.tsx`
- Modify: `components/editor/CtaBlockEditor.tsx`

**Interfaces:**
- Consumes: `ScrollEffectSelect`(Task 4).

- [ ] **Step 1: `BannerBlockEditor`에 추가**

`components/editor/BannerBlockEditor.tsx` 상단에 import 추가:

```ts
import ScrollEffectSelect from "./ScrollEffectSelect";
```

컴포넌트의 마지막 `<input placeholder="부제 (선택)" .../>` 바로 다음, 닫는 `</div>` 앞에 추가:

```tsx
<ScrollEffectSelect
  value={block.scrollEffect}
  onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
/>
```

- [ ] **Step 2: `TextBlockEditor`에 추가**

`components/editor/TextBlockEditor.tsx` 상단에 import 추가:

```ts
import ScrollEffectSelect from "./ScrollEffectSelect";
```

`<RichTextEditor .../>` 다음, 닫는 `</div>` 앞에 추가:

```tsx
<ScrollEffectSelect
  value={block.scrollEffect}
  onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
/>
```

- [ ] **Step 3: `CtaBlockEditor`에 추가**

`components/editor/CtaBlockEditor.tsx` 상단에 import 추가:

```ts
import ScrollEffectSelect from "./ScrollEffectSelect";
```

버튼 색상 `<div className="flex items-center gap-2">...</div>` 다음, 닫는 `</div>` 앞에 추가:

```tsx
<ScrollEffectSelect
  value={block.scrollEffect}
  onChange={(scrollEffect) => onChange({ ...block, scrollEffect })}
/>
```

- [ ] **Step 4: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 개발 서버에서 수동 검증**

`npm run dev` 상태에서 `/admin/new`에서 배너/텍스트/CTA 블록을 각각 추가해, 세 블록 모두 "스크롤 효과" 드롭다운이 보이고 값을 바꾼 뒤 "임시저장" → 새로고침해도 선택값이 유지되는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add components/editor/BannerBlockEditor.tsx components/editor/TextBlockEditor.tsx components/editor/CtaBlockEditor.tsx
git commit -m "feat: add scroll effect selector to banner, text, and cta block editors"
```

---

## Task 7: 공개 페이지 — 구분선 블록 렌더링 + 스크롤 리빌 CSS

**Files:**
- Create: `components/public/DividerBlock.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `DividerBlock()` 컴포넌트(props 없음), `.scroll-reveal` 관련 CSS 클래스(Task 8의 `ScrollReveal` 컴포넌트가 사용).

- [ ] **Step 1: `DividerBlock` 공개 렌더링 컴포넌트 작성**

`components/public/DividerBlock.tsx` 새로 작성:

```tsx
export default function DividerBlock() {
  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <hr className="border-t border-gray-200" />
    </div>
  );
}
```

- [ ] **Step 2: `globals.css`에 스크롤 리빌 스타일 추가**

`app/globals.css` 파일 끝(`.rich-text mark { ... }` 다음)에 추가:

```css
.scroll-reveal {
  transition:
    opacity 0.6s ease-out,
    transform 0.6s ease-out;
}
.scroll-reveal[data-state="hidden"] {
  opacity: 0;
}
.scroll-reveal[data-effect="fade-up"][data-state="hidden"] {
  transform: translateY(24px);
}
.scroll-reveal[data-effect="slide-left"][data-state="hidden"] {
  transform: translateX(-40px);
}
.scroll-reveal[data-effect="slide-right"][data-state="hidden"] {
  transform: translateX(40px);
}
.scroll-reveal[data-effect="scale"][data-state="hidden"] {
  transform: scale(0.92);
}
.scroll-reveal[data-state="revealed"] {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    transition: none;
  }
  .scroll-reveal[data-state="hidden"] {
    opacity: 1;
    transform: none;
  }
}
```

이 규칙들의 의도: `data-state`가 없는 기본 상태(JS 로드 전)는 항상 보임(opacity 지정 없음 = 1). `data-state="hidden"`일 때만 `data-effect`에 따라 숨김/이동 상태가 되고, `data-state="revealed"`가 되면 항상 원래 모습으로 돌아온다. reduced-motion 환경에서는 `hidden` 상태여도 강제로 보이게 해 애니메이션 자체를 건너뛴다.

- [ ] **Step 3: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add components/public/DividerBlock.tsx app/globals.css
git commit -m "feat: add public divider block and scroll-reveal CSS"
```

---

## Task 8: `ScrollReveal` 클라이언트 컴포넌트

**Files:**
- Create: `components/public/ScrollReveal.tsx`

**Interfaces:**
- Consumes: `ScrollEffect` 타입(`@/lib/pages/types`), Task 7의 `.scroll-reveal` CSS 클래스.
- Produces: `ScrollReveal({ effect, children }: { effect: ScrollEffect | undefined; children: React.ReactNode })` — Task 9에서 `app/c/[slug]/page.tsx`가 각 블록을 감싸는 데 사용.

- [ ] **Step 1: 컴포넌트 작성**

`components/public/ScrollReveal.tsx` 새로 작성:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { ScrollEffect } from "@/lib/pages/types";

type Props = {
  effect: ScrollEffect | undefined;
  children: React.ReactNode;
};

// "idle"은 JS가 아직 개입하지 않은 초기 상태 — 서버 렌더링 그대로 보이는 상태다.
// 마운트 후에만 "hidden"으로 전환해 애니메이션을 준비하므로, JS가 늦게 로드되거나
// 실행되지 않아도 콘텐츠가 안 보이는 사고가 나지 않는다(progressive enhancement).
type State = "idle" | "hidden" | "revealed";

export default function ScrollReveal({ effect, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (!effect || effect === "none") return;

    const node = ref.current;
    if (!node) return;

    setState("hidden");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("revealed");
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [effect]);

  if (!effect || effect === "none") return <>{children}</>;

  return (
    <div ref={ref} className="scroll-reveal" data-effect={effect} data-state={state}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add components/public/ScrollReveal.tsx
git commit -m "feat: add ScrollReveal intersection-observer component"
```

---

## Task 9: 공개 페이지에 구분선 렌더링 + 스크롤 리빌 연결

**Files:**
- Modify: `app/c/[slug]/page.tsx`

**Interfaces:**
- Consumes: `DividerBlock`(Task 7), `ScrollReveal`(Task 8).

- [ ] **Step 1: import 추가**

`app/c/[slug]/page.tsx` 상단 import 목록에 추가:

```ts
import DividerBlock from "@/components/public/DividerBlock";
import ScrollReveal from "@/components/public/ScrollReveal";
```

- [ ] **Step 2: 블록 렌더링 분기 수정**

기존:

```tsx
{page.blocks.map((block, index) => {
  if (block.type === "banner") return <BannerBlock key={index} block={block} />;
  if (block.type === "text") return <TextBlock key={index} block={block} />;
  if (block.type === "cta") {
    return (
      <CtaButton
        key={index}
        label={block.label}
        href={block.href}
        color={block.color}
      />
    );
  }
  // 알 수 없는 블록 타입(과거 숫자카드 데이터, 수동 편집/스키마 변경)은
  // 공개 페이지를 500으로 떨어뜨리지 않도록 조용히 건너뛴다.
  return null;
})}
```

다음으로 교체:

```tsx
{page.blocks.map((block, index) => {
  if (block.type === "banner")
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <BannerBlock block={block} />
      </ScrollReveal>
    );
  if (block.type === "text")
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <TextBlock block={block} />
      </ScrollReveal>
    );
  if (block.type === "divider")
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <DividerBlock />
      </ScrollReveal>
    );
  if (block.type === "cta") {
    return (
      <ScrollReveal key={index} effect={block.scrollEffect}>
        <CtaButton label={block.label} href={block.href} color={block.color} />
      </ScrollReveal>
    );
  }
  // 알 수 없는 블록 타입(과거 숫자카드 데이터, 수동 편집/스키마 변경)은
  // 공개 페이지를 500으로 떨어뜨리지 않도록 조용히 건너뛴다.
  return null;
})}
```

- [ ] **Step 3: 타입 체크 / 린트**

Run: `cd "tax auto" && npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add "app/c/[slug]/page.tsx"
git commit -m "feat: render divider blocks and wire scroll reveal into public page"
```

---

## Task 10: 전체 빌드 + 통합 수동 QA

**Files:** 없음 (검증 전용 태스크)

**Interfaces:** 없음.

- [ ] **Step 1: 전체 빌드**

Run: `cd "tax auto" && npm run build`
Expected: 빌드 성공, 타입/린트 에러 없음.

- [ ] **Step 2: 개발 서버로 통합 수동 QA**

`npm run dev`로 로컬 서버를 띄우고 `/admin`에 로그인한 뒤, 스펙 문서(`docs/superpowers/specs/2026-08-17-page-editor-enhancements-design.md`)의 테스트 계획을 순서대로 확인한다:

1. **복제**: 대시보드에서 페이지 복제 → 제목에 "(사본)" 접미사, 임시저장 상태, 새 슬러그로 생성되는지, 수정화면으로 자동 이동하는지 확인.
2. **구분선 블록**: 추가/삭제/위아래 순서변경이 다른 블록과 동일하게 동작하는지 확인.
3. **스크롤 효과 저장**: 배너/텍스트/CTA/구분선 블록 각각 다른 스크롤 효과를 선택해 저장 → 편집 화면을 새로고침해도 선택값이 유지되는지 확인.
4. **효과 재생 확인**: 발행 후 `/c/[slug]`를 열어 스크롤하면서 각 효과(페이드인 / 페이드인+상승 / 슬라이드-왼쪽 / 슬라이드-오른쪽 / 확대)가 의도대로 재생되는지 눈으로 확인.
5. **1회만 재생**: 효과가 재생된 블록을 다시 위로 스크롤했다가 아래로 내려도 애니메이션이 재생되지 않는지 확인.
6. **reduced motion**: 브라우저/OS의 "동작 줄이기" 설정을 켠 상태에서 같은 페이지를 열어, 애니메이션 없이 바로 최종 상태로 보이는지 확인. (Chrome DevTools → Rendering 탭 → "Emulate CSS media feature prefers-reduced-motion: reduce"로 재현 가능)
7. **레거시 데이터 호환**: `scrollEffect` 필드가 없는 기존 페이지(이번 작업 이전에 만들어진 페이지)를 열어 에러 없이 "효과 없음"으로 정상 렌더링되는지 확인.

- [ ] **Step 3: 위 QA에서 발견된 문제가 있다면 해당 태스크로 돌아가 수정 후 재검증**

문제가 없으면 이 태스크는 커밋 없이 종료한다(검증 전용 태스크).
