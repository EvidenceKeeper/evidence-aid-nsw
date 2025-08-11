-- Ensure pgcrypto is available for gen_random_uuid
create extension if not exists pgcrypto;

-- Create table to log assistant requests for rate limiting
create table if not exists public.assistant_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  ip_address text
);

-- Enable RLS on assistant_requests
alter table public.assistant_requests enable row level security;

-- Policy: users can insert their own request logs (create only if missing)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'assistant_requests' and policyname = 'Users can insert their own assistant requests'
  ) then
    create policy "Users can insert their own assistant requests"
      on public.assistant_requests
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Policy: users can view their own request logs (create only if missing)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'assistant_requests' and policyname = 'Users can view their own assistant requests'
  ) then
    create policy "Users can view their own assistant requests"
      on public.assistant_requests
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Helpful index for rate limiting queries
create index if not exists assistant_requests_user_time_idx
  on public.assistant_requests (user_id, created_at desc);

-- Storage RLS policies for evidence bucket (per-user folder access)
-- Allow users to list/view only their own files
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own evidence'
  ) THEN
    CREATE POLICY "Users can view their own evidence"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Allow users to upload only into their own folder
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own evidence'
  ) THEN
    CREATE POLICY "Users can upload their own evidence"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Allow users to update only their own files
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own evidence'
  ) THEN
    CREATE POLICY "Users can update their own evidence"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Allow users to delete only their own files
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own evidence'
  ) THEN
    CREATE POLICY "Users can delete their own evidence"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;