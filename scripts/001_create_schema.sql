-- ============================================
-- Helvetica Bank - Database Schema
-- ============================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  country text default 'CH',
  national_id text,
  tier integer default 1 check (tier between 1 and 3),
  kyc_status text default 'pending' check (kyc_status in ('pending','approved','rejected')),
  account_status text default 'active' check (account_status in ('active','frozen','suspended')),
  is_admin boolean default false,
  default_currency text default 'CHF',
  language text default 'en',
  timezone text default 'CET',
  two_factor_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
-- Admin can read all profiles
create policy "profiles_admin_select" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
-- Admin can update all profiles
create policy "profiles_admin_update" on public.profiles for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 2. Accounts (bank accounts)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  account_number text not null,
  iban text,
  swift text,
  jurisdiction text default 'Switzerland',
  account_type text default 'Private Banking',
  balance numeric(18,2) default 0,
  currency text default 'CHF',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.accounts enable row level security;
create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id);
create policy "accounts_admin_select" on public.accounts for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 3. Wallets (multi-currency)
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null,
  symbol text not null,
  balance numeric(18,2) default 0,
  change_percent numeric(5,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, currency)
);

alter table public.wallets enable row level security;
create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
create policy "wallets_insert_own" on public.wallets for insert with check (auth.uid() = user_id);
create policy "wallets_update_own" on public.wallets for update using (auth.uid() = user_id);
create policy "wallets_admin_select" on public.wallets for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 4. Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('credit','debit')),
  description text not null,
  amount numeric(18,2) not null,
  currency text not null default 'CHF',
  status text default 'completed' check (status in ('completed','pending','flagged','cancelled')),
  reference text,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_admin_select" on public.transactions for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "transactions_admin_update" on public.transactions for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 5. Beneficiaries
create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  bank text not null,
  swift text,
  iban text,
  country text,
  created_at timestamptz default now()
);

alter table public.beneficiaries enable row level security;
create policy "beneficiaries_select_own" on public.beneficiaries for select using (auth.uid() = user_id);
create policy "beneficiaries_insert_own" on public.beneficiaries for insert with check (auth.uid() = user_id);
create policy "beneficiaries_update_own" on public.beneficiaries for update using (auth.uid() = user_id);
create policy "beneficiaries_delete_own" on public.beneficiaries for delete using (auth.uid() = user_id);

-- 6. Cards
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_type text default 'Visa' check (card_type in ('Visa','Mastercard','Platinum')),
  last_four text not null,
  card_holder text not null,
  expiry text not null,
  is_frozen boolean default false,
  spending_limit numeric(18,2) default 50000,
  spent_this_month numeric(18,2) default 0,
  currency text default 'CHF',
  created_at timestamptz default now()
);

alter table public.cards enable row level security;
create policy "cards_select_own" on public.cards for select using (auth.uid() = user_id);
create policy "cards_insert_own" on public.cards for insert with check (auth.uid() = user_id);
create policy "cards_update_own" on public.cards for update using (auth.uid() = user_id);

-- 7. KYC Documents
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  step_name text not null,
  document_type text not null,
  file_path text not null,
  file_name text not null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.kyc_documents enable row level security;
create policy "kyc_docs_select_own" on public.kyc_documents for select using (auth.uid() = user_id);
create policy "kyc_docs_insert_own" on public.kyc_documents for insert with check (auth.uid() = user_id);
create policy "kyc_docs_admin_select" on public.kyc_documents for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "kyc_docs_admin_update" on public.kyc_documents for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 8. Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'general' check (type in ('transfer','kyc','security','fx','statement','general')),
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications for insert with check (auth.uid() = user_id);

-- 9. FX Rates (global, admin managed)
create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  pair text not null unique,
  rate numeric(12,6) not null,
  change_percent numeric(5,2) default 0,
  updated_at timestamptz default now()
);

alter table public.fx_rates enable row level security;
-- Everyone can read FX rates
create policy "fx_rates_select_all" on public.fx_rates for select using (true);
create policy "fx_rates_admin_insert" on public.fx_rates for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "fx_rates_admin_update" on public.fx_rates for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 10. Audit Logs (admin only)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_user_name text,
  admin_name text default 'System',
  log_type text default 'system' check (log_type in ('kyc','account','tier','transaction','system','auth')),
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;
create policy "audit_logs_admin_select" on public.audit_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "audit_logs_admin_insert" on public.audit_logs for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 11. Transfers (pending/scheduled transfers)
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_wallet_currency text not null,
  to_beneficiary_id uuid references public.beneficiaries(id) on delete set null,
  to_iban text,
  transfer_type text not null check (transfer_type in ('internal','swift','wire','scheduled')),
  amount numeric(18,2) not null,
  currency text not null,
  status text default 'pending' check (status in ('pending','processing','completed','failed','scheduled')),
  reference text,
  scheduled_for timestamptz,
  created_at timestamptz default now()
);

alter table public.transfers enable row level security;
create policy "transfers_select_own" on public.transfers for select using (auth.uid() = user_id);
create policy "transfers_insert_own" on public.transfers for insert with check (auth.uid() = user_id);
create policy "transfers_admin_select" on public.transfers for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 12. Statements
create table if not exists public.statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,
  file_path text,
  file_name text not null,
  generated_at timestamptz default now()
);

alter table public.statements enable row level security;
create policy "statements_select_own" on public.statements for select using (auth.uid() = user_id);
create policy "statements_insert_own" on public.statements for insert with check (auth.uid() = user_id);
