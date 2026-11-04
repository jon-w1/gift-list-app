-- Photo storage. Run after 0001_init.sql.
-- Photos live at item-photos/<user-id>/<random>.jpg. The bucket is public-read
-- with unguessable file names, so an image only shows to people who can
-- already see the item it belongs to.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
