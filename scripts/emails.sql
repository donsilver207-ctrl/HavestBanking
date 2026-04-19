     -- ─── Migration: emails table ───────────────────────────────────────────────────
create table if not exists public.emails (
  id            uuid        primary key default gen_random_uuid(),
  direction     text        not null check (direction in ('sent', 'received', 'draft')),
  from_address  text        not null,
  to_address    text        not null,
  subject       text,
  body_text     text,
  preview       text        generated always as (left(coalesce(body_text, ''), 120)) stored,
  read          boolean     not null default false,
  starred       boolean     not null default false,
  attachments   jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- Indexes for fast folder queries
create index if not exists emails_direction_created_idx on public.emails (direction, created_at desc);
create index if not exists emails_unread_idx            on public.emails (read) where read = false;

-- Row Level Security
alter table public.emails enable row level security;

create policy "authenticated full access"
  on public.emails
  using     (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');