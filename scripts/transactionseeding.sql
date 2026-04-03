-- Drop all overloads unambiguously
drop function if exists public.process_transfer(uuid, text, text, uuid, text, numeric, text, text, timestamptz, text);
drop function if exists public.process_transfer(uuid, text, text, uuid, text, uuid, numeric, text, text, timestamptz, text);

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