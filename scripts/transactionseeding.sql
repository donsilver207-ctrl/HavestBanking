-- Drop all overloads unambiguously
drop function if exists public.process_transfer(uuid, text, text, uuid, text, numeric, text, text, timestamptz, text);
drop function if exists public.process_transfer(uuid, text, text, uuid, text, uuid, numeric, text, text, timestamptz, text);
drop function if exists public.process_transfer(uuid, text, uuid, text, uuid, uuid, text, uuid, numeric, text, text, timestamptz, text);
create or replace function public.process_transfer(
  p_user_id uuid,
  p_transfer_type text,
  p_from_wallet_currency text,
  p_to_beneficiary_id uuid,
  p_to_iban text,
  p_to_account_id uuid,       -- ← new: destination account for internal transfers
  p_amount numeric,
  p_currency text,
  p_reference text,
  p_scheduled_for timestamptz,
  p_status text
)
returns uuid                  -- ← returns transfer id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_balance   numeric;
  v_account_currency text;
  v_transfer_id      uuid;
begin
  -- 1. Lock and check source wallet balance
  select balance into v_wallet_balance
  from public.wallets
  where user_id = p_user_id and currency = p_from_wallet_currency
  for update;

  if v_wallet_balance is null then
    raise exception 'Wallet not found for currency %', p_from_wallet_currency;
  end if;

  if p_status != 'scheduled' and v_wallet_balance < p_amount then
    raise exception 'Insufficient balance. Available: %', v_wallet_balance;
  end if;

  -- 2. For internal: validate destination account belongs to user
  if p_transfer_type = 'internal' then
    select currency into v_account_currency
    from public.accounts
    where id = p_to_account_id and user_id = p_user_id and is_active = true
    for update;

    if v_account_currency is null then
      raise exception 'Destination account not found or inactive';
    end if;
  end if;

  -- 3. Insert transfer record
  insert into public.transfers (
    user_id, transfer_type, from_wallet_currency,
    to_beneficiary_id, to_iban, amount, currency,
    reference, scheduled_for, status
  ) values (
    p_user_id, p_transfer_type, p_from_wallet_currency,
    p_to_beneficiary_id, p_to_iban, p_amount, p_currency,
    p_reference, p_scheduled_for, p_status
  )
  returning id into v_transfer_id;

  -- 4. Skip balance movements for scheduled transfers
  if p_status = 'scheduled' then
    return v_transfer_id;
  end if;

  -- 5. Deduct from source wallet
  update public.wallets
  set balance    = balance - p_amount,
      updated_at = now()
  where user_id  = p_user_id
    and currency = p_from_wallet_currency;

  -- 6. For internal: credit the destination account
  if p_transfer_type = 'internal' then
    update public.accounts
    set balance    = balance + p_amount,
        updated_at = now()
    where id = p_to_account_id;
  end if;

  -- 7. Debit transaction on the wallet side
  insert into public.transactions (
    user_id, type, description, amount, currency, status, reference, transfer_id
  ) values (
    p_user_id,
    'debit',
    case p_transfer_type
      when 'internal' then 'Internal Transfer to Account'
      when 'swift'    then 'SWIFT Transfer to ' || coalesce(p_to_iban, 'N/A')
      when 'wire'     then 'Wire Transfer'
      else p_transfer_type
    end,
    p_amount,
    p_currency,
    p_status,
    p_reference,
    v_transfer_id
  );

  -- 8. For internal: credit transaction on the account side
  if p_transfer_type = 'internal' then
    insert into public.transactions (
      user_id, type, description, amount, currency, status, reference, transfer_id
    ) values (
      p_user_id,
      'credit',
      'Internal Transfer from ' || p_from_wallet_currency || ' Wallet',
      p_amount,
      v_account_currency,
      p_status,
      p_reference,
      v_transfer_id
    );
  end if;

  return v_transfer_id;
end;
$$;

grant execute on function public.process_transfer to authenticated;

-- ============================================================
-- admin_cash_deposit
-- Called by admin to credit a customer's account balance.
-- Runs as SECURITY DEFINER so it bypasses RLS on accounts.
-- Validates the caller is an admin before proceeding.
-- ============================================================

create or replace function public.admin_cash_deposit(
  p_account_id  uuid,
  p_user_id     uuid,
  p_amount      numeric,
  p_reference   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin     boolean;
  v_account_name text;
  v_currency     text;
begin

  -- 1. Confirm caller is an admin
  select is_admin into v_is_admin
    from public.profiles
   where id = auth.uid();

  if not found or not v_is_admin then
    raise exception 'Unauthorised: admin access required.';
  end if;

  -- 2. Validate amount
  if p_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero.';
  end if;

  -- 3. Fetch account details (must belong to p_user_id and be active)
  select name, currency
    into v_account_name, v_currency
    from public.accounts
   where id        = p_account_id
     and user_id   = p_user_id
     and is_active = true
     for update;

  if not found then
    raise exception 'Account not found or inactive.';
  end if;

  -- 4. Credit the account
  update public.accounts
     set balance    = balance + p_amount,
         updated_at = now()
   where id = p_account_id;

  -- 5. Record the transaction
  insert into public.transactions
    (user_id, type, description, amount, currency, status, reference)
  values
    (p_user_id, 'credit',
     'Cash Deposit — ' || v_account_name,
     p_amount, v_currency, 'completed', p_reference);

end;
$$;

-- Only authenticated users can call it (the function itself checks is_admin)
grant execute on function public.admin_cash_deposit(uuid, uuid, numeric, text)
  to authenticated;

  -- ============================================================
-- admin_cash_deduct
-- Called by admin to debit a customer's account or wallet.
-- Runs as SECURITY DEFINER to bypass RLS.
-- Validates caller is admin and balance is sufficient.
-- ============================================================

create or replace function public.admin_cash_deduct(
  p_target      text,       -- 'account' or 'wallet'
  p_user_id     uuid,
  p_amount      numeric,
  p_reference   text,
  p_account_id  uuid  default null,
  p_wallet_id   uuid  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin    boolean;
  v_label       text;
  v_currency    text;
  v_balance     numeric;
begin

  -- 1. Confirm caller is an admin
  select is_admin into v_is_admin
    from public.profiles
   where id = auth.uid();

  if not found or not v_is_admin then
    raise exception 'Unauthorised: admin access required.';
  end if;

  -- 2. Validate amount
  if p_amount <= 0 then
    raise exception 'Deduction amount must be greater than zero.';
  end if;

  if p_target = 'account' then

    -- 3a. Fetch and lock the account
    if p_account_id is null then
      raise exception 'p_account_id is required when target is account.';
    end if;

    select name, currency, balance
      into v_label, v_currency, v_balance
      from public.accounts
     where id      = p_account_id
       and user_id = p_user_id
       and is_active = true
       for update;

    if not found then
      raise exception 'Account not found or inactive.';
    end if;

    if v_balance < p_amount then
      raise exception 'Insufficient account balance. Available: % %', v_balance, v_currency;
    end if;

    -- Debit the account
    update public.accounts
       set balance    = balance - p_amount,
           updated_at = now()
     where id = p_account_id;

    -- Record debit transaction
    insert into public.transactions
      (user_id, type, description, amount, currency, status, reference)
    values
      (p_user_id, 'debit',
       'Cash Deduction — ' || v_label,
       p_amount, v_currency, 'completed', p_reference);

  elsif p_target = 'wallet' then

    -- 3b. Fetch and lock the wallet
    if p_wallet_id is null then
      raise exception 'p_wallet_id is required when target is wallet.';
    end if;

    select currency, balance
      into v_currency, v_balance
      from public.wallets
     where id      = p_wallet_id
       and user_id = p_user_id
       for update;

    if not found then
      raise exception 'Wallet not found.';
    end if;

    if v_balance <= 0 then
      raise exception 'Wallet has zero balance. Deduction not permitted.';
    end if;

    if v_balance < p_amount then
      raise exception 'Insufficient wallet balance. Available: % %', v_balance, v_currency;
    end if;

    -- Debit the wallet
    update public.wallets
       set balance    = balance - p_amount,
           updated_at = now()
     where id = p_wallet_id;

    -- Record debit transaction
    insert into public.transactions
      (user_id, type, description, amount, currency, status, reference)
    values
      (p_user_id, 'debit',
       'Cash Deduction — ' || v_currency || ' Wallet',
       p_amount, v_currency, 'completed', p_reference);

  else
    raise exception 'Invalid target: must be ''account'' or ''wallet''.';
  end if;

end;
$$;

grant execute on function public.admin_cash_deduct(text, uuid, numeric, text, uuid, uuid)
  to authenticated;