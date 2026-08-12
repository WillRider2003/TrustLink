-- ============================================================
-- TRUSTLINK — IMÁGENES DE PRODUCTO (bucket de Storage)
-- ============================================================
-- Ejecutar en Supabase → SQL Editor, después de 01-06.
-- Reemplaza el campo de texto "URL de imagen" del formulario de
-- productos por una subida de archivo real a Supabase Storage.
--
-- Crea:
--   1) Bucket "productos" — PÚBLICO (a diferencia de "avatares" e
--      "incidencias", que son privados). Es público a propósito:
--      las fotos de producto se muestran en el marketplace a
--      cualquier comprador autenticado, en listados que traen
--      muchos productos a la vez, así que conviene una URL pública
--      y estable en vez de una URL firmada que expira y que habría
--      que refrescar por cada producto en cada carga de página.
--   2) Límite de 5MB por archivo y solo tipos imagen (jpg/png/webp),
--      igual que el bucket "avatares".
--   3) Políticas: cada vendedor sube/actualiza/borra solo dentro de
--      su propia carpeta (prefijo = su user id), mismo patrón que
--      "avatares" e "incidencias". La lectura es pública porque el
--      bucket es público.
-- ============================================================

-- ---------- 1) bucket "productos" ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos', 'productos', true,
  5242880, -- 5MB en bytes
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------- 2) políticas de storage.objects ----------
-- Nota: si alguna vez corriste este script antes, "create policy"
-- fallaría por duplicado — por eso primero se limpia con drop if exists.

drop policy if exists "productos_storage_insert_propio" on storage.objects;
create policy "productos_storage_insert_propio"
on storage.objects for insert
with check (
  bucket_id = 'productos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "productos_storage_update_propio" on storage.objects;
create policy "productos_storage_update_propio"
on storage.objects for update
using (
  bucket_id = 'productos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "productos_storage_delete_propio" on storage.objects;
create policy "productos_storage_delete_propio"
on storage.objects for delete
using (
  bucket_id = 'productos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Lectura pública (el bucket ya es público y sirve archivos por URL
-- directa sin pasar por RLS, pero esta policy también habilita listar
-- el bucket vía la API de Storage si alguna vez se necesita).
drop policy if exists "productos_storage_select_publico" on storage.objects;
create policy "productos_storage_select_publico"
on storage.objects for select
using (bucket_id = 'productos');
