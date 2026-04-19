-- ============================================
-- 1. is_admin() helper — breaks RLS recursion
-- ============================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ============================================
-- 2. Fix recursive admin policies on profiles
-- ============================================
drop policy if exists "profiles_admin_select" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

create policy "profiles_admin_select" on public.profiles
  for select using (public.is_admin());

create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- ============================================
-- 3. Fix admin policies on all other tables
-- ============================================
drop policy if exists "accounts_admin_select"      on public.accounts;
drop policy if exists "wallets_admin_select"        on public.wallets;
drop policy if exists "transactions_admin_select"   on public.transactions;
drop policy if exists "transactions_admin_update"   on public.transactions;
drop policy if exists "kyc_docs_admin_select"       on public.kyc_documents;
drop policy if exists "kyc_docs_admin_update"       on public.kyc_documents;
drop policy if exists "audit_logs_admin_select"     on public.audit_logs;
drop policy if exists "audit_logs_admin_insert"     on public.audit_logs;
drop policy if exists "transfers_admin_select"      on public.transfers;
drop policy if exists "fx_rates_admin_insert"       on public.fx_rates;
drop policy if exists "fx_rates_admin_update"       on public.fx_rates;

create policy "accounts_admin_select"    on public.accounts      for select using (public.is_admin());
create policy "wallets_admin_select"     on public.wallets       for select using (public.is_admin());
create policy "transactions_admin_select" on public.transactions for select using (public.is_admin());
create policy "transactions_admin_update" on public.transactions for update using (public.is_admin());
create policy "kyc_docs_admin_select"    on public.kyc_documents for select using (public.is_admin());
create policy "kyc_docs_admin_update"    on public.kyc_documents for update using (public.is_admin());
create policy "audit_logs_admin_select"  on public.audit_logs   for select using (public.is_admin());
create policy "audit_logs_admin_insert"  on public.audit_logs   for insert with check (public.is_admin());
create policy "transfers_admin_select"   on public.transfers     for select using (public.is_admin());
create policy "fx_rates_admin_insert"    on public.fx_rates      for insert with check (public.is_admin());
create policy "fx_rates_admin_update"    on public.fx_rates      for update using (public.is_admin());

-- ============================================
-- 4. Replace handle_new_user trigger to seed
--    all tables at signup (runs as superuser,
--    fully bypasses RLS — no recursion possible)
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country      text;
  v_national_id  text;
  v_account_num  text;
  v_iban         text;
begin
  -- ── 1. Profile ───────────────────────────────────────────────────────────
  insert into public.profiles (
    id, first_name, last_name, email,
    country, national_id,
    tier, kyc_status, account_status,
    default_currency, language, timezone, two_factor_enabled
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name',  null),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'country', 'CH'),
    coalesce(new.raw_user_meta_data ->> 'national_id', null),
    1, 'pending', 'active',
    'CHF', 'en', 'CET', false
  )
  on conflict (id) do nothing;

  -- ── 2. Primary bank account ──────────────────────────────────────────────
  v_account_num := 'HB' || to_char(floor(random() * 90000000 + 10000000)::int, 'FM99999999');
  v_iban        := 'CH' || to_char(floor(random() * 90 + 10)::int, 'FM99')
                        || '0089'
                        || to_char(floor(random() * 9e13 + 1e13)::bigint, 'FM99999999999999');

  insert into public.accounts (
    user_id, name, account_number, iban,
    swift, jurisdiction, account_type,
    balance, currency, is_active
  )
  values (
    new.id,
    'Private Banking Account',
    v_account_num,
    v_iban,
    'HELVCHJJXXX',
    'Switzerland',
    'Private Banking',
    0, 'CHF', true
  );

  -- ── 3. Multi-currency wallets ────────────────────────────────────────────
  insert into public.wallets (user_id, currency, symbol, balance, change_percent)
  values
    (new.id, 'CHF', 'CHF', 0, 0),
    (new.id, 'USD', '$',   0, 0),
    (new.id, 'EUR', '€',   0, 0),
    (new.id, 'GBP', '£',   0, 0)
  on conflict (user_id, currency) do nothing;

  -- ── 4. FX rates (global — skip if already seeded) ───────────────────────
  insert into public.fx_rates (pair, rate, change_percent)
  values
    ('CHF/USD', 1.113200,  0.12),
    ('CHF/EUR', 1.042100, -0.08),
    ('CHF/GBP', 0.887400,  0.05),
    ('USD/EUR', 0.936100, -0.21),
    ('EUR/GBP', 0.851600,  0.03)
  on conflict (pair) do nothing;

  -- ── 5. Welcome notification ──────────────────────────────────────────────
  insert into public.notifications (user_id, title, message, type, is_read)
  values (
    new.id,
    'Welcome to Crestmont Bank',
    'Your account has been created. Please complete KYC verification to unlock all features.',
    'general',
    false
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();