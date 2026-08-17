# 랜딩페이지 생성기 - 에디터/공개페이지 기능 확장 설계

## 배경 및 목표

`docs/superpowers/specs/2026-08-09-landing-page-generator-design.md`에서 설계한 랜딩페이지 생성기는 이미 구현되어 운영 중이다. 이번 작업은 그 위에 다음 세 가지를 추가한다.

1. **사본 만들기(복제)**: 대시보드에서 기존 페이지를 원클릭으로 복제해, 비슷한 페이지를 처음부터 다시 만들지 않아도 되게 한다.
2. **구분선 블록**: 배너/텍스트/CTA 블록 사이에 시각적 구분선을 넣을 수 있게 한다.
3. **스크롤 인터랙션**: 공개 랜딩페이지(`/c/[slug]`)에서 블록이 스크롤로 화면에 들어올 때 애니메이션 효과를 줄 수 있게 한다. 효과는 블록마다 개별 선택한다.

세 기능 모두 기존 아키텍처(Next.js App Router + Supabase, 블록 조립식 에디터)를 그대로 확장하며, 새 외부 의존성은 추가하지 않는다.

## 1. 사본 만들기(복제)

### API

`POST /api/pages/[id]/duplicate` 신규 라우트 추가.

- `requireAdminSession`으로 인증 확인 (기존 라우트와 동일 패턴).
- `getPageById(id)`로 원본 조회 — 없으면 404.
- 새 페이지를 다음 값으로 `createPage()` 호출해 생성:
  - `title`: `"{원본 제목} (사본)"`
  - `slug`: `generateSlug()`로 새로 발급 (원본 슬러그 재사용 안 함)
  - `blocks`: 원본 `blocks` 배열을 그대로 복사 (배너 이미지 URL 포함 — Storage 파일을 별도 복제하지 않고 같은 파일을 참조)
  - `status`: `"draft"` 고정 (원본 상태와 무관하게 항상 임시저장으로 시작)
- 슬러그 충돌 시(8자 랜덤이라 사실상 발생하지 않음) 기존 `createPage`/`SlugConflictError`와 동일하게 409 응답.
- 성공 시 201 + 새 `PageRecord` 반환.

### UI

- `components/dashboard/PagesTable.tsx`의 각 행에 "복제" 버튼 추가 — 위치는 `[URL 복사] [수정] [복제] [상태 액션]` 순서.
- 새 클라이언트 컴포넌트 `components/dashboard/DuplicateButton.tsx`. `StatusActionButton`과 동일한 패턴(loading state, 실패 시 인라인 에러 메시지)으로 구현.
- 클릭 시 `POST /api/pages/[id]/duplicate` 호출 → 성공하면 목록을 갱신하지 않고 곧바로 `router.push(`/admin/${새id}/edit`)`로 이동해 사본을 바로 수정할 수 있게 한다.

### 스코프

- Supabase `pages` 테이블 스키마 변경 없음.
- 배너 이미지 파일 자체는 복제하지 않는다 — 원본 이미지가 삭제/교체되면 사본에도 영향을 주지만, 이번 스코프에서는 허용한다(내부 소규모 도구 특성상 과설계 방지).

## 2. 구분선 블록

### 데이터 모델

`lib/pages/types.ts`의 `blockSchema` 유니온에 새 타입 추가:

```ts
export const dividerBlockSchema = z.object({
  type: z.literal("divider"),
  scrollEffect: scrollEffectSchema.optional(), // 3절 참고
});
```

색상/두께/여백 등 커스텀 옵션은 없다 — 고정 스타일(옅은 회색 얇은 선 + 상하 여백)로 렌더링해, 기존 디자인 가이드("색 최소화, 선과 여백으로 위계 표현")를 그대로 따른다.

### 에디터 UI

- `components/editor/BlockList.tsx`의 "+ 블록 추가" 옵션에 "구분선" 추가 (배너/텍스트/CTA/구분선 4종).
- 새 컴포넌트 `components/editor/DividerBlockEditor.tsx` — 편집할 필드가 없으므로 "구분선 — 편집할 내용 없음" 정도의 안내 텍스트만 표시. 3절의 `ScrollEffectSelect`는 여기에도 배치한다.
- 다른 블록과 동일하게 위/아래 이동, 삭제 버튼을 그대로 사용한다(`BlockList`가 공통 처리).

### 공개 페이지 렌더링

- 새 컴포넌트 `components/public/DividerBlock.tsx` — `<hr>` 기반, 다른 블록과 동일한 좁은 중앙 컬럼(`max-w-xl`) 안에서 렌더링.
- `app/c/[slug]/page.tsx`의 블록 렌더링 분기에 `block.type === "divider"` 케이스 추가.

## 3. 스크롤 인터랙션

### 데이터 모델

공통 스키마를 만들어 4개 블록 스키마(배너/텍스트/CTA/구분선)에 모두 추가한다:

```ts
export const scrollEffectSchema = z
  .enum(["none", "fade", "fade-up", "slide-left", "slide-right", "scale"])
  .default("none");
```

각 블록 스키마에 `scrollEffect: scrollEffectSchema.optional()` 필드를 추가한다. 값이 없거나 `"none"`이면 효과 없음으로 취급 — 기존에 저장된 블록(이 필드가 아예 없는 데이터)과 하위 호환되며 별도 마이그레이션이 필요 없다.

효과별 의미:

| 값 | 효과 |
|---|---|
| `none` | 없음 (기본값) |
| `fade` | 페이드인 |
| `fade-up` | 페이드인 + 아래에서 위로 살짝 상승 |
| `slide-left` | 왼쪽에서 슬라이드 등장 |
| `slide-right` | 오른쪽에서 슬라이드 등장 |
| `scale` | 축소된 상태에서 원래 크기로 확대되며 등장 |

### 에디터 UI

- 공통 컴포넌트 `components/editor/ScrollEffectSelect.tsx` 신규 작성 — `value`/`onChange` props를 받는 단순 `<select>`. 라벨: 없음 / 페이드인 / 페이드인+상승 / 슬라이드(왼쪽에서) / 슬라이드(오른쪽에서) / 확대.
- `BannerBlockEditor`, `TextBlockEditor`, `CtaBlockEditor`, `DividerBlockEditor` 4개 모두에 이 컴포넌트를 배치해 블록별로 독립적으로 선택 가능하게 한다.

### 공개 페이지 렌더링

- 새 클라이언트 컴포넌트 `components/public/ScrollReveal.tsx`:
  - props: `effect: ScrollEffect`, `children`.
  - `effect`가 `"none"`이거나 없으면 옵저버를 만들지 않고 `children`을 그대로 렌더링(오버헤드 없음).
  - 그 외의 경우 루트 엘리먼트에 `IntersectionObserver`를 붙이고, 뷰포트에 처음 들어오는 순간 "revealed" 상태로 전환한 뒤 즉시 `unobserve()`한다 — **최초 1회만 재생**, 이후 다시 스크롤해도 재생되지 않는다.
  - 초기 상태(관찰 시작 전)는 CSS로 "보임" 상태를 기본값으로 하고, JS가 로드되어 옵저버가 붙는 순간에만 "숨김 → 보임"으로 전환한다(progressive enhancement) — JS 비활성/로드 지연 상황에서도 콘텐츠가 안 보이는 사고를 방지한다.
  - `prefers-reduced-motion: reduce`인 환경에서는 애니메이션 없이 바로 최종 상태로 표시한다(Tailwind `motion-reduce:` 유틸 사용).
- `app/c/[slug]/page.tsx`에서 각 블록(배너/텍스트/CTA/구분선)을 렌더링할 때 `<ScrollReveal effect={block.scrollEffect}>...</ScrollReveal>`로 감싼다.
- 구현은 CSS transition + `IntersectionObserver`만 사용한다. framer-motion 등 애니메이션 라이브러리는 추가하지 않는다 — 기존 스펙의 "내부 소규모 도구, 미니멀 의존성" 기조를 유지하고 번들 크기에 영향을 주지 않기 위함이다.

## 에러 핸들링

- 복제 API 실패(인증 만료, 슬러그 충돌, 서버 오류)는 기존 저장 API와 동일하게 인라인 에러 메시지로 표시하고 자동 재시도는 하지 않는다.
- 스크롤 인터랙션은 순수 시각 효과이므로 어떤 이유로든 실패해도 콘텐츠 자체는 항상 보여야 한다 — 위 progressive enhancement 방식으로 이를 보장한다.

## 테스트 계획

기존 스펙과 동일하게 자동 테스트(`next build`, `tsc --noEmit`, `eslint`)와 수동 QA로 검증하며, 별도 유닛 테스트 프레임워크는 도입하지 않는다. 이번 기능에 대한 수동 QA 추가 항목:

- 대시보드에서 페이지 복제 → 제목에 "(사본)" 접미사, 임시저장 상태, 새 슬러그로 생성되는지, 수정화면으로 자동 이동하는지
- 구분선 블록 추가/삭제/위아래 순서변경이 다른 블록과 동일하게 동작하는지
- 블록별로 스크롤 효과를 다르게 선택해 저장 → 공개 페이지에서 각 효과(페이드인/페이드인+상승/좌우 슬라이드/확대)가 의도대로 재생되는지
- 같은 블록을 여러 번 스크롤해서 지나가도 애니메이션이 최초 1회만 재생되는지
- OS/브라우저의 "동작 줄이기(reduced motion)" 설정 시 애니메이션이 생략되고 바로 최종 상태로 보이는지
- 기존에 `scrollEffect` 필드가 없는 과거 데이터가 공개 페이지에서 에러 없이 "효과 없음"으로 정상 렌더링되는지

## 스코프 제외

- 배너 이미지 파일 자체의 복제(Storage 파일 복사)
- 구분선 블록의 색상/두께/여백 커스텀
- 스크롤 인터랙션 효과 추가 커스터마이징(속도, easing 등 세부 파라미터 조정 UI) — 4종 프리셋 중 선택만 가능
- 스크롤할 때마다 반복 재생되는 옵션(최초 1회 고정)
