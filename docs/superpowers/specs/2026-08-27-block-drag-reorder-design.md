# 페이지 에디터 블록 드래그 정렬 설계

## 배경

`app/admin/new`, `app/admin/[id]/edit`에서 쓰는 블록 에디터(`components/editor/BlockList.tsx`)는 현재 배너/텍스트/CTA/구분선 블록의 순서를 위/아래 화살표 버튼(클릭할 때마다 배열에서 인접한 두 항목을 swap)으로만 바꿀 수 있다. 이걸 마우스 드래그로 순서를 바꿀 수 있게 한다.

## 범위

- 블록 "사이의 순서"만 마우스로 바꾸는 기능이다. 각 블록의 내부 편집(배너 이미지/제목, 텍스트 본문, CTA 설정, 구분선 스타일)은 전혀 바뀌지 않는다.
- 기존 위/아래 화살표 버튼은 **완전히 제거**하고 드래그로 대체한다. "블록 삭제" 버튼은 그대로 유지한다.
- 블록 구조 자체(배너/텍스트/CTA/구분선으로 나뉜 것)를 하나의 리치텍스트 문서로 합치는 재설계는 하지 않는다 — 각 블록 타입마다 필요한 입력 UI(이미지 업로더, 색상 피커, CTA 링크 설정 등)가 서로 다르기 때문에 블록으로 나뉘어 있는 것이며, 이 설계는 그 구조를 유지한 채 순서 변경 방식만 바꾼다.
- 표 삽입 기능(리치텍스트 에디터)은 별도 스펙으로 분리한다 — 이 문서의 범위 밖이다.

## 라이브러리

`@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`를 설치한다 (npm에 실제 배포된 최신 버전 확인함). React 19와 호환되고 접근성(키보드 조작)을 기본 지원하는 현재 표준 드래그앤드롭 라이브러리다. 새 아이콘 라이브러리는 추가하지 않는다 — 프로젝트가 지금까지 아이콘 라이브러리 없이 유니코드 문자(예: 기존 화살표 버튼의 `↑`/`↓`)로 버튼을 표현해온 패턴을 따라, 드래그 핸들도 유니코드 문자(`⠿`)로 표시한다.

## 컴포넌트 구조

### 신규: `components/editor/SortableBlockItem.tsx`

블록 하나를 감싸는 컴포넌트. Props: `block: EditableBlock`, `onChange: (block: Block) => void`, `onRemove: () => void`.

- `@dnd-kit/sortable`의 `useSortable({ id: block._key })` 훅으로 드래그 가능하게 만든다.
- 좌측에 그립 핸들(`⠿`, 텍스트 버튼 형태)을 렌더링하고, **드래그 시작 리스너(`listeners`, `attributes`)는 이 핸들에만 연결한다** — 카드 전체가 아니라 핸들만 드래그 시작점이 되게 해서, 블록 내부의 텍스트 입력/색상 피커/버튼 클릭과 드래그가 충돌하지 않게 한다.
- `useSortable`이 반환하는 `transform`/`transition`을 `@dnd-kit/utilities`의 `CSS.Transform.toString()`으로 변환해 카드의 `style`에 적용한다.
- 기존 `BlockList.tsx`가 블록 타입별로 분기해서 렌더링하던 부분(`BannerBlockEditor`/`TextBlockEditor`/`CtaBlockEditor`/`DividerBlockEditor`)과 "블록 삭제" 버튼을 이 컴포넌트로 그대로 옮긴다.

### 수정: `components/editor/BlockList.tsx`

- `@dnd-kit/core`의 `DndContext`로 블록 목록 전체를 감싼다. 센서는 `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))`로 등록한다 — `distance: 8`은 8px 이상 움직여야 드래그가 시작되게 해서, 핸들을 실수로 클릭했을 때 드래그가 발동하지 않게 하는 최소 이동 거리다.
- `@dnd-kit/sortable`의 `SortableContext`로 블록 배열(`items={blocks.map((b) => b._key)}`, `strategy={verticalListSortingStrategy}`)을 감싼다.
- 각 블록을 `SortableBlockItem`으로 렌더링한다.
- `onDragEnd` 핸들러: `active.id`와 `over.id`(둘 다 `block._key`)로 현재 배열에서의 인덱스를 찾아 `@dnd-kit/sortable`의 `arrayMove(blocks, oldIndex, newIndex)`로 새 배열을 만들고, 기존 `onChange(next)` 콜백을 그대로 호출한다.
- 기존 `moveBlock` 함수와 위/아래 화살표 버튼(`↑`/`↓`)은 삭제한다.
- 블록 추가 버튼 영역(`+ 배너 이미지` 등)은 그대로 유지한다.

## 데이터 흐름

`BlockList`의 외부 인터페이스(`{ blocks: EditableBlock[]; onChange: (blocks: EditableBlock[]) => void }`)는 변경되지 않는다. `PageEditorForm.tsx`나 페이지 저장 API(`/api/pages`, `/api/pages/[id]`)는 전혀 건드리지 않는다 — 드래그로 바뀐 순서도 결국 같은 `onChange(blocks)` 콜백을 통해 부모 컴포넌트의 상태로 반영되고, 저장 시 배열 순서 그대로 `blocks` 컬럼에 저장되는 기존 흐름을 그대로 탄다.

## 접근성

`KeyboardSensor`를 등록해서 그립 핸들에 포커스한 뒤 화살표 키로도 순서를 바꿀 수 있게 한다 (마우스 없이도 동작). `PointerSensor`의 8px 활성화 거리로 실수 드래그를 방지한다.

## 에러 처리

순수 클라이언트 사이드 배열 재정렬이라 별도의 에러 상태나 실패 케이스가 없다. `over`가 `null`인 경우(목록 밖에 드롭한 경우) `onDragEnd`에서 아무 것도 하지 않고 종료한다.

## 검증

이 프로젝트에는 자동화 테스트가 없다. `npm run lint` + `npx tsc --noEmit` 클린 확인 후, 브라우저 수동 확인(마우스 드래그로 순서 변경, 키보드 화살표로도 순서 변경, 실수 클릭 시 드래그 발동 안 함)으로 검증한다. 에이전트 세션 샌드박스는 `next/font/google` 네트워크 이슈로 페이지 렌더링이 안 될 수 있어 실제 드래그 동작 확인은 사용자 로컬 환경에서 진행한다.

## 범위 밖 (YAGNI)

- 표 삽입 기능 (별도 스펙)
- 블록 구조를 단일 리치텍스트 문서로 재설계
- 블록 간 드래그 중 미리보기 애니메이션 이상의 커스텀 트랜지션 효과 (dnd-kit 기본 동작 사용)
- 터치 디바이스(모바일)에서의 별도 최적화 — 관리자 도구는 데스크톱 사용을 전제로 함
