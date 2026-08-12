-- ============================================================
-- TRUSTLINK — MIGRACIÓN 10: RLS PARA LO NUEVO DE 09
-- ============================================================
-- Ejecutar después de 09_arreglos_membresia_credito.sql
-- ============================================================

-- perfiles ya tiene RLS habilitado y las columnas nuevas (baneado,
-- dni, apellido, total_comprado) quedan cubiertas por las policies
-- existentes de select/update. Reforzamos que un usuario normal NO
-- pueda auto-banearse ni cambiarse total_comprado a mano:
drop policy if exists "perfiles_update_propio" on public.perfiles;
create policy "perfiles_update_propio" on public.perfiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and rol = (select rol from public.perfiles where id = auth.uid())
    and baneado = (select baneado from public.perfiles where id = auth.uid())
    and total_comprado = (select total_comprado from public.perfiles where id = auth.uid())
    and score_reputacion = (select score_reputacion from public.perfiles where id = auth.uid())
  );

-- listar_usuarios_admin, banear_usuario, desbanear_usuario son
-- security definer y validan public.es_superadmin() internamente,
-- así que no requieren policy adicional (se llaman por RPC, no REST).

-- auditoria: la policy de select ya exige superadmin. Los inserts
-- ocurren solo vía funciones security definer, no hace falta policy
-- de insert para el rol authenticated.

-- ---------- Evidencias: ahora admite imágenes + documentos, máx 20MB ----------
-- (el pedido más reciente del usuario redefine el límite de 50MB
-- anterior a 20MB, y agrega PDF/Word/Excel además de imágenes)
update storage.buckets
set
  file_size_limit = 20971520, -- 20MB en bytes
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
where id = 'incidencias';

