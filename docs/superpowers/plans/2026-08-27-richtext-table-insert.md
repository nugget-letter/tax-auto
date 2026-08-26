# 리치텍스트 에디터 표 삽입 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `components/editor/RichTextEditor.tsx`(텍스트 블록 본문 편집기)에 표 삽입·편집(행/열 추가·삭제, 표 삭제) 기능을 추가한다.

**Architecture:** `@tiptap/extension-table`에서 `Table`/`TableRow`/`TableHeader`/`TableCell` 네 노드를 모두 등록하고(스키마 요구사항 — 아래 Global Constraints 참고), 표 조작 버튼을 담은 신규 컴포넌트 `TableToolbarControls`를 만들어 기존 툴바에 연결한다. 저장 파이프라인이 표를 지우지 않도록 `lib/sanitize.ts`의 허용 태그/속성/스타일 목록을 확장한다.

**Tech Stack:** Next.js App Router, React 19, Tiptap 3.29.2 계열, `@tiptap/extension-table@3.29.2`, `sanitize-html`. 이 프로젝트에는 자동화 테스트가 없으므로(다른 파일들도 단위 테스트 없음), 검증은 `npm run lint` + `npx tsc --noEmit` + 브라우저 수동 확인으로 진행한다.

## Global Constraints

- `TableHeader` 확장은 UI로 노출하지 않지만(헤더 행 없음) **반드시 등록**해야 한다 — `TableRow`의 콘텐츠 정의가 `"(tableCell | tableHeader)*"`로 고정돼 있어서, `TableHeader`가 스키마에 없으면 에러가 난다.
- `Table.configure({ resizable: false })`로 설정한다 — 컬럼 리사이즈 기능 없음.
- 표 삽입은 항상 `insertTable({ rows: 3, cols: 3, withHeaderRow: false })` — 헤더 행 없음.
- `lib/sanitize.ts`의 `ALLOWED_TAGS`에 `th`는 추가하지 않는다 — 에디터가 절대 `th`를 생성하지 않으므로(헤더 없음, 붙여넣기 인식 미지원), 에디터가 실제로 만드는 태그만 허용하는 기존 원칙을 따른다.
- 표 조작 버튼(행 추가/삭제, 열 추가/삭제, 표 삭제)은 커서가 표 밖에 있으면 `editor.can().<command>()`로 `disabled` 처리한다 — 클릭해도 아무 일 없는 상태를 만들지 않는다.
- 열 너비 드래그 리사이즈, 헤더 행, 외부에서 표 붙여넣기 인식, 셀 병합/분할은 범위 밖이다.

---

### Task 1: `@tiptap/extension-table` 설치, 에디터 스키마 등록, sanitizer 허용 목록 확장

**Files:**
- Modify: `package.json`, `package-lock.json` (npm install 결과)
- Modify: `components/editor/RichTextEditor.tsx`
- Modify: `lib/sanitize.ts`

**Interfaces:**
- Produces: `Table`, `TableRow`, `TableHeader`, `TableCell` 확장이 `RichTextEditor`의 Tiptap 에디터 인스턴스에 등록됨 — Task 2에서 `TableToolbarControls`가 이 에디터 인스턴스의 `editor.chain().focus().insertTable(...)` 등의 명령을 호출한다. `lib/sanitize.ts`가 `table`/`colgroup`/`col`/`tbody`/`tr`/`td` 태그와 `td`의 `colspan`/`rowspan` 속성, `table`/`col`의 `width`/`min-width` style을 허용함.

- [ ] **Step 1: 패키지 설치**

Run: `npm install @tiptap/extension-table@3.29.2`

- [ ] **Step 2: 설치 확인**

Run: `grep -n "@tiptap/extension-table" package.json`
Expected: `"@tiptap/extension-table": "^3.29.2"` 한 줄 출력

- [ ] **Step 3: `RichTextEditor.tsx`에 표 확장 추가**

`@tiptap/extension-table`은 `Table`/`TableRow`/`TableHeader`/`TableCell`을 한 번에 등록하는 `TableKit` 편의 확장을 제공한다(기존 코드의 `StarterKit.configure({...})`와 같은 패턴). 파일 상단 import 목록에 추가 (`import { DividerNode } from "@/lib/tiptap/dividerNode";` 다음 줄):

```typescript
import { TableKit } from "@tiptap/extension-table";
```

`extensions` 배열(`DividerNode,` 다음)에 추가:

```typescript
      DividerNode,
      TableKit.configure({ table: { resizable: false } }),
```

(`TableKit`은 내부적으로 `Table`/`TableCell`/`TableHeader`/`TableRow`를 모두 등록한다. `TableHeader`를 별도로 `false` 처리하지 않고 그대로 두는 이유: `TableRow`의 콘텐츠 정의가 `"(tableCell | tableHeader)*"`로 고정돼 있어서, `TableHeader`가 스키마에 없으면 에러가 난다 — 실제로 헤더 셀을 만드는 UI 경로는 없으므로 `th`는 절대 생성되지 않는다.)

- [ ] **Step 4: `lib/sanitize.ts`의 `ALLOWED_TAGS`에 표 태그 추가**

```typescript
const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "span", "mark", "hr", "table", "colgroup", "col", "tbody", "tr", "td"];
```

- [ ] **Step 5: `lib/sanitize.ts`의 `allowedAttributes`에 `td` 추가**

`allowedAttributes` 객체를 다음으로 교체:

```typescript
    allowedAttributes: {
      "*": ["style"],
      td: ["colspan", "rowspan"],
    },
```

- [ ] **Step 6: `lib/sanitize.ts`의 `allowedStyles`에 `width`/`min-width` 추가**

`allowedStyles["*"]` 객체의 `"text-align": [/^(left|center|right)$/],` 줄 다음에 추가:

```typescript
        width: [/^\d+px$/],
        "min-width": [/^\d+px$/],
```

- [ ] **Step 7: 검증**

Run: `npm run lint`
Expected: 에러 없음

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `grep -n "table\|colgroup\|col\|tbody\|tr\|td" lib/sanitize.ts`
Expected: `ALLOWED_TAGS`에 6개 태그가 포함된 줄과 `td: ["colspan", "rowspan"]` 줄이 출력됨

Run: `grep -n "^\s*th\b" lib/sanitize.ts`
Expected: 아무 것도 출력되지 않음 (`th`가 추가되지 않았는지 확인)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json components/editor/RichTextEditor.tsx lib/sanitize.ts
git commit -m "feat: register tiptap table extensions and allow table tags in sanitizer"
```

---

### Task 2: `TableToolbarControls` 신설 및 툴바 연결

**Files:**
- Create: `components/editor/TableToolbarControls.tsx`
- Modify: `components/editor/RichTextEditor.tsx`

**Interfaces:**
- Consumes: Task 1에서 등록된 `Table`/`TableRow`/`TableHeader`/`TableCell` 확장이 붙은 `editor` 인스턴스(`@tiptap/react`의 `Editor` 타입)
- Produces: `TableToolbarControls` 컴포넌트, props `{ editor: Editor }`. 다른 태스크가 이 컴포넌트를 소비하지 않는다(툴바 UI의 말단 컴포넌트).

- [ ] **Step 1: `TableToolbarControls.tsx` 생성**

```tsx
"use client";

import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
};

export default function TableToolbarControls({ editor }: Props) {
  return (
    <>
      <button
        type="button"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200"
      >
        표 삽입
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!editor.can().addRowAfter()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        행 추가
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!editor.can().deleteRow()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        행 삭제
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!editor.can().addColumnAfter()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        열 추가
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!editor.can().deleteColumn()}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        열 삭제
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        disabled={!editor.can().deleteTable()}
        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        표 삭제
      </button>
    </>
  );
}
```

- [ ] **Step 2: `RichTextEditor.tsx`에 import 추가**

```typescript
import TableToolbarControls from "./TableToolbarControls";
```

- [ ] **Step 3: `RichTextEditor.tsx` 툴바에 렌더링**

"구분선 삽입" `<select>`를 감싸는 태그 바로 다음(툴바 `<div>`가 닫히기 전)에 추가:

```tsx
        <TableToolbarControls editor={editor} />
```

- [ ] **Step 4: 검증**

Run: `npm run lint`
Expected: 에러 없음

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `grep -n "TableToolbarControls" components/editor/RichTextEditor.tsx`
Expected: import 줄과 렌더링 줄 2곳 출력

- [ ] **Step 5: Commit**

```bash
git add components/editor/TableToolbarControls.tsx components/editor/RichTextEditor.tsx
git commit -m "feat: add table toolbar controls to rich text editor"
```

---

### Task 3: 브라우저 수동 검증

**Files:** 없음 (코드 변경 없음, 검증 전용 태스크)

**Interfaces:** 없음

- [ ] **Step 1: 사용자 로컬 환경에서 동작 확인 요청**

이 계획을 실행하는 에이전트 세션의 샌드박스는 `.env.local`이 없어 `/admin` 로그인이 안 되므로, 다음 항목은 사용자에게 로컬 브라우저(`npm run dev`)에서 직접 확인해달라고 안내한다:

1. 텍스트 블록 편집기에서 "표 삽입" 버튼을 눌러 3×3 표가 삽입되는지 확인.
2. 셀 안에 텍스트를 입력하고, 셀 사이를 Tab/클릭으로 이동할 수 있는지 확인.
3. 커서를 표 안에 두고 "행 추가"/"열 추가"를 눌러 행/열이 늘어나는지 확인.
4. "행 삭제"/"열 삭제"로 행/열이 줄어드는지, 마지막 행/열까지 지운 뒤에도 에디터가 깨지지 않는지 확인.
5. 커서를 표 밖(예: 표 앞뒤의 빈 문단)에 뒀을 때 행/열/표 조작 버튼이 회색으로 비활성화되는지 확인.
6. "표 삭제"로 표 전체가 지워지는지 확인.
7. 표가 있는 상태로 페이지를 저장하고, 편집 화면을 새로고침해서 표 구조(행/열 수, 셀 내용)가 그대로 유지되는지 확인 — sanitizer가 표 태그를 지우지 않는지 확인하는 목적.

- [ ] **Step 2: 문제 발견 시**

위 확인 중 문제가 발견되면 Task 1/2로 돌아가 수정한다. 모두 통과하면 이 태스크를 완료로 표시한다 (별도 커밋 없음).
