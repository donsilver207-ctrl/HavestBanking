create policy "storage_admin_insert_809" on storage.objects
for insert with check (
  bucket_id = 'statement-documents' and
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "storage_admin_update_809" on storage.objects
for update using (
  bucket_id = 'statement-documents' and
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "storage_admin_all" on storage.objects
for all using (
  bucket_id = 'statement-documents' and
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "storage_user_select" on storage.objects
for select using (
  bucket_id = 'statement-documents' and
  auth.uid()::text = (storage.foldername(name))[2]
);