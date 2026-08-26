# 관리자 대시보드 seed-design 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` 대시보드 셸(로그인, 사이드바, 페이지 목록, 각종 버튼)을 당근(Daangn)의 오픈소스 디자인 시스템 [seed-design](https://github.com/daangn/seed-design)의 실제 컴포넌트로 교체한다.

**Architecture:** `@seed-design/react`(레이아웃 프리미티브)와 `@seed-design/css`(토큰/스타일)를 설치하고, `@seed-design/cli`로 `ActionButton`/`TextField` 같은 인터랙티브 컴포넌트를 `./seed-design/ui/*`에 복사해온다(shadcn/ui 방식). 기존 Tailwind 마크업을 파일별로 하나씩 seed 컴포넌트로 교체하되, 각 컴포넌트의 로직(상태 관리, API 호출)은 전혀 건드리지 않는다.

**Tech Stack:** Next.js App Router, React 19, `@seed-design/react@2.3.0`, `@seed-design/css@2.5.0`, `@seed-design/cli@1.6.1`. 이 프로젝트에는 자동화 테스트가 없으므로(다른 파일들도 단위 테스트 없음), 검증은 `npm run lint` + `npx tsc --noEmit` + 브라우저 수동 확인으로 진행한다.

## 사전 조사로 확정한 사실 (구현 중 다시 검증할 필요 없음)

아래는 실제로 `@seed-design/react@2.3.0`, `@seed-design/css@2.5.0` npm 패키지를 다운로드해서 소스코드(TypeScript 타입 정의 포함)를 직접 열어 확인한 내용이다. 문서 사이트의 설명이 아니라 실제 배포된 패키지 코드 기준이다.

- **테마 스코핑:** `@seed-design/css`의 색상 토큰(`--seed-color-fg-*` 등)은 `:root`에 고정되지 않고 `[data-seed-color-mode="light-only"]` 같은 일반 속성 선택자로 정의된다 — 하위 `<div>`에 붙여도 정상 작동한다. `html`/`body`/`button`/`input`/`*` 같은 전역 요소 리셋은 존재하지 않는다 — 스타일시트를 어디서 import하든 참조하지 않는 기존 마크업에는 영향이 없다.
- **CLI `add` 결과물:** `npx @seed-design/cli@latest add ui:action-button`은 `seed-design/ui/action-button.tsx`, `seed-design/ui/loading-indicator.tsx`, `seed-design/ui/progress-circle.tsx` 3개 파일을 생성한다. `add ui:text-field`는 `seed-design/ui/text-field.tsx` 하나를 생성한다 (내부에서 `@karrotmarket/react-monochrome-icon`을 의존성으로 추가 설치함).
- **`ActionButton`** (`seed-design/ui/action-button.tsx`에서 export, 내부적으로 `@seed-design/react`의 `ActionButton`을 감싼 얇은 래퍼):
  - `variant`: `"brandSolid" | "neutralSolid" | "neutralWeak" | "criticalSolid" | "brandOutline" | "neutralOutline" | "ghost"` (기본값 `"brandSolid"`). 공식 타입 주석: `criticalSolid`는 "삭제나 초기화처럼 되돌릴 수 없는 중요한 작업"용, `ghost`는 "배경 없이 텍스트와 아이콘만 표시"용.
  - `size`: `"xsmall" | "small" | "medium" | "large"` (기본값 `"medium"`)
  - `color`: `variant="ghost"`일 때만 적용되는 라벨/아이콘 색상 (기본값 `"fg.neutral"`), `ScopedColorFg` 토큰 문자열(예: `"fg.critical"`, `"fg.informative"`)
  - `loading`: boolean. **`disabled`를 자동으로 포함하지 않으므로, 클릭 중복 방지가 필요하면 `disabled`도 별도로 전달해야 한다** (공식 문서 명시 사항).
  - 표준 `<button>` 속성(`type`, `onClick`, `disabled` 등)이 그대로 전달된다.
- **`Badge`** (`@seed-design/react`에서 직접 export, CLI 불필요):
  - `tone`: `"neutral" | "brand" | "informative" | "positive" | "warning" | "critical"` (기본값 `"neutral"`). 공식 타입 주석: `positive`는 "완료, 적용됨, 승인됨, **발행됨**, 저장 성공"용, `warning`은 "만료 임박, 제출 누락, 필수 정보 부족"용.
  - `variant`: `"weak" | "solid" | "outline"` (**기본값은 `"solid"`** — 옅은 배경을 원하면 반드시 `variant="weak"`를 명시해야 한다)
  - `size`: `"medium" | "large"` (기본값 `"medium"`)
- **`TextField`/`TextFieldInput`** (`seed-design/ui/text-field.tsx`에서 export): `TextField`는 `label`, `description`, `invalid`(boolean), `errorMessage`(ReactNode) props를 받는 wrapper. `TextFieldInput`은 네이티브 `<input>` 속성(`type`, `name`, `placeholder`, `autoFocus` 등)을 그대로 전달받는다.
- **`Box`/`VStack`/`HStack`/`Text`** (`@seed-design/react`에서 직접 export):
  - `Box`는 `React.HTMLAttributes<HTMLDivElement>`(즉 `className` 포함)와 스타일 prop을 함께 받는다: `bg`/`background`, `color`, `borderColor`, `borderWidth`/`borderTopWidth`/`borderRightWidth`/`borderBottomWidth`/`borderLeftWidth`, `borderRadius`, `width`/`minWidth`/`maxWidth`, `padding`/`p`, `paddingX`/`px`, `paddingY`/`py`, `margin`/`m`, `marginTop`/`mt` 등, `display`, `flexGrow`, `flexShrink`, `gap` 등.
  - `VStack`/`HStack`은 `Flex`(= `Box` + `display:flex`)를 감싼 것으로, `Box`의 모든 스타일 prop에 더해 `direction`(=`flexDirection` 별칭), `align`(=`alignItems` 별칭), `justify`(=`justifyContent` 별칭), `wrap`, `grow`, `shrink`를 추가로 받는다. `VStack`은 `flexDirection: "column"`, `HStack`은 `"row"`가 기본.
  - `Text`는 `color`(`ScopedColorFg` 토큰), `textStyle`(예: `"t7Bold"`, `"t10Regular"`), `maxLines`(숫자, 넘으면 말줄임 처리), `as`(`"span"`(기본)/`"p"`/`"h1"` 등), `className`을 받는다.
  - 색상 토큰 문자열 형식은 `"<카테고리>.<이름>"` (예: `"fg.neutral"`, `"fg.neutralSubtle"`, `"fg.critical"`, `"fg.informative"`, `"stroke.neutralWeak"`). 실제 CSS에서 확인된 카테고리: `fg`(전경색), `bg`(배경색), `stroke`(테두리/선), `palette`(원색).

## Global Constraints

- 1단계 범위는 대시보드 셸만: `app/login/page.tsx`, `app/admin/layout.tsx`, `components/admin/Sidebar.tsx`, `app/admin/page.tsx`, `app/admin/published/page.tsx`, `components/dashboard/*` — 페이지 에디터(`/admin/new`, `/admin/[id]/edit`)는 범위 밖
- 다크모드 지원 안 함 — `data-seed-color-mode="light-only"`로 고정
- 사이드바의 "nugget." 그라데이션 로고와 `navy-950` 배경은 변경하지 않음
- `DeleteButton`의 `window.confirm()` 로직과 문구는 변경하지 않음 — 버튼 자체의 시각적 요소만 교체
- 각 버튼 컴포넌트의 기존 로직(`useState`, `fetch` 호출, `router.refresh()`, 에러 처리)은 그대로 유지 — JSX 렌더링 부분만 교체

---

### Task 1: seed-design 설치 및 테마 스코핑

**Files:**
- Modify: `package.json`, `package-lock.json` (npm install 결과)
- Create: `seed-design.json`
- Modify: `tsconfig.json`
- Modify: `app/layout.tsx`
- Modify: `app/admin/layout.tsx`

**Interfaces:**
- Produces: `@seed-design/react`, `@seed-design/css`가 설치되고, `seed-design/*` import 경로 별칭이 동작함. `/admin` 하위 페이지들이 `data-seed`, `data-seed-color-mode="light-only"` 속성을 가진 wrapper 안에서 렌더링됨.

- [ ] **Step 1: 패키지 설치**

Run: `npm install @seed-design/react @seed-design/css`

- [ ] **Step 2: `seed-design.json` 생성**

```json
{
  "rsc": false,
  "tsx": true,
  "framework": "react",
  "path": "./seed-design",
  "telemetry": false
}
```

- [ ] **Step 3: `tsconfig.json`에 경로 별칭 추가**

`compilerOptions.paths`를 다음과 같이 수정 (기존 `@/*` 유지, `seed-design/*` 추가):

```json
    "paths": {
      "@/*": [
        "./*"
      ],
      "seed-design/*": [
        "./seed-design/*"
      ]
    }
```

- [ ] **Step 4: `app/layout.tsx`에 seed-design 전역 스타일시트 import 추가**

`import "./globals.css";` 바로 아래에 추가:

```typescript
import "@seed-design/css/all.css";
```

(전역 리셋이 없는 스타일시트임을 사전 조사로 확인했으므로, 공개 페이지에 영향 없이 루트에서 import해도 안전하다. `/login`이 `/admin` 레이아웃 밖에 있는 별도 라우트라 이렇게 루트에서 한 번만 import해야 두 곳 모두에서 seed 컴포넌트가 정상적으로 스타일을 받는다.)

- [ ] **Step 5: `app/admin/layout.tsx`에 테마 스코핑 속성 추가**

전체 파일을 다음으로 교체:

```tsx
import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-seed="" data-seed-color-mode="light-only" className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: 검증**

Run: `npm run lint`
Expected: 에러 없음

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `ls node_modules/@seed-design/react/package.json node_modules/@seed-design/css/package.json`
Expected: 두 파일 모두 존재

Run: `grep -n "data-seed" app/admin/layout.tsx`
Expected: `data-seed=""`, `data-seed-color-mode="light-only"` 두 속성이 출력됨

Run: `grep -n "@seed-design/css" app/layout.tsx app/admin/layout.tsx`
Expected: `app/layout.tsx`에서만 매치, `app/admin/layout.tsx`에서는 매치 없음 (CSS import는 루트에만 있어야 함)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json seed-design.json tsconfig.json app/layout.tsx app/admin/layout.tsx
git commit -m "chore: install seed-design and scope its theme to admin layout"
```

---

### Task 2: CLI 컴포넌트 추가 및 로그인 페이지 마이그레이션

**Files:**
- Create (CLI 자동 생성): `seed-design/ui/action-button.tsx`, `seed-design/ui/loading-indicator.tsx`, `seed-design/ui/progress-circle.tsx`, `seed-design/ui/text-field.tsx`
- Modify: `package.json`, `package-lock.json` (CLI가 추가하는 의존성: `@karrotmarket/react-monochrome-icon`)
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: Task 1에서 설치된 `@seed-design/react`, 테마 스코핑 패턴
- Produces: `import { ActionButton } from "seed-design/ui/action-button";`, `import { TextField, TextFieldInput } from "seed-design/ui/text-field";` — 이후 모든 태스크에서 이 두 import 경로를 그대로 사용한다.

- [ ] **Step 1: CLI로 컴포넌트 추가**

Run: `npx @seed-design/cli@latest add ui:action-button ui:text-field`

이 명령은 대화형 프롬프트 없이 바로 진행된다 (두 id 모두 모호하지 않은 정확한 id). 완료되면 `seed-design/ui/` 아래에 4개 파일이 생성되고 `package.json`에 `@karrotmarket/react-monochrome-icon`이 추가된다.

- [ ] **Step 2: 생성된 `TextFieldInput`이 `type="password"`를 받는지 확인**

Run: `grep -n "type" seed-design/ui/text-field.tsx | head -20`

`TextFieldInput`이 네이티브 input 속성을 그대로 펼치는 구조인지(예: `...props`를 `<input>`에 스프레드하는 부분) 확인한다.
- **네이티브 속성을 그대로 전달하면:** Step 3으로 진행.
- **`type`을 명시적으로 제외/고정하는 코드가 있다면:** Step 3에서 `TextFieldInput` 대신 플레인 `<input type="password" ...>`을 seed의 `TextField` wrapper 안에 그대로 사용한다 (TextField는 `children`으로 임의의 입력 요소를 받으므로 이 조합도 유효하다).

- [ ] **Step 3: `app/login/page.tsx` 마이그레이션**

전체 파일을 다음으로 교체:

```tsx
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main
      data-seed=""
      data-seed-color-mode="light-only"
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4"
    >
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-gray-900">관리자 로그인</h1>
        <input type="hidden" name="next" value={params.next ?? "/admin"} />
        <TextField
          label="비밀번호"
          invalid={Boolean(params.error)}
          errorMessage={params.error ? "비밀번호가 올바르지 않아요." : undefined}
        >
          <TextFieldInput type="password" name="password" placeholder="비밀번호" autoFocus />
        </TextField>
        <ActionButton type="submit" variant="neutralSolid">
          로그인
        </ActionButton>
      </form>
    </main>
  );
}
```

(제출 버튼의 폭을 폼 전체 너비로 강제하는 옵션은 확인되지 않은 prop이라 사용하지 않는다 — `max-w-sm` 폼 안에서 버튼은 자연스러운 크기로 렌더링된다. 필요하면 나중에 브라우저 확인 후 조정한다.)

- [ ] **Step 4: 검증**

Run: `npm run lint`
Expected: 에러 없음

Run: `npx tsc --noEmit`
Expected: 에러 없음. `TextFieldInput`에 `type="password"`를 전달하는 부분에서 타입 에러가 나면 Step 2의 폴백(플레인 `<input>`)으로 교체하고 다시 확인한다.

- [ ] **Step 5: Commit**

```bash
git add seed-design/ package.json package-lock.json app/login/page.tsx
git commit -m "feat: add seed-design action-button and text-field, migrate login page"
```

---

### Task 3: `StatusBadge` → seed `Badge`

**Files:**
- Modify: `components/dashboard/StatusBadge.tsx`

**Interfaces:**
- Consumes: `@seed-design/react`의 `Badge` (Task 1에서 설치됨)
- Produces: `StatusBadge`의 외부 인터페이스(`{ status: PageStatus }`)는 변경 없음 — 호출부(`PagesTable.tsx`, `app/admin/published/page.tsx`) 수정 불필요

- [ ] **Step 1: `StatusBadge.tsx` 전체 교체**

```tsx
import { Badge } from "@seed-design/react";
import type { PageStatus } from "@/lib/pages/types";

const LABELS: Record<PageStatus, string> = {
  draft: "임시저장",
  published: "발행",
  archived: "보관",
};

const TONES: Record<PageStatus, "warning" | "positive" | "neutral"> = {
  draft: "warning",
  published: "positive",
  archived: "neutral",
};

export default function StatusBadge({ status }: { status: PageStatus }) {
  return (
    <Badge tone={TONES[status]} variant="weak">
      {LABELS[status]}
    </Badge>
  );
}
```

(기존의 작은 점 표시(`DOT_STYLES`)는 seed `Badge`에 대응 기능이 없어 제거한다 — `tone` 색상만으로 상태를 구분한다.)

- [ ] **Step 2: 검증**

Run: `npm run lint && npx tsc --noEmit`
Expected: 둘 다 에러 없음

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/StatusBadge.tsx
git commit -m "feat: migrate StatusBadge to seed-design Badge"
```

---

### Task 4: 대시보드 액션 버튼들 → seed `ActionButton`

**Files:**
- Modify: `components/dashboard/CopyLinkButton.tsx`
- Modify: `components/dashboard/StatusActionButton.tsx`
- Modify: `components/dashboard/DuplicateButton.tsx`
- Modify: `components/dashboard/DeleteButton.tsx`

**Interfaces:**
- Consumes: `seed-design/ui/action-button`의 `ActionButton` (Task 2에서 추가됨)
- Produces: 4개 컴포넌트의 외부 인터페이스(props)는 전혀 변경 없음 — `PagesTable.tsx`의 호출부 수정 불필요

각 버튼은 `variant="ghost"`(배경 없이 텍스트만, 기존의 텍스트 링크 느낌과 가장 가까움) + `size="small"`을 공통으로 쓰고, `color`로 성격을 구분한다: 일반 액션은 기본색, 상태 변경은 `fg.informative`, 삭제는 `fg.critical`. (seed-design 공식 문서는 삭제처럼 되돌릴 수 없는 동작에 `criticalSolid`를 권장하지만, 이 버튼은 한 행 안에 다른 텍스트 버튼들과 나란히 놓이는 인라인 액션이라 시각적 밀도를 맞추기 위해 `ghost` + `critical` 색상을 선택한다.)

- [ ] **Step 1: `CopyLinkButton.tsx` 전체 교체**

```tsx
"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";

export default function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/c/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ActionButton type="button" variant="ghost" size="small" onClick={handleCopy}>
      {copied ? "복사됨!" : "URL 복사"}
    </ActionButton>
  );
}
```

- [ ] **Step 2: `StatusActionButton.tsx` 전체 교체**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";
import type { PageStatus } from "@/lib/pages/types";

type Props = { id: string; status: PageStatus };

const NEXT_ACTION: Record<PageStatus, { label: string; status: PageStatus }> = {
  draft: { label: "발행하기", status: "published" },
  published: { label: "보관하기", status: "archived" },
  archived: { label: "임시저장으로 복원", status: "draft" },
};

export default function StatusActionButton({ id, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_ACTION[status];

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.status }),
      });

      if (!response.ok) {
        setError("상태 변경에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

      router.refresh();
    } catch {
      setError("상태 변경에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <ActionButton
        type="button"
        variant="ghost"
        size="small"
        color="fg.informative"
        onClick={handleClick}
        loading={loading}
        disabled={loading}
      >
        {next.label}
      </ActionButton>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: `DuplicateButton.tsx` 전체 교체**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";
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
      router.refresh();
      router.push(`/admin/${record.id}/edit`);
    } catch {
      setError("복제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <ActionButton
        type="button"
        variant="ghost"
        size="small"
        onClick={handleClick}
        loading={loading}
        disabled={loading}
      >
        복제
      </ActionButton>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: `DeleteButton.tsx` 전체 교체**

`window.confirm()` 로직과 문구는 그대로 유지하고, 버튼 요소만 `ActionButton`으로 교체한다:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";

type Props = { id: string; title: string; slug: string; publishedAt: string | null };

export default function DeleteButton({ id, title, slug, publishedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmMessage =
      publishedAt !== null
        ? `"${title}" 페이지를 삭제할까요? 이미 배포한 /c/${slug} 링크가 동작하지 않게 되고 발행 기록도 사라져요. 되돌릴 수 없어요.`
        : `"${title}" 페이지를 삭제할까요? 되돌릴 수 없어요.`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${id}`, { method: "DELETE" });

      if (!response.ok) {
        setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
        return;
      }

      router.refresh();
    } catch {
      setError("삭제에 실패했어요. 다시 로그인해야 할 수 있어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <ActionButton
        type="button"
        variant="ghost"
        size="small"
        color="fg.critical"
        onClick={handleClick}
        loading={loading}
        disabled={loading}
      >
        삭제
      </ActionButton>
      {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: 검증**

Run: `npm run lint && npx tsc --noEmit`
Expected: 둘 다 에러 없음

Run: `grep -rn "window.confirm" components/dashboard/DeleteButton.tsx`
Expected: `window.confirm(confirmMessage)` 줄이 그대로 존재 (로직 미변경 확인)

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/CopyLinkButton.tsx components/dashboard/StatusActionButton.tsx components/dashboard/DuplicateButton.tsx components/dashboard/DeleteButton.tsx
git commit -m "feat: migrate dashboard action buttons to seed-design ActionButton"
```

---

### Task 5: `PagesTable`과 발행된 URL 목록 레이아웃 → seed 프리미티브

**Files:**
- Modify: `components/dashboard/PagesTable.tsx`
- Modify: `app/admin/published/page.tsx`

**Interfaces:**
- Consumes: `@seed-design/react`의 `Box`/`HStack`/`VStack`/`Text` (Task 1), `StatusBadge`(Task 3, 인터페이스 불변), 4개 버튼 컴포넌트(Task 4, 인터페이스 불변)

- [ ] **Step 1: `PagesTable.tsx` 전체 교체**

```tsx
import Link from "next/link";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import type { PageRecord, PageStatus } from "@/lib/pages/types";
import { formatDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import CopyLinkButton from "./CopyLinkButton";
import DuplicateButton from "./DuplicateButton";
import StatusActionButton from "./StatusActionButton";
import DeleteButton from "./DeleteButton";

const GROUPS: { status: PageStatus; heading: string }[] = [
  { status: "published", heading: "발행됨" },
  { status: "draft", heading: "임시저장" },
  { status: "archived", heading: "보관" },
];

function PageRow({ page, isLast }: { page: PageRecord; isLast: boolean }) {
  return (
    <HStack
      align="center"
      justify="space-between"
      gap="x4"
      px="x4"
      py="x4"
      borderBottomWidth={isLast ? 0 : 1}
      borderColor="stroke.neutralWeak"
    >
      <Box minWidth={0} flexGrow={1}>
        <HStack align="center" gap="x2" minWidth={0}>
          <StatusBadge status={page.status} />
          <Text as="span" textStyle="t7Bold" color="fg.neutral" maxLines={1}>
            {page.title}
          </Text>
        </HStack>
        <Text as="p" textStyle="t10Regular" color="fg.neutralSubtle" marginTop="x1">
          생성 {formatDate(page.createdAt)} · 수정 {formatDate(page.updatedAt)}
        </Text>
      </Box>
      <HStack flexShrink={0} align="center" gap="x3">
        <CopyLinkButton slug={page.slug} />
        <Link href={`/admin/${page.id}/edit`} className="text-xs text-gray-600 hover:underline">
          수정
        </Link>
        <DuplicateButton id={page.id} />
        <StatusActionButton id={page.id} status={page.status} />
        <DeleteButton id={page.id} title={page.title} slug={page.slug} publishedAt={page.publishedAt} />
      </HStack>
    </HStack>
  );
}

export default function PagesTable({ pages }: { pages: PageRecord[] }) {
  if (pages.length === 0) {
    return (
      <Text as="p" textStyle="t9Regular" color="fg.neutralSubtle">
        아직 생성된 페이지가 없어요.
      </Text>
    );
  }

  return (
    <VStack gap="x6">
      {GROUPS.map(({ status, heading }) => {
        const groupPages = pages.filter((page) => page.status === status);
        if (groupPages.length === 0) return null;

        return (
          <Box key={status}>
            <Text as="p" textStyle="t11Bold" color="fg.neutralSubtle" marginBottom="x2">
              {heading} ({groupPages.length})
            </Text>
            <Box borderWidth={1} borderColor="stroke.neutralWeak" borderRadius="r2">
              {groupPages.map((page, index) => (
                <PageRow key={page.id} page={page} isLast={index === groupPages.length - 1} />
              ))}
            </Box>
          </Box>
        );
      })}
    </VStack>
  );
}
```

- [ ] **Step 2: `app/admin/published/page.tsx`의 목록 마크업 교체**

`import` 구문에 추가:

```typescript
import { Box, HStack, Text, VStack } from "@seed-design/react";
```

파일의 `return (...)` 블록 전체를 다음으로 교체 (제목/설명 문단과 CopyLinkButton 호출은 그대로 유지, 리스트 마크업만 seed 프리미티브로 교체):

```tsx
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold text-gray-900">발행된 URL</h1>
      <p className="mt-1 text-sm text-gray-500">
        한 번이라도 발행했던 페이지의 기록이에요. 지금도 발행 중인 링크만 카카오톡 버튼에
        연결하세요 — 보관된 페이지는 방문자에게 &ldquo;아직 공개되지 않은 페이지&rdquo;로 보여요.
      </p>

      {everPublished.length === 0 ? (
        <Text as="p" textStyle="t9Regular" color="fg.neutralSubtle" marginTop="x6">
          아직 발행된 페이지가 없어요.
        </Text>
      ) : (
        <Box borderWidth={1} borderColor="stroke.neutralWeak" borderRadius="r2" marginTop="x6">
          <VStack gap={0}>
            {everPublished.map((page, index) => (
              <HStack
                key={page.id}
                align="center"
                justify="space-between"
                gap="x4"
                px="x4"
                py="x4"
                borderBottomWidth={index === everPublished.length - 1 ? 0 : 1}
                borderColor="stroke.neutralWeak"
              >
                <Box minWidth={0} flexGrow={1}>
                  <HStack align="center" gap="x2" minWidth={0}>
                    <StatusBadge status={page.status} />
                    <Text as="p" textStyle="t7Bold" color="fg.neutral" maxLines={1}>
                      {page.title}
                    </Text>
                  </HStack>
                  <Text as="p" textStyle="t10Regular" color="fg.neutralSubtle" marginTop="x1">
                    발행일 {formatDate(page.publishedAt!)}
                  </Text>
                  <input
                    type="text"
                    readOnly
                    value={`${origin}/c/${page.slug}`}
                    className="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
                  />
                </Box>
                <CopyLinkButton slug={page.slug} />
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </div>
  );
```

(주소 표시란은 값을 복사/붙여넣기 위한 읽기 전용 텍스트 표시라 seed `TextField`로 바꾸지 않고 기존 스타일을 유지한다 — 별도의 라벨이나 유효성 검사가 필요 없는 단순 값 표시이므로.)

- [ ] **Step 3: 검증**

Run: `npm run lint && npx tsc --noEmit`
Expected: 둘 다 에러 없음

- [ ] **Step 4: 브라우저에서 긴 제목 말줄임 확인 (사용자 로컬 환경에서)**

이 세션의 샌드박스는 `next/font/google` 네트워크 이슈로 페이지 렌더링이 안 될 수 있으므로, 아주 긴 제목의 페이지를 하나 만들어 `/admin`에서 행이 깨지지 않고 `maxLines={1}`로 잘 잘리는지 사용자 로컬 브라우저에서 확인한다.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/PagesTable.tsx app/admin/published/page.tsx
git commit -m "feat: migrate page list layouts to seed-design primitives"
```

---

### Task 6: `Sidebar` 네비게이션 → seed `ActionButton` (브랜드 유지)

**Files:**
- Modify: `components/admin/Sidebar.tsx`

**Interfaces:**
- Consumes: `seed-design/ui/action-button`의 `ActionButton` (Task 2)

로고(`nugget.` 그라데이션 텍스트)와 `bg-navy-950` 배경은 절대 건드리지 않는다. 내비게이션 링크와 로그아웃 버튼만 seed `ActionButton`(`ghost` variant)으로 교체하되, 어두운 배경 위에서 보이도록 `color`를 밝은 색 계열로 지정한다. `Link`는 라우팅 활성 상태 표시(`usePathname`)가 필요하므로 `ActionButton`의 `asChild` 패턴 대신, `ActionButton`을 감싸는 대신 **직접 `<Link>` 위에 seed의 색상/타이포 토큰을 `className` 없이 인라인 스타일로 적용하기보다는, 링크는 기존처럼 Tailwind 클래스로 유지하고 로그아웃 버튼(순수 `<button>`)만 `ActionButton`으로 교체한다** — 활성 상태에 따라 배경이 바뀌는 이 프로젝트 고유의 로직(`active ? "bg-white/10..." : "..."`)은 seed `ActionButton`이 표현하는 방식(전역 variant)과 맞지 않고, 이 인터랙션은 이번 마이그레이션 범위(컴포넌트 교체)보다 브랜드 고유의 커스텀 동작이라 유지가 합리적이다.

- [ ] **Step 1: `Sidebar.tsx`의 로그아웃 버튼만 교체**

`import` 구문에 추가:

```typescript
import { ActionButton } from "seed-design/ui/action-button";
```

로그아웃 `<form>` 블록을 다음으로 교체:

```tsx
      <form action="/api/logout" method="POST" className="p-3">
        <ActionButton type="submit" variant="ghost" size="small" color="fg.neutralInverted">
          로그아웃
        </ActionButton>
      </form>
```

(`fg.neutralInverted`는 어두운 배경 위에서 밝게 보이는 반전 색상 토큰이다 — 사전 조사에서 확인한 `--seed-color-fg-neutral-inverted` 토큰에 대응한다.)

내비게이션 `<Link>` 부분(`NAV_ITEMS.map(...)`)은 활성 상태에 따른 배경색 전환 로직이 있어 그대로 둔다 — 이번 태스크에서 변경하지 않는다.

- [ ] **Step 2: 검증**

Run: `npm run lint && npx tsc --noEmit`
Expected: 둘 다 에러 없음

Run: `grep -n "nugget\|navy-950" components/admin/Sidebar.tsx`
Expected: 로고 텍스트와 `bg-navy-950` 클래스가 그대로 남아있음 (브랜드 요소 미변경 확인)

- [ ] **Step 3: Commit**

```bash
git add components/admin/Sidebar.tsx
git commit -m "feat: migrate sidebar logout button to seed-design ActionButton"
```
