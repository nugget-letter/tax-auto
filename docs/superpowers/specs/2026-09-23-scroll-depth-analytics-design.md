# 스크롤 도달률 트래킹 설계

작성일: 2026-09-23

## 배경

발행된 페이지 링크(`/c/[slug]`)는 세무사 개인 카카오 채널을 통해 그 세무사의 고객들에게
**동일한 링크 하나로** 일괄 발송된다. 지금은 발송(`pages.sent_on`)과 폼 제출(`customers`)만
남고, 그 사이에 무슨 일이 있었는지 — 열어보긴 했는지, 어디까지 읽고 나갔는지 — 가 없다.

글이 길어서 안 읽히는 것인지, 열지도 않는 것인지 구분이 안 되면 페이지를 고칠 근거가 없다.

## 결정

### 왜 GA가 아닌가

GA4 기본 스크롤 측정은 90% 한 지점에서만 찍힌다. 25/50/75를 보려면 어차피 커스텀 이벤트를
직접 짜야 해서, 스크롤 계산 코드는 자체 구현과 동일하고 전송 대상만 달라진다.

자체 기록을 택하면 `pages`/`customers`와 **바로 조인**할 수 있다. "이 페이지를 끝까지 읽은
사람 중 폼을 제출한 비율"은 GA로는 거의 뽑을 수 없고, 여기서는 SQL 한 줄이다. GA를 빼면서
실제로 잃는 것은 스크롤뎁스가 아니라 유입 채널 자동 분류와 봇 필터링인데, 유입 경로가
카카오 채널 하나로 고정된 이 구조에서는 둘 다 가치가 거의 없다.

### 무엇을 식별하고 무엇을 포기하는가

동일 링크가 일괄 발송되므로 URL에 수신자 정보가 없다. **누가 읽었는지는 원천적으로 불가능**
하고, 페이지(=세무사) 단위 집계만 만든다. 부수적으로 개인정보를 수집하지 않게 된다.

식별자는 두 개다.

| 식별자 | 수명 | 저장 위치 | 의미 |
|---|---|---|---|
| `visit_id` | 페이지 로드 1회 | 메모리 | 열람 **횟수** |
| `reader_id` | 기기 영구 | `localStorage` | 열람 **인원** |

카카오톡 대화방에서 같은 링크를 세 번 누르면 `visit_id` 3개, `reader_id` 1개 →
"3회 열람 / 1명"이 된다. 카톡 특성상 재클릭이 흔해서 이 구분이 없으면 인원이 부풀려진다.

### 기록 방식: 진입 시 INSERT + 이후 UPSERT

세 가지 안을 검토했다.

- **A. 마일스톤마다 1행** — 퍼널이 바로 나오지만 방문당 행이 5배.
- **B. 이탈 시 1행 요약** — 가장 싸지만 그 한 번을 놓치면 방문이 통째로 증발한다.
- **C. 진입 시 1행 + 덮어쓰기** — 채택.

**B를 탈락시킨 이유가 이 프로젝트의 핵심 제약이다.** 트래픽이 사실상 전부 카카오톡 인앱
브라우저인데, 여기서는 `X` 버튼 종료·앱 전환 등으로 이탈 시점 전송이 유실될 확률이 일반
브라우저보다 훨씬 높다. C는 진입만으로 이미 1행이 남으므로, 최악의 경우에도 잃는 것은
도달률 갱신이지 방문 자체가 아니다. 행 수는 B와 같은 방문당 1행을 유지한다.

## 수집 (클라이언트)

### 신호원

`components/public/ReadingProgressBar.tsx`가 이미 `requestAnimationFrame` 루프에서
스크롤 진행률 0~1을 계산하고 있다(`progressRef.current`). **새 스크롤 리스너를 만들지 않고
이 값을 재사용한다.** 기존 `update()` 안에서 훅이 내려준 콜백을 호출하는 방식이다.

이 컴포넌트는 `page.status === "published"`일 때만 렌더링된다(`app/c/[slug]/page.tsx`).
즉 어드민 미리보기는 별도 분기 없이 트래킹에서 자동으로 빠진다.

> **알려진 결합:** 프로그레스 바를 제거하면 트래킹도 함께 죽는다. 렌더링 조건이 트래킹
> 조건("발행된 페이지만")과 정확히 일치해서 지금은 이득이지만, 바를 없애게 되면 스크롤
> 계산 루프를 훅으로 분리해야 한다.

### 짧은 페이지 처리

화면에 다 들어오는 페이지는 `scrollHeight - innerHeight`가 0이라 진행률이 영원히 0이다.
그대로 두면 짧은 페이지가 전부 "0% 이탈"로 집계된다.
**`scrollHeight <= clientHeight`이면 즉시 100%로 기록한다.**

### 이탈 감지

`visibilitychange`(→`hidden`)와 `pagehide`를 **둘 다** 건다. 카카오톡 인앱 브라우저의
`X` 버튼 종료 시 iOS에서는 `pagehide`만 발생하는 경우가 있다. `beforeunload`는 iOS에서
신뢰할 수 없어 쓰지 않는다. 두 이벤트가 모두 오는 경우를 대비해 `ref` 플래그로 중복 전송을
막는다.

### 전송

`navigator.sendBeacon`, 실패하거나 없으면 `fetch(url, { keepalive: true })`로 폴백한다.
일반 `fetch`는 페이지가 죽으면 요청도 같이 죽어서, 끝까지 읽고 닫은 방문 — 가장 중요한
데이터 — 을 놓친다.

### 식별자 발급

```ts
const READER_KEY = "nugget_rid";

function getReaderId(): string | null {
  try {
    let id = localStorage.getItem(READER_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(READER_KEY, id);
    }
    return id;
  } catch {
    return null; // 스토리지 차단 환경 → 방문만 기록하고 계속 진행
  }
}

function randomId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
}
```

두 방어가 모두 필수다.

- **`crypto.randomUUID` 폴백** — 구형 안드로이드 WebView(Chrome 92 미만)에 없다. 국내
  사용자층에서 무시 못 할 비율이고, 폴백이 없으면 해당 기기는 트래킹이 통째로 죽는다.
- **`try/catch`** — iOS 프라이빗 모드 등에서 `localStorage.getItem`은 값을 못 읽는 게
  아니라 **예외를 던진다.** 감싸지 않으면 그 줄에서 스크립트 전체가 멈춘다.

### 체류시간

마운트 시각부터 누적하되, `hidden` 구간은 제외한다(카톡에서 다른 대화방으로 갔다가
돌아오는 시간을 읽은 시간으로 치지 않는다). 매 전송마다 현재까지의 누적값을 함께 보낸다.

### 전송 시점 정리

| 시점 | 내용 |
|---|---|
| 마운트 직후 | `depth: 0` (짧은 페이지면 `100`) |
| 25/50/75/100% 최초 통과 | 해당 `depth` + 누적 체류시간 |
| `hidden` / `pagehide` (최초 1회) | 최종 `depth` + 최종 체류시간 |

방문당 최대 6회, 각 200바이트 미만.

## 수신 (서버)

`POST /api/track` — 신규.

- `trackSchema`(zod)로 검증: `slug`, `visitId`, `readerId`(nullable), `depth`(0·25·50·75·100),
  `dwellMs`(0 이상, **6시간 상한**). 상한은 방치된 탭이나 조작된 값이 평균 체류시간을
  망가뜨리는 것을 막는다.
- 기존 `getPageBySlug`로 조회해 **발행 상태인 페이지만** 허용. 아니면 `404`.
- 검증 실패 `400`, 성공 `204`(본문 없음 — beacon은 응답을 읽지 않는다).

> **인증을 붙일 수 없다.** 공개 페이지에서 호출하므로 `/api/submissions`의
> `SUBMISSION_TOKEN` 패턴을 쓸 수 없다(클라이언트에 심는 순간 공개된다). 방어선은
> "발행된 슬러그만 허용 + 값 범위 제한"까지이고, 작정하고 숫자를 부풀리는 것은 막지
> 못한다. 내부 마케팅 지표용으로는 이 수준이 적정선이다. 더 조이려면 IP당 쓰로틀이
> 필요하지만 지금 단계에서는 과하다.

### 도달률은 줄어들지 않아야 한다

전송이 순서대로 도착한다는 보장이 없다(50% 전송이 100% 전송보다 늦게 도착할 수 있다).
읽고-쓰기로 처리하면 경합이 생기므로, Postgres 함수에서 `greatest()`로 원자적으로 갱신한다.

```sql
create or replace function record_page_view(
  p_page_id uuid, p_visit_id uuid, p_reader_id text,
  p_depth smallint, p_dwell_ms integer
) returns void as $$
  insert into page_views (visit_id, page_id, reader_id, max_depth, dwell_ms)
  values (p_visit_id, p_page_id, p_reader_id, p_depth, p_dwell_ms)
  on conflict (visit_id) do update set
    max_depth  = greatest(page_views.max_depth, excluded.max_depth),
    dwell_ms   = greatest(page_views.dwell_ms, excluded.dwell_ms),
    updated_at = now();
$$ language sql;
```

## 저장

```sql
create table if not exists page_views (
  visit_id   uuid primary key,
  page_id    uuid not null references pages(id) on delete cascade,
  reader_id  text,
  max_depth  smallint not null default 0 check (max_depth between 0 and 100),
  dwell_ms   integer  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table page_views enable row level security;

create index if not exists page_views_page_id_idx on page_views (page_id, created_at desc);
```

기존 테이블과 같이 서비스 롤로만 접근하므로 RLS는 정책 없이 켠다.
`on delete cascade` — 페이지를 지우면 통계도 같이 지운다.

집계는 뷰로 고정해 화면 쪽에서 N+1 쿼리가 생기지 않게 한다.

```sql
create or replace view page_view_stats as
select
  page_id,
  count(*)                                                   as views,
  count(distinct coalesce(reader_id, visit_id::text))         as readers,
  count(*) filter (where max_depth >= 25)                     as reached_25,
  count(*) filter (where max_depth >= 50)                     as reached_50,
  count(*) filter (where max_depth >= 75)                     as reached_75,
  count(*) filter (where max_depth >= 100)                    as reached_100,
  avg(dwell_ms)::integer                                      as avg_dwell_ms
from page_views
group by page_id;
```

`coalesce(reader_id, visit_id::text)` — 스토리지가 막혀 `reader_id`가 없는 방문을 버리지
않고 1명으로 계산한다. 버리면 그 기기들이 인원에서 통째로 사라진다.

## 화면

어드민 사이드바에 **"열람 분석"** 탭을 추가한다(`/admin/analytics`, "발행된 URL" 다음).

```
열람 분석

┌──────────────────────────────────────────────────────────────────────┐
│ 페이지            발송일    열람      25%   50%   75%  완독   체류  신청 │
├──────────────────────────────────────────────────────────────────────┤
│ 3월 부가세 안내   09-15   142회/108명  61%  38%  22%  13%  1:48   6건 │
│                                        ▓▓▓▓▓▓░░░░░░░░░░              │
│ 종합소득세 사전…  09-08    97회/ 81명  74%  55%  41%  29%  2:31   9건 │
│                                        ▓▓▓▓▓▓▓▓▓▓▓░░░░              │
└──────────────────────────────────────────────────────────────────────┘
```

- **발행된 페이지만** 표시. 정렬은 발송일 최신순(`sent_on` 없으면 `published_at`).
- 도달률 퍼센트의 분모는 열람 **횟수**(`views`)다. 인원 기준으로 바꾸면 같은 사람의
  재방문 중 가장 깊이 읽은 것만 세야 해서 계산이 복잡해지고, "얼마나 읽히는 글인가"를
  보는 목적에는 횟수 기준이 더 직접적이다. 인원은 규모를 보는 용도로 함께 표시한다.
- 퍼센트 아래 가로 막대로 25→100% 감소 추이를 시각화한다.
- 신청 건수는 `customers.source_page_id` 집계. 발송 전(`sent_on` 없음)인 페이지는
  발송일을 `-`로 표시한다.
- 데이터가 하나도 없는 페이지는 `0회`로 표시하고 숨기지 않는다 — "안 읽힌 것"도 정보다.
- 화면 상단에 한 줄 안내를 둔다: *"카카오톡 인앱 브라우저 특성상 실제 인원보다 적게
  집계될 수 있어요. 발송 간 비교 용도로 봐주세요."*

## 정확도에 대한 전제

`readers`는 **실제 인원의 하한선**이다. 과대집계는 구조상 발생하지 않고 과소집계만 있다.

- 카톡에서 읽고 나중에 다른 브라우저로 다시 열면 2명으로 잡힌다.
- 안드로이드 카톡은 앱 데이터 삭제 전까지 유지되지만, **iOS 카톡 인앱 브라우저는 스토리지
  보존이 보장되지 않는다.** iOS 비중만큼 낮게 나온다.
- 스토리지 차단 기기는 방문 1건이 곧 1명이 된다.

오차 방향이 한쪽으로 일정하므로 절대값은 신뢰하기 어렵지만, 페이지 간·발송 간 비교는
유효하다. 화면 안내 문구는 이 전제를 사용자에게 그대로 전달하기 위한 것이다.

## 파일

| 파일 | 변경 |
|---|---|
| `supabase/schema.sql` | `page_views` 테이블, `record_page_view` 함수, `page_view_stats` 뷰 |
| `lib/analytics/types.ts` | `trackSchema`, `PageStats` 타입, 마일스톤 상수 |
| `lib/analytics/depth.ts` | 순수 함수 — 진행률에서 통과한 마일스톤 계산 |
| `lib/analytics/depth.test.ts` | 신규 테스트 |
| `lib/analytics/reader.ts` | 클라이언트 — `visit_id`/`reader_id` 발급, beacon 전송 |
| `lib/analytics/repository.ts` | `recordPageView`(RPC 호출), `getPageStats` |
| `app/api/track/route.ts` | 신규 |
| `components/public/useScrollTracking.ts` | 신규 훅 — 마일스톤 판정, 체류시간, 이탈 감지 |
| `components/public/ReadingProgressBar.tsx` | `update()`에서 훅 콜백 호출 (수정 ~5줄) |
| `app/admin/analytics/page.tsx` | 신규 화면 |
| `components/analytics/StatsTable.tsx` | 신규 표 |
| `components/admin/Sidebar.tsx` | `NAV_ITEMS`에 "열람 분석" 추가 |

## 에러 처리

- **트래킹 전송 실패는 전부 무시한다.** 통계 때문에 독자에게 오류가 보이거나 페이지가
  멈추면 안 된다. 모든 전송은 `try/catch`로 감싸고 실패 시 조용히 넘어간다.
- `/api/track` 저장 실패: 서버 로그만 남기고 `204`로 응답한다. 클라이언트가 할 수 있는
  일이 없고, beacon은 재시도하지 않는다.
- 통계 조회 실패: 표 자리에 "통계를 불러오지 못했어요"를 표시하고 화면은 유지한다.

## 테스트

`lib/analytics/depth.test.ts` (vitest):

- 0.2 → 0.6 이동 시 25%, 50% 두 개가 통과로 잡힌다.
- 이미 통과한 마일스톤은 다시 잡히지 않는다(위로 스크롤 후 재하강).
- 진행률 1.0에서 100%가 포함된다.
- 스크롤 불가 페이지는 즉시 100%.

`trackSchema` 단위 테스트: 잘못된 `depth`(예: 33) 거부, 음수 `dwellMs` 거부, 6시간 초과
거부, `readerId: null` 통과.

인앱 브라우저 동작(beacon 도착, `pagehide` 발화)은 자동 테스트가 불가능하므로, 배포 후
실제 카카오톡으로 링크를 열어 `page_views` 행이 쌓이는지 수동 확인한다.

## 범위 밖

- 수신자별 추적(`/c/slug?r=...`) — 카카오 채널이 일괄 발송이라 현재 불가능. 개별 발송
  수단이 생기면 `page_views`에 칼럼 하나만 추가하면 된다.
- 블록 단위 도달률("어느 블록에서 이탈했나"), 체류 히트맵, 실시간 대시보드.
- 개인정보처리방침 고지 문구 — 현재 페이지에 정책 섹션 자체가 없어 붙일 자리가 없다.
  `reader_id`는 무작위 값이라 개인정보는 아니지만 기기 식별자에는 해당하므로, 정책
  페이지를 만들 때 함께 다룬다.
- 기간 필터, CSV 내보내기, 봇 제외 로직(현재 JS 실행이 전제라 단순 크롤러는 자동 제외됨).
