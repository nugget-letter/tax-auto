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
