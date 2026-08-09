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
  updated_at timestamptz not null default now()
);

create index if not exists pages_updated_at_idx on pages (updated_at desc);

insert into storage.buckets (id, name, public)
values ('banner-images', 'banner-images', true)
on conflict (id) do nothing;
