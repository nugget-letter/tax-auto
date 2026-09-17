# 페이지 전송 기록(전송일·태그) 설계

작성일: 2026-09-18

## 배경

랜딩페이지를 발행한 뒤 카카오톡 등으로 고객에게 링크를 보낸다. 지금은 "발행했다"는
사실만 남고 "언제 실제로 보냈는지", "누구에게 보냈는지"는 어디에도 기록되지 않는다.

## 결정

- 페이지 하나당 링크 하나이므로 **전송은 페이지당 한 번**이다. 전송 이력을 여러 건
  쌓는 구조(별도 테이블)는 만들지 않고 `pages`에 컬럼 두 개를 더한다.
- 수신자는 고객 레코드와 연결하지 않고 **자유 텍스트 태그**로 남긴다. 실제 발송이
  개별 고객 단위가 아니라 그룹 단위이기 때문이다.
- 태그는 통짜 문자열이 아니라 **배열**로 저장한다. 나중에 태그 기준 필터·집계를 하려면
  개별 값이어야 한다.
- `status`(draft/published/archived)는 건드리지 않는다. "전송됨"은 상태가 아니라
  `sent_on`이 채워졌는지로 판단한다 — 상태를 하나 더 늘리면 발행/보관과의 조합이
  복잡해지고, 기존 데이터 마이그레이션도 필요해진다.

## 1. 데이터 모델

`supabase/schema.sql`에 추가한다.

```sql
-- 2026-09-18 마이그레이션: 페이지 전송 기록.
alter table pages add column if not exists sent_on date;
alter table pages add column if not exists send_tags text[] not null default '{}';
create index if not exists pages_sent_on_idx on pages (sent_on desc);
```

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `sent_on` | `date`, nullable | 고객에게 실제로 보낸 날짜. 관리자가 직접 입력 |
| `send_tags` | `text[]`, 기본 `{}` | 누구에게 보냈는지 (`["세무사 1차", "강남지역"]`) |

`PageRecord`에 `sentOn: string | null`, `sendTags: string[]`가 더해진다.
날짜는 앱 전체 규칙대로 `"YYYY-MM-DD"` 문자열로 다룬다.

## 2. 뱃지 규칙

`components/dashboard/StatusBadge.tsx`가 `status` 하나만 받던 것을
`{ status, sentOn }`을 받도록 바꾼다.

| 조건 | 라벨 | tone |
|---|---|---|
| `status === "published"` 이고 `sentOn !== null` | **전송됨** | `informative` |
| `status === "published"` 이고 `sentOn === null` | 발행 | `positive` |
| `status === "draft"` | 임시저장 | `warning` |
| `status === "archived"` | 보관 | `neutral` |

대시보드 목록(`PagesTable`)과 발행된 URL(`/admin/published`) 양쪽에 같은 규칙이 적용된다.
대시보드의 그룹 구분(발행됨/임시저장/보관)은 `status` 기준 그대로 둔다 — 전송 여부는
행의 뱃지로만 드러난다.

## 3. 입력 화면 — `/admin/published`

링크를 복사해 실제로 보내는 화면이라 전송 기록도 여기서 한다.

```
[전송됨] 추석선물, 이렇게 안 챙기면…
         발행일 2026.09.02 · 전송일 [2026-09-10] [오늘] [×]
         [세무사 1차 ×] [강남지역 ×] [+ 태그 입력___]
         https://.../c/pl7dm35u              [링크 복사]
```

- 전송일은 고객 화면의 `components/customers/DateField.tsx`를 재사용한다
  (`<input type="date">` + `[오늘]` + 값이 있을 때 지우기 `×`). "오늘"은 Asia/Seoul 기준.
- 태그는 입력 후 Enter로 칩이 되고, 칩의 `×`로 지운다. 이미 쓰인 태그 전체를
  `<datalist>`로 자동완성 제안한다 — 같은 뜻의 태그가 오타로 갈라지는 것을 줄인다.
- **변경 즉시 자동 저장한다.** 저장 버튼을 따로 두지 않는다. 저장 중에는 해당 행을
  흐리게(`opacity`) 표시하고, 실패하면 행 안에 에러 문구를 남기며 값은 되돌리지 않는다
  (사용자가 다시 시도할 수 있게).
- 정렬은 **전송일이 있으면 전송일, 없으면 발행일** 기준 내림차순. 최근에 보낸 것이 위로 온다.

## 4. 서버

`PATCH /api/pages/[id]/send` 신규.

- `requireAdminSession` 필수. 실패 `401 {error:"unauthorized"}`.
- body `{ sentOn: string | null, sendTags: string[] }`, `pageSendSchema`로 검증:
  - `sentOn`: `YYYY-MM-DD` 또는 `null`
  - `sendTags`: 각 항목 1~50자, 최대 20개. 앞뒤 공백을 제거하고 빈 문자열은 버리며
    중복은 제거한다(입력 순서 유지).
- 검증 실패 `400 {error:"invalid_input", fieldErrors}`.
- 성공 `200 PageRecord`. 실패 `500 {error:"save_failed"}`.
- repository에 `updatePageSend(id, { sentOn, sendTags }): Promise<PageRecord | null>`
  (없는 id면 `null` → 404).

기존 `PATCH /api/pages/[id]`(에디터 전체 저장)는 그대로 둔다. 전송 정보를 별도
엔드포인트로 떼는 이유는 에디터 저장과 섞이지 않게 하기 위해서다 — 에디터는 블록 전체를
덮어쓰므로, 전송 정보까지 같은 요청에 실으면 두 화면이 서로의 변경을 지울 수 있다.

`pageInputSchema`(에디터 저장 body)에는 `sentOn`/`sendTags`를 넣지 않는다. 에디터
저장이 전송 기록을 건드리지 않아야 하므로, `updatePage`도 이 두 컬럼을 갱신하지 않는다.

## 에러 처리

- 자동 저장 실패: 행 안에 "저장에 실패했어요. 다시 시도해주세요." 표시, 입력값 유지.
- 없는 페이지: `404 {error:"not_found"}`.
- 태그 20개 초과 입력 시도: 클라이언트에서 더 추가되지 않게 막고 안내 문구를 띄운다.

## 테스트

`pageSendSchema` 단위 테스트: 날짜 형식/`null`, 태그 트림·빈 값 제거·중복 제거·순서 유지,
50자 초과 거부, 21개 거부. 뱃지 규칙 단위 테스트(`getPageBadge(status, sentOn)` 순수 함수로
분리해 4가지 조합 검증). UI·API는 dev 서버에서 수동 확인.

## 범위 밖 (다음 단계)

대시보드 상단 캘린더 뷰는 이 스펙의 데이터(`created_at`, `published_at`, `sent_on`)를
전제로 하는 별도 작업이다. 태그 기준 필터·집계, 고객 레코드와의 연결도 지금은 하지 않는다.
