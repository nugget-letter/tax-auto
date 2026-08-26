# 페이지 에디터 블록 드래그 정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app/admin/new`, `app/admin/[id]/edit`에서 쓰는 블록 에디터(`components/editor/BlockList.tsx`)의 블록 순서 변경 방식을, 위/아래 화살표 버튼 클릭에서 마우스 드래그(및 키보드)로 교체한다.

**Architecture:** `@dnd-kit/core`/`@dnd-kit/sortable`/`@dnd-kit/utilities`를 설치하고, 블록 하나를 감싸는 `SortableBlockItem` 컴포넌트를 신설해 각 블록의 렌더링 분기와 삭제 버튼을 그리로 옮긴다. `BlockList`는 `DndContext`+`SortableContext`로 목록을 감싸고 `onDragEnd`에서 `arrayMove`로 순서를 바꾼 배열을 기존 `onChange` 콜백에 그대로 전달한다. 블록 내부 편집 로직, 부모 컴포넌트(`PageEditorForm.tsx`), 저장 API는 전혀 건드리지 않는다.

**Tech Stack:** Next.js App Router, React 19, `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`. 이 프로젝트에는 자동화 테스트가 없으므로(다른 파일들도 단위 테스트 없음), 검증은 `npm run lint` + `npx tsc --noEmit` + 브라우저 수동 확인으로 진행한다.

## Global Constraints

- 블록 "사이의 순서"만 마우스/키보드로 바꾸는 기능이다. 각 블록의 내부 편집(배너 이미지/제목, 텍스트 본문, CTA 설정, 구분선 스타일)은 전혀 바뀌지 않는다.
- 기존 위/아래 화살표 버튼(`↑`/`↓`, `moveBlock` 함수)은 완전히 제거하고 드래그로 대체한다. "블록 삭제" 버튼은 그대로 유지한다.
- 블록 구조 자체(배너/텍스트/CTA/구분선으로 나뉜 것)를 하나의 리치텍스트 문서로 합치는 재설계는 하지 않는다.
- 표 삽입 기능(리치텍스트 에디터)은 이 계획의 범위 밖이다.
- 새 아이콘 라이브러리는 추가하지 않는다 — 드래그 핸들은 유니코드 문자(`⠿`)로 표시한다(기존 화살표 버튼도 유니코드 문자였던 패턴을 따름).
- `BlockList`의 외부 인터페이스(`{ blocks: EditableBlock[]; onChange: (blocks: EditableBlock[]) => void }`)는 변경하지 않는다 — `PageEditorForm.tsx`와 저장 API(`/api/pages`, `/api/pages/[id]`)는 수정하지 않는다.
- 드래그 시작 리스너는 그립 핸들에만 연결한다 — 카드 전체가 드래그 시작점이 되면 블록 내부의 텍스트 입력/색상 피커/버튼 클릭과 충돌한다.
- `PointerSensor`의 활성화 거리(`activationConstraint.distance`)는 `8`(px)로 고정 — 실수 클릭으로 드래그가 발동하지 않게 하는 값.
- `KeyboardSensor`를 등록해 마우스 없이도 그립 핸들 포커스 후 화살표 키로 순서 변경이 가능해야 한다(접근성 요구사항).

---

### Task 1: `@dnd-kit` 설치 및 `SortableBlockItem` 신설

**Files:**
- Modify: `package.json`, `package-lock.json` (npm install 결과)
- Create: `components/editor/SortableBlockItem.tsx`

**Interfaces:**
- Consumes: `Block`, `EditableBlock`(현재 `BlockList.tsx`에 정의된 `Block & { _key: string }`, 이 태스크에서 `SortableBlockItem.tsx`로 export 위치를 옮긴다), 기존 블록 에디터 4종(`BannerBlockEditor`, `TextBlockEditor`, `CtaBlockEditor`, `DividerBlockEditor`) — 각각 `{ block, onChange }` props를 받는 기존 시그니처 그대로.
- Produces: `SortableBlockItem` 컴포넌트, props `{ block: EditableBlock; onChange: (block: Block) => void; onRemove: () => void }`. Task 2에서 `BlockList.tsx`가 이 컴포넌트를 import해서 사용한다. `EditableBlock` 타입은 이후 `SortableBlockItem.tsx`에서 export되고, `BlockList.tsx`는 그 타입을 재사용(import)한다.

- [ ] **Step 1: 패키지 설치**

Run: `npm install @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2`

- [ ] **Step 2: 설치 확인**

Run: `grep -n "@dnd-kit" package.json`
Expected: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 세 줄이 `dependencies`에 출력됨

- [ ] **Step 3: `SortableBlockItem.tsx` 생성**

`components/editor/BlockList.tsx`에서 현재 `export type EditableBlock = Block & { _key: string };`로 정의된 타입을 이 새 파일로 옮기고(원본에서는 제거하고 여기서 import), 블록 타입별 렌더링 분기와 삭제 버튼을 옮긴다:

```tsx
"use client";

import type { Block } from "@/lib/pages/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BannerBlockEditor from "./BannerBlockEditor";
import TextBlockEditor from "./TextBlockEditor";
import CtaBlockEditor from "./CtaBlockEditor";
import DividerBlockEditor from "./DividerBlockEditor";

export type EditableBlock = Block & { _key: string };

type Props = {
  block: EditableBlock;
  onChange: (block: Block) => void;
  onRemove: () => void;
};

export default function SortableBlockItem({ block, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="mb-1 flex items-center justify-end gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mr-auto cursor-grab text-sm text-gray-400 active:cursor-grabbing"
          aria-label="블록 순서 변경 핸들"
        >
          ⠿
        </button>
        <button type="button" onClick={onRemove} className="text-xs text-red-600">
          블록 삭제
        </button>
      </div>
      {block.type === "banner" && <BannerBlockEditor block={block} onChange={onChange} />}
      {block.type === "text" && <TextBlockEditor block={block} onChange={onChange} />}
      {block.type === "cta" && <CtaBlockEditor block={block} onChange={onChange} />}
      {block.type === "divider" && <DividerBlockEditor block={block} onChange={onChange} />}
    </div>
  );
}
```

(그립 핸들은 `type="button"`인 네이티브 `<button>`이라 `attributes`/`listeners`가 스프레드하는 `role`/`tabIndex`/키보드 이벤트 핸들러와 충돌하지 않는다 — `@dnd-kit/sortable`의 `useSortable`은 대상 엘리먼트가 포커스 가능한 인터랙티브 요소임을 가정하지 않고 속성을 얹기만 한다.)

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit`
Expected: `SortableBlockItem.tsx`에서 에러 없음 (단, `BlockList.tsx`는 아직 옛 코드라 이 시점엔 `EditableBlock` 중복 정의로 에러가 날 수 있음 — Task 2에서 `BlockList.tsx`를 수정하기 전까지는 무시하고 다음 스텝으로 진행)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/editor/SortableBlockItem.tsx
git commit -m "feat: add dnd-kit and extract SortableBlockItem from BlockList"
```

---

### Task 2: `BlockList`를 `DndContext`/`SortableContext`로 재작성

**Files:**
- Modify: `components/editor/BlockList.tsx`

**Interfaces:**
- Consumes: `SortableBlockItem`과 `EditableBlock`(Task 1에서 `./SortableBlockItem`로부터 export), `@dnd-kit/core`의 `DndContext`/`useSensor`/`useSensors`/`PointerSensor`/`KeyboardSensor`/`DragEndEvent`, `@dnd-kit/sortable`의 `SortableContext`/`verticalListSortingStrategy`/`sortableKeyboardCoordinates`/`arrayMove`
- Produces: `BlockList`의 외부 인터페이스는 변경 없음 (`{ blocks: EditableBlock[]; onChange: (blocks: EditableBlock[]) => void }`) — 호출부인 `PageEditorForm.tsx` 수정 불필요

- [ ] **Step 1: `BlockList.tsx` 전체 교체**

```tsx
"use client";

import type { Block } from "@/lib/pages/types";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableBlockItem, { type EditableBlock } from "./SortableBlockItem";

export type { EditableBlock };

function createDefaultBlock(type: Block["type"]): Block {
  if (type === "banner") return { type: "banner", imageUrl: "", title: "", subtitle: "" };
  if (type === "text") return { type: "text", heading: "", bodyHtml: "<p></p>" };
  if (type === "cta") return { type: "cta", label: "상담 신청하기", href: "", color: "#FEE500" };
  return { type: "divider" };
}

type Props = {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
};

export default function BlockList({ blocks, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateBlock(index: number, block: Block) {
    onChange(blocks.map((b, i) => (i === index ? { ...block, _key: b._key } : b)));
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function addBlock(type: Block["type"]) {
    onChange([...blocks, { ...createDefaultBlock(type), _key: crypto.randomUUID() }]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b._key === active.id);
    const newIndex = blocks.findIndex((b) => b._key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b._key)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => (
            <SortableBlockItem
              key={block._key}
              block={block}
              onChange={(b) => updateBlock(index, b)}
              onRemove={() => removeBlock(index)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => addBlock("banner")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 배너 이미지
        </button>
        <button
          type="button"
          onClick={() => addBlock("text")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 본문 텍스트
        </button>
        <button
          type="button"
          onClick={() => addBlock("cta")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + CTA 버튼
        </button>
        <button
          type="button"
          onClick={() => addBlock("divider")}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          + 구분선
        </button>
      </div>
    </div>
  );
}
```

(`export type { EditableBlock };`로 재수출하는 이유: `PageEditorForm.tsx`를 비롯한 다른 파일들이 지금까지 `import type { EditableBlock } from "./BlockList"` 형태로 이 타입을 가져오고 있을 수 있으므로, import 경로가 실제로 바뀌었는지 Step 2에서 확인한다.)

- [ ] **Step 2: 다른 파일들의 `EditableBlock` import 경로 확인**

Run: `grep -rn "EditableBlock" --include="*.tsx" --include="*.ts" app components lib | grep -v "components/editor/BlockList.tsx\|components/editor/SortableBlockItem.tsx"`

각 결과 줄이 `from "./BlockList"` 또는 `from "@/components/editor/BlockList"`처럼 `BlockList`에서 가져오고 있다면, Step 1에서 추가한 `export type { EditableBlock };` 덕분에 수정 없이 그대로 동작한다(타입 에러가 없어야 함). 만약 있다면 Step 3(tsc 검증)에서 확인된다.

- [ ] **Step 3: 검증**

Run: `npm run lint`
Expected: 에러 없음

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `grep -n "moveBlock\|↑\|↓" components/editor/BlockList.tsx`
Expected: 아무 것도 출력되지 않음 (화살표 버튼과 관련 함수가 완전히 제거됐는지 확인)

- [ ] **Step 4: Commit**

```bash
git add components/editor/BlockList.tsx
git commit -m "feat: replace arrow-button reordering with drag-and-drop in BlockList"
```

---

### Task 3: 브라우저 수동 검증

**Files:** 없음 (코드 변경 없음, 검증 전용 태스크)

**Interfaces:** 없음

- [ ] **Step 1: 사용자 로컬 환경에서 동작 확인 요청**

이 계획을 실행하는 에이전트 세션의 샌드박스는 `next/font/google` 네트워크 이슈로 페이지 렌더링이 안 될 수 있으므로, 다음 항목은 사용자에게 로컬 브라우저(`npm run dev`)에서 직접 확인해달라고 안내한다:

1. `/admin/new`(또는 기존 페이지의 `/admin/[id]/edit`)에서 블록을 3개 이상 추가한다.
2. 그립 핸들(`⠿`)을 마우스로 눌러 드래그해서 블록 순서를 바꾼다 — 순서가 즉시 반영되는지 확인.
3. 그립 핸들이 아닌 블록 내부(텍스트 입력, 색상 피커 등)를 클릭했을 때 드래그가 발동하지 않는지 확인.
4. 그립 핸들에 Tab으로 포커스한 뒤 화살표 키(↑/↓)로 순서를 바꿀 수 있는지 확인 (키보드 접근성).
5. 순서를 바꾼 뒤 페이지를 저장하고 다시 열어서, 바뀐 순서가 유지되는지 확인 (기존 저장 API를 그대로 타는지 확인하는 목적).

- [ ] **Step 2: 문제 발견 시**

위 확인 중 문제가 발견되면 Task 1/2로 돌아가 수정한다. 모두 통과하면 이 태스크를 완료로 표시한다 (별도 커밋 없음).
