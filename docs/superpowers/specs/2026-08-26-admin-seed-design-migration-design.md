# 관리자 대시보드 셸 seed-design 마이그레이션 설계

## 배경

`/admin`은 현재 순수 Tailwind CSS 유틸리티 클래스로 손으로 짠 UI다. 컴포넌트 라이브러리 없이 버튼, 배지, 폼 요소를 매번 직접 마크업한다. 이 디자인을 당근(Daangn)의 오픈소스 디자인 시스템 [seed-design](https://github.com/daangn/seed-design)으로 교체한다.

seed-design은 npm에 실제 배포되어 있다 (`@seed-design/react@2.3.0`, `@seed-design/css@2.5.0`, `@seed-design/cli@1.6.1` 확인됨). React 19를 포함한 React 18+ 를 peer dependency로 지원한다. 원래 당근 모바일 앱/웹 제품용 디자인 언어라 데이터 테이블 같은 컴포넌트는 없고, Action Button/Badge/Text Input/Dialog 등 범용 프리미티브와 레이아웃 컴포넌트(Box/VStack/HStack/Text) 위주다.

## 범위

**1단계로 대시보드 셸만 대상으로 한다.** 페이지 에디터(`/admin/new`, `/admin/[id]/edit`의 Tiptap 리치텍스트·블록 편집기)는 별도 작업으로 분리한다.

이번 범위에 포함되는 파일:
- `app/login/page.tsx` (로그인 폼)
- `app/admin/layout.tsx`, `components/admin/Sidebar.tsx` (셸/사이드바)
- `app/admin/page.tsx`, `app/admin/published/page.tsx` (페이지 목록)
- `components/dashboard/PagesTable.tsx`, `StatusBadge.tsx`, `CopyLinkButton.tsx`, `StatusActionButton.tsx`, `DeleteButton.tsx`, `DuplicateButton.tsx`

**적용 깊이:** 컴포넌트 라이브러리까지 실제로 교체한다 (토큰만 가져다 기존 마크업을 재스타일링하는 게 아니라, seed-design의 실제 컴포넌트로 바꾼다). 대응하는 컴포넌트가 없는 부분(페이지 목록 레이아웃 등)은 seed의 `Box`/`VStack`/`HStack`/`Text` 프리미티브로 직접 구성한다.

**다크모드는 지원하지 않는다.** 라이트 모드 토큰값만 사용한다.

**브랜드 요소는 유지한다.** 사이드바의 "nugget." 그라데이션 로고와 `navy-950` 배경색은 그대로 둔다. seed-design은 레이아웃/컴포넌트 토큰(간격, 타이포그래피, 상호작용 스타일)에만 쓴다.

**삭제 확인 UX는 바꾸지 않는다.** `DeleteButton`의 `window.confirm()`은 이번 범위 밖이다 — 시각적 요소(버튼 자체)만 seed 컴포넌트로 교체하고 확인 대화상자는 그대로 둔다.

## 설치 & 프로젝트 구조

1. 설치: `npm install @seed-design/react @seed-design/css`
2. `npx @seed-design/cli@latest init` 실행 후 `seed-design.json` 생성:
   ```json
   { "rsc": false, "tsx": true, "path": "./seed-design" }
   ```
3. `tsconfig.json`의 `compilerOptions.paths`에 추가:
   ```json
   "seed-design/*": ["./seed-design/*"]
   ```
4. CLI로 필요한 컴포넌트 추가 (예: `npx @seed-design/cli@latest add ui:action-button`) — `./seed-design/ui/*`에 컴포넌트 소스가 복사된다 (shadcn/ui와 동일한 방식).

## 테마 스코핑 (핵심 설계 결정)

seed-design 공식 가이드는 `<html>`에 `data-seed`, `data-seed-color-mode="system"`, `data-seed-user-color-scheme="light"` 속성을 붙이고 `@seed-design/css/all.css`를 앱 전역에 import하는 것을 전제로 한다. 이 프로젝트는 `app/layout.tsx`(루트 레이아웃)가 공개 랜딩페이지(`app/c/[slug]`)와 `/admin`을 모두 감싸므로, 그대로 따르면 seed의 리셋 CSS가 공개 페이지에도 영향을 준다.

**결정:** 루트 레이아웃(`app/layout.tsx`)은 건드리지 않는다. 대신 `app/admin/layout.tsx`에서:
- `data-seed`, `data-seed-color-mode="light"`, `data-seed-user-color-scheme="light"` 속성을 가진 wrapper `<div>`로 `<Sidebar />`와 `children`을 감싼다 (라이트 모드 고정이므로 시스템 다크모드 감지 스크립트는 필요 없다)
- `@seed-design/css/all.css`를 이 레이아웃 파일에서만 import한다

**검증 필요 사항 (구현 착수 시 가장 먼저 확인):** seed-design의 CSS 커스텀 프로퍼티가 `[data-seed]` 속성 선택자로 스코핑되어 있어서 `<html>`이 아닌 하위 `<div>`에도 정상 적용되는지 확인한다.
- **된다면:** 위 설계대로 진행.
- **안 된다면** (예: `:root[data-seed]`처럼 루트에 고정된 선택자라면): `data-seed*` 속성을 `app/layout.tsx`의 `<html>`로 옮기고, `@seed-design/css/all.css`의 리셋 규칙이 공개 랜딩페이지(`app/c/[slug]`, `app/page.tsx`)의 기존 스타일과 충돌하지 않는지 별도로 브라우저에서 확인하는 단계를 추가한다.

## 컴포넌트 매핑

| 현재 | seed-design 교체 |
|---|---|
| `StatusBadge.tsx` (상태별 색상 `<span>`) | `@seed-design/react`의 `Badge` — draft/published/archived를 seed의 tone(예: `neutral`/`positive`/`informative`)으로 매핑 |
| `CopyLinkButton.tsx`, `StatusActionButton.tsx`, `DuplicateButton.tsx` | CLI `ui:action-button` (텍스트/약한 variant) |
| `DeleteButton.tsx` | CLI `ui:action-button`의 negative/danger tone (있는 경우) 또는 가장 가까운 위험 강조 variant. `window.confirm()` 로직·문구는 변경 없음 |
| `PagesTable.tsx`의 리스트/행 레이아웃 | `@seed-design/react`의 `Box`/`VStack`/`HStack`/`Text` 조합으로 재구성 (seed에 데이터 테이블 컴포넌트가 없으므로 레이아웃 프리미티브로 직접 구성) |
| `Sidebar.tsx` 네비게이션 링크 | CLI `ui:action-button`(텍스트 variant) 또는 seed 인터랙션 토큰을 적용한 `Link`. **로고와 `navy-950` 배경은 변경하지 않음** |
| `app/login/page.tsx`의 `<input>`/`<button>` | CLI `ui:text-field`(비밀번호 입력), `ui:action-button`(제출 버튼) |

## 데이터 흐름 & 에러 처리

순수 UI 교체 작업이라 API 호출, 상태 관리(`useState`, `fetch`, `router.refresh()`) 로직은 전혀 바뀌지 않는다. 각 클라이언트 컴포넌트의 로직은 그대로 두고 렌더링되는 JSX만 seed 컴포넌트로 교체한다. 에러 메시지 표시(`<p className="text-red-600">...</p>`)도 seed의 `Text`(negative tone 등) 컴포넌트로 스타일만 바꾼다.

## 검증

이 프로젝트에는 자동화 테스트가 없다. 기존 컨벤션대로:
- `npm run lint`, `npx tsc --noEmit` 클린 확인
- 브라우저 수동 확인 (로그인 → 대시보드 → 상태별 배지/버튼 → 발행된 URL 목록)

에이전트 세션 샌드박스에서는 `next/font/google` 네트워크 이슈로 페이지 렌더링이 안 될 수 있다는 게 이전 작업에서 확인된 바 있다 — 이 경우 사용자 로컬 터미널에서 `npm run dev`로 직접 확인한다.

## 범위 밖 (YAGNI)

- 페이지 에디터(`/admin/new`, `/admin/[id]/edit`, Tiptap 리치텍스트, 블록 편집기 전체) — 별도 스펙으로 분리
- 다크모드 지원
- `DeleteButton`의 확인 UX를 seed Alert Dialog로 교체
- 공개 랜딩페이지(`app/c/[slug]`, `app/page.tsx`)의 디자인 변경
