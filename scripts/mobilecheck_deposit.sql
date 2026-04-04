-- Allow users to insert into transactions (for pending check deposits)
create policy "transactions_insert_own" on public.transactions
for insert with check (auth.uid() = user_id);

-- Storage policy for check images
create policy "storage_checks_insert" on storage.objects
for insert with check (
  bucket_id = 'statement-documents' and
  auth.uid()::text = (storage.foldername(name))[2]
);

create policy "storage_checks_select_own" on storage.objects
for select using (
  bucket_id = 'statement-documents' and
  auth.uid()::text = (storage.foldername(name))[2]
);