-- 0010_product_images_bucket.sql
-- Creates a public Supabase Storage bucket for product images.
-- Admins upload via the /admin/catalog SKU form; the server action uses
-- the service-role client so it bypasses RLS entirely. Public read is
-- enabled so <img src="..."> works in the marketplace UI.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5 * 1024 * 1024,                                 -- 5 MB max per file
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read of objects in the bucket (matches `public = true` on the bucket).
-- Writes go through the service-role client server-side — no RLS write
-- policy needed because service-role bypasses RLS.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'product-images public read'
  ) then
    create policy "product-images public read"
      on storage.objects for select
      using (bucket_id = 'product-images');
  end if;
end$$;
