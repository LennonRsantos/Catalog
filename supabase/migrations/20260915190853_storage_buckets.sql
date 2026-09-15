-- Mirrors storage.rules exactly: public read (avatars/covers are shown to
-- other users without a signed URL), owner-only write/delete, size caps,
-- image-only. Path convention inside each bucket: {uid}/{fileName} — the
-- bucket itself (avatars vs covers) replaces the old top-level Firestore
-- Storage folder prefix.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/*'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 8388608, array['image/*'])
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "covers_public_read"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "covers_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "covers_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
