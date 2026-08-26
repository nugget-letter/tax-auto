# 리치텍스트 에디터 표 삽입 기능 설계

## 배경

`components/editor/RichTextEditor.tsx`(Tiptap 기반)는 텍스트 블록의 본문(`bodyHtml`)을 편집하는 리치텍스트 에디터다. 굵게/기울임/밑줄/취소선, 글꼴/글자크기/자간/행간/색상, 강조, 구분선 삽입은 지원하지만 표는 지원하지 않는다. 표를 삽입·편집할 수 있게 한다.

이전 "블록 드래그 정렬" 설계(`docs/superpowers/specs/2026-08-27-block-drag-reorder-design.md`)에서 "표 삽입 기능은 별도 스펙으로 분리한다"고 명시했던 바로 그 기능이다.

## 범위

- 표 삽입, 셀 안 텍스트 편집, 행/열 추가·삭제, 표 삭제까지 지원한다.
- 열 너비 드래그 리사이즈, 헤더 행, 외부(엑셀/구글시트/웹페이지)에서 표 붙여넣기 인식, 셀 병합/분할은 범위 밖이다(아래 YAGNI 참고).

## 라이브러리

`@tiptap/extension-table@3.29.2`를 설치한다(현재 설치된 `@tiptap/react`/`@tiptap/starter-kit` 등과 동일한 3.29.2 계열, npm에 실제 배포된 버전 확인함). 이 패키지 하나가 `Table`, `TableRow`, `TableHeader`, `TableCell` 네 노드를 모두 export한다 — Tiptap v2 시절처럼 노드별로 별도 npm 패키지가 아니다.

npm에서 실제 패키지(`@tiptap/extension-table@3.29.2`, `@tiptap/core@3.29.2`)를 다운로드해 배포된 소스(`dist/index.js`)를 직접 열어 다음을 확인했다 — 문서 사이트 설명이 아니라 실제 코드 기준이다:

- **`TableRow`의 콘텐츠 정의는 `content: "(tableCell | tableHeader)*"`로 고정**돼 있다. `TableHeader` 확장을 등록하지 않으면 이 콘텐츠 표현식이 참조하는 노드 타입이 스키마에 없어 에러가 난다. 따라서 헤더 행을 UI로 노출하지 않기로 했어도 **4개 노드(`Table`, `TableRow`, `TableHeader`, `TableCell`)를 전부 등록**해야 한다.
- **`Table.renderHTML`은 `resizable` 옵션과 무관하게 항상 다음 구조를 렌더링한다**: `["table", { style: "width: Npx" 또는 "min-width: Npx" }, ["colgroup", {}, ["col", { style: "width: Npx" 또는 "min-width: Npx" }], ...], ["tbody", 0]]`. 즉 리사이즈 기능을 켜지 않아도 `<colgroup><col style="...">`는 항상 나온다. `renderWrapper` 옵션 기본값은 `false`라 `<div class="tableWrapper">` 래퍼는 생기지 않는다.
- **`TableCell`/`TableHeader`는 `td`/`th`로 렌더링**되며, `colspan`(기본 1), `rowspan`(기본 1) 속성은 **커스텀 `renderHTML`이 없는 일반 속성이라 값이 `null`이 아닌 한 항상 리터럴 HTML 속성으로 출력**된다(`@tiptap/core`의 `getRenderedAttributes` 확인: `renderHTML`이 없는 속성은 `{[name]: attrs[name]}`를 그대로 DOM 속성으로 내보냄). 즉 병합하지 않은 평범한 셀도 항상 `colspan="1" rowspan="1"`을 달고 저장된다. `colwidth`는 기본값이 `null`이라 컬럼 리사이즈를 쓰지 않는 한 출력되지 않는다.
- **`align` 속성(정렬)은 `style="text-align: ..."`로 렌더링**된다 — 별도 HTML 속성이 아니라 기존 sanitizer가 이미 허용하는 `text-align` style 패턴을 그대로 재사용할 수 있다.
- **`TableRow`는 `tr`로, `TableCell`의 `parseHTML`은 `td`를, `TableHeader`의 `parseHTML`은 `th`를 인식**한다 — 저장된 HTML을 다시 에디터에 로드했을 때 공식 확장이 알아서 파싱하므로 커스텀 파싱 로직이 필요 없다.

## 컴포넌트 구조

### 신규: `components/editor/TableToolbarControls.tsx`

`RichTextEditor.tsx`가 이미 239줄이고 툴바 컨트롤을 전부 인라인 JSX로 담고 있어서, 표 관련 버튼 6개를 추가로 얹으면 파일이 계속 비대해진다. 표 조작 버튼만 별도 컴포넌트로 분리한다.

Props: `{ editor: Editor }` (Tiptap의 `Editor` 타입, `@tiptap/react`에서 import).

렌더링할 버튼(기존 툴바처럼 아이콘 없이 텍스트 라벨, 기존 "구분선 삽입" select 옆에 배치):

| 라벨 | 명령 | 비활성화 조건 |
|---|---|---|
| 표 삽입 | `editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()` | 없음 (항상 활성) |
| 행 추가 | `editor.chain().focus().addRowAfter().run()` | `!editor.can().addRowAfter()` |
| 행 삭제 | `editor.chain().focus().deleteRow().run()` | `!editor.can().deleteRow()` |
| 열 추가 | `editor.chain().focus().addColumnAfter().run()` | `!editor.can().addColumnAfter()` |
| 열 삭제 | `editor.chain().focus().deleteColumn().run()` | `!editor.can().deleteColumn()` |
| 표 삭제 | `editor.chain().focus().deleteTable().run()` | `!editor.can().deleteTable()` |

기존 B/I/U/S 버튼은 `isActive`로 하이라이트만 하고 비활성화 처리가 없었지만, 표 조작 버튼은 커서가 표 밖에 있을 때 눌러도 아무 일도 안 일어나는 것보다 애초에 `disabled`로 회색 처리하는 편이 사용자에게 명확하다.

### 수정: `components/editor/RichTextEditor.tsx`

- `extensions` 배열에 `Table.configure({ resizable: false })`, `TableRow`, `TableHeader`, `TableCell`을 추가한다(`@tiptap/extension-table`에서 import).
- 툴바에 `<TableToolbarControls editor={editor} />`를 "구분선 삽입" select 다음에 렌더링한다.

### 수정: `lib/sanitize.ts`

- `ALLOWED_TAGS`에 `table`, `colgroup`, `col`, `tbody`, `tr`, `td` 6개를 추가한다. **`th`는 추가하지 않는다** — `withHeaderRow: false`로만 삽입하고 붙여넣기 인식도 지원하지 않으므로 에디터가 절대 `th`를 생성하지 않는다. 기존 sanitizer의 원칙(에디터가 실제로 만드는 태그만 허용)을 그대로 따른다.
- `allowedAttributes`에 `td: ["colspan", "rowspan"]`를 추가한다(값 자체에 대한 정규식 검증은 하지 않는다 — 이 sanitizer는 신뢰된 관리자 작성자의 실수/붙여넣기 찌꺼기를 거르는 용도지 악의적 입력 방어용이 아니며, 기존 코드도 같은 전제로 작성되어 있다).
- `allowedStyles`의 `"*"` 맵에 `width: [/^\d+px$/]`, `"min-width": [/^\d+px$/]` 두 패턴을 추가한다(`font-size` 패턴과 마찬가지로 정수 px만 나오는 것을 실제 패키지 소스로 확인했다 — `getColStyleDeclaration`이 `${Math.max(width, minWidth)}px`/`${minWidth}px` 형식만 생성).

## 데이터 흐름

`RichTextEditor`의 `onChange(html)` 콜백, `TextBlockEditor`의 `bodyHtml` 필드, 저장 API(`/api/pages`, `/api/pages/[id]`), `sanitizePageInputHtml` 호출 지점은 전혀 바뀌지 않는다 — 표도 `bodyHtml` 문자열 안의 HTML 조각일 뿐이다.

## 에러 처리 & 엣지 케이스

- 커서가 표 밖에 있을 때 행/열/표 조작 버튼은 `editor.can().addRowAfter()` 등으로 비활성화되므로, 별도 에러 상태나 알림이 필요 없다.
- 표 안에 표를 중첩 삽입하는 경우 Tiptap 스키마상(`td`/`th`의 콘텐츠가 `block+`) 이론적으로 가능하지만, 이번 설계에서 명시적으로 막지 않는다(YAGNI) — 실사용 시나리오상 발생 가능성이 낮다.
- 저장했다가 편집 화면을 다시 열었을 때 `table`/`colgroup`/`col`/`tbody`/`tr`/`td` 구조가 그대로 파싱되어 편집 가능한 상태로 복원되는지는 Tiptap 공식 확장 기능이라 커스텀 파싱 로직이 필요 없다 — 브라우저 수동 확인 항목으로 확인한다.

## 검증

이 프로젝트에는 자동화 테스트가 없다. `npm run lint` + `npx tsc --noEmit` 클린 확인 후, 브라우저 수동 확인(표 삽입 → 셀에 텍스트 입력 → 행/열 추가·삭제 → 표 삭제 버튼 비활성화/활성화 전환 확인 → 저장 → 새로고침 후 표 구조 유지 확인)으로 검증한다. 에이전트 세션 샌드박스는 `.env.local`이 없어 `/admin` 로그인이 안 되므로, 실제 브라우저 확인은 사용자 로컬 환경에서 진행한다.

## 범위 밖 (YAGNI)

- 열 너비 드래그 리사이즈 (`Table.configure({ resizable: true })` + `columnResizing` 플러그인)
- 헤더 행 (굵게/배경색 구분) — `insertTable`은 항상 `withHeaderRow: false`
- 엑셀/구글시트/웹페이지에서 표 붙여넣기 인식
- 셀 병합(merge)/분할(split)
- 표 안에 표 중첩을 막는 별도 검증
- 표 스타일(테두리 색/두께 등) 커스터마이징 — 기본 브라우저 표 렌더링 그대로 사용
