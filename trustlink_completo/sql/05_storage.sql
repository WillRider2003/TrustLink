-- ============================================================
-- TRUSTLINK — STORAGE (bucket de imágenes de incidencias)
-- ============================================================
-- Este script crea el bucket vía SQL. También puedes crearlo a
-- mano en Supabase → Storage → New bucket, con el nombre
-- exacto "incidencias" y "Public bucket" DESACTIVADO.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('incidencias', 'incidencias', false)
on conflict (id) do nothing;

-- Cualquier usuario autenticado puede subir una imagen a su propia
-- carpeta (prefijo = su propio user id), para que solo pueda ver y
-- subir dentro de su carpeta.
create policy "incidencias_storage_insert_propio"
on storage.objects for insert
with check (
  bucket_id = 'incidencias'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "incidencias_storage_select_propio_o_admin"
on storage.objects for select
using (
  bucket_id = 'incidencias'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.es_superadmin()
  )
);
