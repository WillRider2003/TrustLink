-- ============================================================
-- TRUSTLINK — AVATAR DE PERFIL + LÍMITES DE ARCHIVO
-- ============================================================
-- Ejecutar en Supabase → SQL Editor, después de 01-05.
-- Agrega:
--   1) Columna avatar_url en perfiles
--   2) Bucket "avatares" con límite de 5MB y solo tipos imagen
--   3) Políticas RLS del bucket (cada usuario sube/lee solo su carpeta)
--   4) Sube el límite del bucket "incidencias" a 50MB por archivo,
--      restringido a imágenes (jpg/png/webp)
-- ============================================================

-- ---------- 1) avatar_url en perfiles ----------
alter table public.perfiles
  add column if not exists avatar_url text;

-- ---------- 2) bucket "avatares" ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares', 'avatares', false,
  5242880, -- 5MB en bytes (foto de perfil no necesita ser pesada)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario autenticado sube/actualiza/lee solo dentro de su
-- propia carpeta (prefijo = su user id), igual patrón que "incidencias".
create policy "avatares_insert_propio"
on storage.objects for insert
with check (
  bucket_id = 'avatares'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatares_update_propio"
on storage.objects for update
using (
  bucket_id = 'avatares'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatares_select_propio_o_admin"
on storage.objects for select
using (
  bucket_id = 'avatares'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.es_superadmin()
  )
);

create policy "avatares_delete_propio"
on storage.objects for delete
using (
  bucket_id = 'avatares'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- ---------- 3) límite real en bucket "incidencias" (50MB, solo imágenes) ----------
update storage.buckets
set
  file_size_limit = 52428800, -- 50MB en bytes
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'incidencias';

-- ---------- 4) endurece RLS de productos_update_propio_o_admin ----------
-- La política original solo valida `using` (contra la fila antes del
-- update), sin `with check` (contra la fila resultante). Un vendedor
-- autenticado podría reasignar vendedor_id de su propio producto a
-- otro usuario. Se agrega with check para bloquear esa fuga.
drop policy if exists "productos_update_propio_o_admin" on public.productos;

create policy "productos_update_propio_o_admin" on public.productos
  for update
  using (vendedor_id = auth.uid() or public.es_superadmin())
  with check (vendedor_id = auth.uid() or public.es_superadmin());
