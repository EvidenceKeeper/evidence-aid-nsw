-- Create private storage bucket for evidence files
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- Policies: users can manage files in their own folder (first path segment = auth.uid())
create policy "Users can view their own evidence"
  on storage.objects for select
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload their own evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own evidence"
  on storage.objects for update
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own evidence"
  on storage.objects for delete
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );