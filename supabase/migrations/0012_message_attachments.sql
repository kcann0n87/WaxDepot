-- 0012_message_attachments.sql
-- Adds inline image attachments to messages. Users upload images via a
-- file input in the reply composer; the client gets back a list of public
-- URLs that get stashed alongside the message body in messages.image_urls.

alter table messages add column if not exists image_urls text[];

-- Storage bucket for message attachments. Public so URLs are renderable
-- without a signed-URL round-trip; the bucket-level file-size + MIME limits
-- prevent abuse.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  true,
  10 * 1024 * 1024,                               -- 10 MB max per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read of objects (since bucket is public). Writes go through the
-- server action with the user's Supabase auth client, scoped per upload.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'message-attachments public read'
  ) then
    create policy "message-attachments public read"
      on storage.objects for select
      using (bucket_id = 'message-attachments');
  end if;
end$$;

-- Authenticated users can write into the bucket — but only into a path
-- that starts with their user id. Prevents one user from overwriting
-- another's attachments.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'message-attachments owner write'
  ) then
    create policy "message-attachments owner write"
      on storage.objects for insert
      with check (
        bucket_id = 'message-attachments'
        and auth.uid() is not null
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end$$;
