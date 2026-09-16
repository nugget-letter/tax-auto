# 고객 신청 관리 (Customer Applications) 설계

작성일: 2026-09-16

## 배경

지금은 랜딩페이지 CTA가 Google Form으로 연결되고, 신청 내역이 Google Sheet에 쌓인다.
시트 컬럼은 `접수시각 · 이름 · 사무실 · 연락처 · 이메일 · 동의 · 유입경로`(폼 입력)와
`한 달 무료 체험 시작일 · 카카오 관리자 설정 · 리마인드 1차 · 리마인드 2차`(운영자가 직접 기록)로 나뉜다.

운영자가 어드민 안에서 신청 고객을 보고, 정보를 고치고, 직접 추가하고 싶어 한다.

## 결정

- **폼을 이 서비스로 옮긴다.** 랜딩페이지에 "신청 폼" 블록을 추가하고, 제출은 Supabase `customers`에 바로 들어간다.
  어드민이 유일한 원본(source of truth)이 되며, 시트 동기화는 하지 않는다.
- 기존 시트 데이터는 **1회성 CSV 임포트 스크립트**로 옮긴다. 어드민에 업로드 UI는 만들지 않는다.
- 체험 종료 알림은 **어드민 화면 안에서만** 표시한다. 이메일/슬랙 발송은 범위 밖.

## 1. 데이터 모델

`supabase/schema.sql`에 추가한다. `pages`와 같은 정책: 서비스 롤 키로만 접근, RLS 켜고 정책 없음.

```sql
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  name text not null,
  office text not null default '',
  phone text not null,
  email text not null default '',
  consented boolean not null default false,
  source text not null default '',
  source_page_id uuid references pages(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'trial', 'converted', 'churned')),
  trial_started_on date,
  kakao_admin_set_on date,
  reminded_1_on date,
  reminded_2_on date,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table customers enable row level security;
create index if not exists customers_submitted_at_idx on customers (submitted_at desc);
create index if not exists customers_status_idx on customers (status);
```

| 컬럼 | 출처 | 비고 |
|---|---|---|
| `submitted_at` | 폼 제출 시각 / 시트 접수시각 | 수동 추가 시 현재 시각 |
| `name`, `phone` | 폼, 필수 | `phone`은 숫자와 하이픈만 남겨 저장 |
| `office`, `email` | 폼, 선택 | |
| `consented` | 폼 | 개인정보 수집 동의. 폼 제출은 `true`여야만 통과 |
| `source` | 자동 → 관리자 수정 가능 | 폼 제출 시 신청한 페이지 제목. 수동 추가 기본값 "직접 추가". 시트 임포트는 시트 값(비면 "Google Form") |
| `source_page_id` | 자동 | 신청한 랜딩페이지. 페이지 삭제 시 null |
| `status` | 관리자 | `new`(신규) → `trial`(체험중) → `converted`(전환) / `churned`(이탈) |
| `trial_started_on` | 관리자 | 한 달 무료 체험 시작일 |
| `kakao_admin_set_on`, `reminded_1_on`, `reminded_2_on` | 관리자 | "완료한 날짜". null이면 미완료 |
| `memo` | 관리자 | 자유 메모 |

규칙:
- 중복 제출 방지 없음. 같은 사람의 재신청도 기록으로 남기고 관리자가 판단한다.
- `trial_started_on`이 null → 값으로 바뀌는 저장에서 `status`가 `new`이면 `trial`로 자동 전환한다. 다른 상태면 건드리지 않는다. 이 로직은 repository(서버)에 둔다.
- **체험 종료일** = `trial_started_on + 30일`. DB에 저장하지 않고 계산한다.
- **종료 임박** = `status = 'trial'`이고 오늘이 종료일 기준 `-7일 ~ +3일` 사이.

타입/스키마는 `lib/customers/types.ts`에 zod로 정의한다 (`customerStatusSchema`, `customerInputSchema`, `submissionSchema`, `CustomerRecord`).
repository는 `lib/customers/repository.ts` (`listCustomers`, `getCustomerById`, `createCustomer`, `updateCustomer`, `deleteCustomer`).
날짜 계산은 `lib/customers/trial.ts` (`getTrialEndsOn`, `getTrialDDay`, `isTrialEndingSoon`) — 순수 함수, 단위 테스트 대상.

## 2. 신청 폼 블록

### 블록 타입 (`lib/pages/types.ts`)

```ts
formBlockSchema = z.object({
  type: z.literal("form"),
  title: z.string().optional(),            // 예: "한 달 무료로 써보기"
  buttonLabel: z.string().min(1),          // 기본 "신청하기"
  buttonColor: #RRGGBB,                    // CTA와 동일 규칙
  consentText: z.string().min(1),          // 기본 "개인정보 수집·이용에 동의합니다"
  successMessage: z.string().min(1),       // 기본 "신청이 접수됐어요. 곧 연락드릴게요!"
  scrollEffect: scrollEffectSchema.optional(),
})
```
`blockSchema` discriminatedUnion에 추가. `pageInputSchema`에 "form 블록은 최대 1개" refine을 건다.

### 에디터 (`components/editor/FormBlockEditor.tsx`)

`CtaBlockEditor`와 같은 카드 형태. 위 항목들을 입력 + `ScrollEffectSelect`.
`BlockList`의 블록 추가 줄에 "신청 폼" 버튼을 넣고, 이미 form 블록이 있으면 비활성화한다.
`SortableBlockItem`의 타입 분기에 form 추가.

### 공개 렌더링 (`components/public/FormBlock.tsx`, client component)

필드: 이름* · 사무실 · 연락처* (`type="tel"`) · 이메일 (`type="email"`) · 동의 체크박스*
- 숨겨진 honeypot input (`name="website"`) 포함.
- 제출 중 버튼 비활성화. 성공 시 폼 전체가 `successMessage`로 교체. 실패 시 입력값 유지한 채 폼 아래 "잠시 후 다시 시도해주세요" 표시.
- props로 `pageSlug`, `block`, `isPublished`를 받는다. `isPublished=false`(관리자 미리보기)면 폼은 보이되 제출 버튼은 비활성화하고 "발행 후 제출할 수 있어요" 안내를 붙인다.
- `app/c/[slug]/page.tsx`의 분기와 `AUTO_BORDER_TYPES`/`SUBSTANTIVE_TYPES`에 `form` 추가.

### 제출 API (`app/api/submissions/route.ts`, POST, 인증 없음)

- body: `{ pageSlug, name, office, phone, email, consented, website }`
- honeypot(`website`)에 값이 있으면 저장하지 않고 `200 {ok:true}` 반환.
- `submissionSchema`로 검증. 실패 → `400 {error:"invalid_input"}`.
- `getPageBySlug(pageSlug)` → 없거나 `status !== 'published'` → `404`.
- `createCustomer({ ..., source: page.title, sourcePageId: page.id, status: 'new', submittedAt: now })` → `201`.
- 레이트리밋·캡차 없음.

## 3. 어드민 고객 관리

### 사이드바

`대시보드 · 고객 신청 · 발행된 URL · 새 페이지`. 활성 판정은 `pathname.startsWith` 로 바꿔 `/admin/customers/...` 하위에서도 메뉴가 켜지게 한다 (단 `/admin`은 정확히 일치).

### 목록 (`app/admin/customers/page.tsx`, 서버 컴포넌트, `force-dynamic`)

- 상단: 제목 "고객 신청", 우측 `[+ 고객 추가]` → `/admin/customers/new`
- **체험 종료 임박 섹션**: `isTrialEndingSoon`인 고객만. 없으면 섹션 숨김. 행마다 `D-3`/`D-day`/`D+2` 뱃지, 리마인드 1차/2차 완료 여부(✓/✗), `[열기]`.
- **필터 칩**: 전체 / 신규 / 체험중 / 전환 / 이탈, 각 건수 표시. URL 쿼리 `?status=`.
- **검색**: 입력 후 엔터/버튼 → `?q=`. 서버에서 `name, office, phone, email`에 `ilike`.
- **목록 행**: 상태 뱃지 + 이름 · 사무실 / 연락처 · 이메일 / 접수일 · 유입경로. `trial`이면 체험 기간과 D-day. 행 우측 `[열기]`.
- 정렬: `submitted_at desc`. 페이지네이션 없음.
- 스타일: 기존 `PagesTable`처럼 seed-design `Box/HStack/VStack/Text/Badge`.

컴포넌트: `components/customers/CustomersTable.tsx`, `CustomerStatusBadge.tsx`, `TrialDDayBadge.tsx`, `StatusFilterChips.tsx`, `CustomerSearch.tsx`(client), `EndingSoonSection.tsx`.

### 상세/수정 (`app/admin/customers/[id]/page.tsx`)

없는 id면 `notFound()`. 보기와 수정을 한 화면에서 한다 (`components/customers/CustomerForm.tsx`, client).

- 헤더: 이름, 상태 뱃지, 상태 셀렉트, `[삭제]`(확인 다이얼로그 후 `DELETE`, 목록으로 이동)
- 기본 정보: 이름* · 사무실 · 연락처* · 이메일 · 동의 여부(읽기전용) · 접수시각(읽기전용) · 유입경로(수정 가능). `source_page_id`가 있으면 아래에 "신청 페이지: {제목} →" 링크(`/admin/{id}/edit`).
- 진행: 체험 시작일 · 계산된 종료일 + D-day(읽기전용) · 카카오 관리자 설정 · 리마인드 1차 · 리마인드 2차. 날짜 필드마다 `<input type="date">` + `[오늘]` 버튼 + 지우기(×).
- 메모: textarea.
- `[저장]` → `PUT /api/customers/[id]` → 성공 시 목록으로. 실패 시 폼 상단에 에러 메시지, 입력값 유지.

### 추가 (`app/admin/customers/new/page.tsx`)

`CustomerForm`을 빈 값으로. 접수시각은 서버에서 현재 시각, 유입경로 기본 "직접 추가", 상태 기본 `new`. `POST /api/customers`.

### API (`app/api/customers/...`, 전부 `requireAdminSession`)

- `POST /api/customers` — `customerInputSchema` 검증 → `createCustomer` → `201`
- `PUT /api/customers/[id]` — 검증 → `updateCustomer` (trial 자동 전환 포함) → `200`
- `DELETE /api/customers/[id]` — `deleteCustomer` → `204`
- 실패 코드: `401 unauthorized`, `400 invalid_input`, `404 not_found`, `500 *_failed` (기존 pages API와 동일 형식)

## 4. 시트 임포트

`scripts/import-customers.ts`. `npx tsx scripts/import-customers.ts <csv> [--dry-run] [--force]`. `.env.local`을 읽어 Supabase에 직접 insert.

- 헤더 매핑: `접수시각→submitted_at, 이름→name, 사무실→office, 연락처→phone, 이메일→email, 동의→consented, 유입경로→source, 한 달 무료 체험 시작일→trial_started_on, 카카오 관리자 설정→kakao_admin_set_on, 리마인드 1차→reminded_1_on, 리마인드 2차→reminded_2_on`. 헤더는 앞뒤 공백 제거 후 비교.
- 날짜 파서(`parseSheetDate`): `2026. 9. 1`, `2026.09.01`, `2026-09-01`, `2026/9/1`, `9/1`(올해), `9월 1일`, 그리고 시트 타임스탬프 `2026. 9. 1 오후 3:24:10`. 실패 시 해당 필드만 null + 콘솔 경고. 행은 건너뛰지 않는다.
- 동의 파서(`parseConsent`): `예/네/동의/TRUE/true/Y/O/✓` → true, 그 외 false.
- 이름 또는 연락처가 빈 행은 건너뛰고 경고.
- `status`: 체험 시작일 있으면 `trial`, 없으면 `new`. `source`: 시트 값, 비면 `Google Form`. `source_page_id`: null.
- `--dry-run`: insert 없이 행별 결과 요약 출력. 실제 실행 전 반드시 한 번 돌린다.
- `customers`에 이미 행이 있으면 `--force` 없이는 중단한다 (중복 임포트 방지).

## 에러 처리

- 폼 제출 실패: 입력값 유지, 재시도 가능.
- 어드민 저장 실패: 에러 메시지 + 입력값 유지 (`PageEditorForm` 패턴).
- 랜딩페이지 삭제: `source_page_id`만 null, 고객 기록 유지.
- 알 수 없는 블록 타입 처리(`return null`)는 기존대로.

## 테스트

Vitest 추가 (`npm test`). 순수 로직만:
- `lib/customers/trial.test.ts` — 종료일, D-day, 임박 판정 경계값(-8/-7/0/+3/+4일, 시작일 없음, status≠trial).
- `lib/customers/types.test.ts` — 제출 스키마: 동의 false 거부, 이름/연락처 필수, 이메일 빈 값 허용·형식 오류 거부, 연락처 정규화.
- `scripts/import-customers.test.ts` — `parseSheetDate`, `parseConsent`, 헤더 매핑.
- UI·API·DB는 dev 서버에서 수동 확인: 폼 제출 → 목록 노출 → 수정 → 자동 trial 전환 → 임박 섹션 노출.

## 범위 밖

이메일/슬랙 알림 발송, 고객에게 자동 리마인드, 유입경로 선택지, 고객 CSV 내보내기, 페이지네이션, 레이트리밋/캡차.
