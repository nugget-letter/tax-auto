# 읽기 진행률 표시줄 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 발행된 페이지(`app/c/[slug]/page.tsx`)에 스크롤 위치에 따라 채워지는 읽기 진행률 표시줄을 화면 맨 위에 추가한다.

**Architecture:** `components/public/ReadingProgressBar.tsx`라는 신규 클라이언트 컴포넌트를 만들어 `scroll`/`resize` 이벤트를 `requestAnimationFrame`으로 스로틀링하고, 진행률을 React state가 아닌 DOM 엘리먼트의 `style.transform`에 직접 써서 리렌더 없이 갱신한다. `app/c/[slug]/page.tsx`에서 `page.status === "published"`일 때만 렌더링한다.

**Tech Stack:** Next.js App Router, React 19, 순수 브라우저 API(`window.scrollY`, `document.documentElement.scrollHeight`, `requestAnimationFrame`) — 새 npm 패키지 설치 없음. 이 프로젝트에는 자동화 테스트가 없으므로(다른 파일들도 단위 테스트 없음), 검증은 `npm run lint` + `npx tsc --noEmit` + 브라우저 수동 확인으로 진행한다.

## Global Constraints

- 발행된 페이지(`page.status === "published"`)에서만 렌더링한다 — 미리보기 모드(`PreviewBanner`가 뜨는 상태)에서는 렌더링하지 않는다.
- 진행률 계산 결과는 React state(`useState`)가 아니라 `ref.current.style.transform`에 직접 써서, 스크롤할 때마다 리렌더가 발생하지 않게 한다.
- `width` 대신 `transform: scaleX()`를 사용한다 — 레이아웃 재계산 없이 GPU 합성만으로 처리하기 위함.
- 배경색은 새 hex 값을 하드코딩하지 않고, 기존 Tailwind 토큰 `bg-navy-950`(`app/globals.css`의 `--color-navy-950: #0b0b10`)를 그대로 사용한다.
- 문서 전체 높이가 화면 높이보다 작아 스크롤할 내용이 없으면 표시줄 자체를 렌더링하지 않는다(표시 여부는 `useState`로 관리 — 자주 안 바뀌는 값이라 리렌더 비용 문제 없음).
- 별도의 옅은 배경 트랙은 두지 않는다 — 진행률만큼 채워지는 바 하나만 존재한다.

---

### Task 1: `ReadingProgressBar` 컴포넌트 신설 및 페이지 연결

**Files:**
- Create: `components/public/ReadingProgressBar.tsx`
- Modify: `app/c/[slug]/page.tsx`

**Interfaces:**
- Produces: `ReadingProgressBar` 컴포넌트, props 없음(`export default function ReadingProgressBar()`). `app/c/[slug]/page.tsx`가 이 컴포넌트를 `<main>` 안, `PreviewBanner` 분기 바로 다음에 조건부로 렌더링한다.

- [ ] **Step 1: `ReadingProgressBar.tsx` 생성**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function ReadingProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollable <= 0) {
        setVisible(false);
        return;
      }

      setVisible(true);

      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    }

    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 z-50 h-[3px] w-full origin-left bg-navy-950"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
```

(초기 `style={{ transform: "scaleX(0)" }}`은 `useEffect`의 첫 `update()` 호출 전에 렌더링될 때(즉 `visible`이 `true`가 된 첫 프레임)에도 바가 풀 너비로 번쩍이지 않게 하는 안전값이다. `visible`이 `true`가 되는 시점과 `update()`가 실제 `transform`을 계산해 쓰는 시점은 같은 `useEffect` 실행 안에서 벌어지므로, 실제로는 항상 올바른 값이 먼저 그려진다.)

- [ ] **Step 2: `app/c/[slug]/page.tsx`에 import 추가**

`import PreviewBanner from "@/components/public/PreviewBanner";` 다음 줄에 추가:

```typescript
import ReadingProgressBar from "@/components/public/ReadingProgressBar";
```

- [ ] **Step 3: `app/c/[slug]/page.tsx`에 조건부 렌더링 추가**

`{page.status !== "published" && <PreviewBanner />}` 다음 줄에 추가:

```tsx
      {page.status === "published" && <ReadingProgressBar />}
```

- [ ] **Step 4: 검증**

Run: `npm run lint`
Expected: 에러 없음

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `grep -n "ReadingProgressBar" app/c/\[slug\]/page.tsx`
Expected: import 줄과 조건부 렌더링 줄 2곳 출력

Run: `grep -n "useState\|transform" components/public/ReadingProgressBar.tsx`
Expected: `useState` 사용과 `style.transform`/`scaleX` 관련 줄들이 출력됨

- [ ] **Step 5: Commit**

```bash
git add components/public/ReadingProgressBar.tsx "app/c/[slug]/page.tsx"
git commit -m "feat: add reading progress bar to published pages"
```

---

### Task 2: 브라우저 수동 검증

**Files:** 없음 (코드 변경 없음, 검증 전용 태스크)

**Interfaces:** 없음

- [ ] **Step 1: 사용자 로컬 환경에서 동작 확인 요청**

이 계획을 실행하는 에이전트 세션의 샌드박스는 `.env.local`이 없어 `/admin` 로그인이 안 되므로, 다음 항목은 사용자에게 로컬 브라우저(`npm run dev`)에서 직접 확인해달라고 안내한다:

1. 내용이 충분히 긴 발행된 페이지(`/c/<slug>`)를 열어, 화면 맨 위에 짙은 네이비색 얇은 바가 있는지 확인.
2. 아래로 스크롤하면서 바가 왼쪽에서 오른쪽으로 부드럽게 채워지는지 확인.
3. 페이지 맨 아래까지 스크롤했을 때 바가 화면 전체 너비를 채우는지(100%) 확인.
4. 화면에 다 들어갈 만큼 짧은 페이지(또는 블록이 1~2개뿐인 페이지)에서는 바가 아예 보이지 않는지 확인.
5. 관리자로 로그인한 상태에서 임시저장 페이지를 미리보기했을 때(노란색 "미리보기 모드" 배너가 뜨는 상태) 진행률 표시줄이 보이지 않는지 확인.

- [ ] **Step 2: 문제 발견 시**

위 확인 중 문제가 발견되면 Task 1로 돌아가 수정한다. 모두 통과하면 이 태스크를 완료로 표시한다 (별도 커밋 없음).
