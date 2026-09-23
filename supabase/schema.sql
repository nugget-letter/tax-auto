create extension if not exists pgcrypto;

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  blocks jsonb not null default '[]'::jsonb,
  cta_label text not null default '',
  cta_href text not null default '',
  cta_color text not null default '#FEE500',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

-- 앱은 서비스 롤 키로만 접근하므로 RLS는 정책 없이 켜두면 된다.
-- (서비스 롤은 RLS를 우회하고, anon 키로는 아무것도 읽거나 쓸 수 없게 된다.)
alter table pages enable row level security;

create index if not exists pages_updated_at_idx on pages (updated_at desc);

insert into storage.buckets (id, name, public)
values ('banner-images', 'banner-images', true)
on conflict (id) do nothing;

-- 2026-08-11 마이그레이션: 발행일 컬럼 추가.
-- 이미 pages 테이블이 있는 기존 프로젝트에서는 이 부분만 다시 실행해도 안전하다
-- (컬럼이 이미 있으면 건너뛰고, published_at이 비어있는 발행 상태 행만 채운다).
alter table pages add column if not exists published_at timestamptz;

update pages
set published_at = updated_at
where status = 'published' and published_at is null;

-- 2026-09-16 마이그레이션: 고객 신청(customers) 테이블.
-- 랜딩페이지 신청 폼 제출과 관리자 수동 추가가 여기 쌓인다. pages와 같이
-- 서비스 롤로만 접근하므로 RLS는 정책 없이 켠다.
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

-- 2026-09-18 마이그레이션: 페이지 전송 기록.
-- 발행(published_at)과 별개로, 실제로 고객에게 링크를 보낸 날짜와 수신 대상 태그를 남긴다.
alter table pages add column if not exists sent_on date;
alter table pages add column if not exists send_tags text[] not null default '{}';

create index if not exists pages_sent_on_idx on pages (sent_on desc);

-- 2026-09-23 마이그레이션: 스크롤 도달률 트래킹.
-- 발행된 페이지(/c/[slug])의 열람 1회가 1행이다. 같은 링크가 카카오 채널로 다수에게
-- 일괄 발송되므로 수신자를 알 수 없고, 페이지 단위 집계만 만든다.
--   visit_id  : 페이지 로드마다 새로 발급 → 열람 "횟수"
--   reader_id : localStorage에 남는 기기 식별자 → 열람 "인원" (없을 수 있다)
-- 구형 WebView에 crypto.randomUUID가 없어 클라이언트가 uuid를 보장하지 못하므로
-- 두 칼럼 모두 text다.
create table if not exists page_views (
  visit_id   text primary key,
  page_id    uuid not null references pages(id) on delete cascade,
  reader_id  text,
  max_depth  smallint not null default 0 check (max_depth between 0 and 100),
  dwell_ms   integer not null default 0 check (dwell_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table page_views enable row level security;

create index if not exists page_views_page_id_idx on page_views (page_id, created_at desc);

-- 전송이 순서대로 도착한다는 보장이 없다(50% 전송이 100%보다 늦게 도착할 수 있다).
-- 읽고-쓰기로 처리하면 경합이 생기므로 greatest()로 원자적으로 갱신해, 한 번 올라간
-- 도달률이 뒤늦게 도착한 낮은 값에 덮여 내려가지 않게 한다.
create or replace function record_page_view(
  p_page_id   uuid,
  p_visit_id  text,
  p_reader_id text,
  p_depth     smallint,
  p_dwell_ms  integer
) returns void as $$
  insert into page_views (visit_id, page_id, reader_id, max_depth, dwell_ms)
  values (p_visit_id, p_page_id, p_reader_id, p_depth, p_dwell_ms)
  on conflict (visit_id) do update set
    max_depth  = greatest(page_views.max_depth, excluded.max_depth),
    dwell_ms   = greatest(page_views.dwell_ms, excluded.dwell_ms),
    updated_at = now();
$$ language sql;

-- 어드민 "열람 분석" 화면이 페이지 수만큼 쿼리를 날리지 않도록 집계를 뷰로 고정한다.
-- coalesce(reader_id, visit_id)는 스토리지가 막혀 reader_id가 없는 방문을 버리지 않고
-- 1명으로 계산하기 위한 것이다 — 버리면 그 기기들이 인원에서 통째로 사라진다.
create or replace view page_view_stats as
select
  page_id,
  count(*)                                            as views,
  count(distinct coalesce(reader_id, visit_id))       as readers,
  count(*) filter (where max_depth >= 25)             as reached_25,
  count(*) filter (where max_depth >= 50)             as reached_50,
  count(*) filter (where max_depth >= 75)             as reached_75,
  count(*) filter (where max_depth >= 100)            as reached_100,
  coalesce(avg(dwell_ms), 0)::integer                 as avg_dwell_ms
from page_views
group by page_id;
