create policy "transactions_update_own"
on public.transactions
for update using (auth.uid() = user_id);