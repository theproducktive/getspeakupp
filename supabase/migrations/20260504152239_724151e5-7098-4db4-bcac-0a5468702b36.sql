
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "rec_self_select" on storage.objects for select
  using (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "rec_self_insert" on storage.objects for insert
  with check (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "rec_self_delete" on storage.objects for delete
  using (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);
