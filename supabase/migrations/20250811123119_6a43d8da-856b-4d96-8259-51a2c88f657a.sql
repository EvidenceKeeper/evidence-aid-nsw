-- Create table to log assistant requests for rate limiting
create table if not exists public.assistant_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  ip_address text
);

-- Enable RLS on assistant_requests
alter table public.assistant_requests enable row level security;

-- Policy: users can insert their own request logs
create policy if not exists "Users can insert their own assistant requests"
  on public.assistant_requests
  for insert
  with check (auth.uid() = user_id);

-- Policy: users can view their own request logs
create policy if not exists "Users can view their own assistant requests"
  on public.assistant_requests
  for select
  using (auth.uid() = user_id);

-- Helpful index for rate limiting queries
create index if not exists assistant_requests_user_time_idx
  on public.assistant_requests (user_id, created_at desc);

-- Storage RLS policies for evidence bucket (per-user folder access)
-- Allow users to list/view only their own files
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can view their own evidence'
  ) then
    create policy "Users can view their own evidence"
      on storage.objects for select
      using (
        bucket_id = 'evidence'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Allow users to upload only into their own folder
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload their own evidence'
  ) then
    create policy "Users can upload their own evidence"
      on storage.objects for insert
      with check (
        bucket_id = 'evidence'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Allow users to update only their own files
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can update their own evidence'
  ) then
    create policy "Users can update their own evidence"
      on storage.objects for update
      using (
        bucket_id = 'evidence'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Allow users to delete only their own files
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can delete their own evidence'
  ) then
    create policy "Users can delete their own evidence"
      on storage.objects for delete
      using (
        bucket_id = 'evidence'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;