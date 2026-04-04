create policy "transactions_admin_insert" on public.transactions
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

  create policy "wallets_admin_update" on public.wallets
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

  create policy "notifications_admin_insert" on public.notifications
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );


  create policy "statements_admin_select" on public.statements for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "statements_admin_update" on public.statements for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);