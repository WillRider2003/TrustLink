-- ============================================================
-- TRUSTLINK — ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Ejecutar después de 02_funciones.sql
-- Con RLS activado, aunque alguien tenga la anon key, solo puede
-- leer/escribir lo que estas políticas permiten explícitamente.
-- ============================================================

-- Helper: ¿el usuario autenticado actual es superadmin?
create or replace function public.es_superadmin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'superadmin');
$$;

-- ---------- PERFILES ----------
alter table public.perfiles enable row level security;

create policy "perfiles_select_propio_o_admin" on public.perfiles
  for select using (id = auth.uid() or public.es_superadmin());

create policy "perfiles_select_publico_vendedores" on public.perfiles
  for select using (rol = 'vendedor'); -- para mostrar nombre del vendedor en el marketplace

create policy "perfiles_update_propio" on public.perfiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and rol = (select rol from public.perfiles where id = auth.uid())); -- no puede cambiarse el rol a sí mismo

create policy "perfiles_update_admin" on public.perfiles
  for update using (public.es_superadmin());

-- ---------- BLOQUEOS ----------
alter table public.bloqueos_compra enable row level security;

create policy "bloqueos_select_propio_o_admin" on public.bloqueos_compra
  for select using (usuario_id = auth.uid() or public.es_superadmin());

create policy "bloqueos_admin_insert" on public.bloqueos_compra
  for insert with check (public.es_superadmin());

create policy "bloqueos_admin_update" on public.bloqueos_compra
  for update using (public.es_superadmin());

-- ---------- SOLICITUDES VENDEDOR ----------
alter table public.solicitudes_vendedor enable row level security;

create policy "solicitudes_vendedor_select" on public.solicitudes_vendedor
  for select using (usuario_id = auth.uid() or public.es_superadmin());

create policy "solicitudes_vendedor_insert" on public.solicitudes_vendedor
  for insert with check (usuario_id = auth.uid());

create policy "solicitudes_vendedor_update_admin" on public.solicitudes_vendedor
  for update using (public.es_superadmin());

-- ---------- PRODUCTOS ----------
alter table public.productos enable row level security;

create policy "productos_select_todos" on public.productos
  for select using (true); -- catálogo público (comprador ve todo lo activo desde el frontend)

create policy "productos_insert_vendedor" on public.productos
  for insert with check (
    vendedor_id = auth.uid()
    and exists (select 1 from public.perfiles where id = auth.uid() and rol in ('vendedor','superadmin'))
  );

create policy "productos_update_propio_o_admin" on public.productos
  for update using (vendedor_id = auth.uid() or public.es_superadmin());

create policy "productos_delete_propio_o_admin" on public.productos
  for delete using (vendedor_id = auth.uid() or public.es_superadmin());

-- ---------- CARRITO ----------
alter table public.carrito_items enable row level security;

create policy "carrito_todo_propio" on public.carrito_items
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ---------- PEDIDOS ----------
alter table public.pedidos enable row level security;

create policy "pedidos_select_involucrados" on public.pedidos
  for select using (comprador_id = auth.uid() or vendedor_id = auth.uid() or public.es_superadmin());

-- Los INSERT/UPDATE de pedidos pasan por las funciones security definer
-- (crear_pedido, avanzar_pedido, confirmar_entrega), no por REST directo,
-- así que no exponemos policies de insert/update abiertas aquí.
create policy "pedidos_update_admin" on public.pedidos
  for update using (public.es_superadmin());

-- ---------- EVENTOS DE PEDIDO ----------
alter table public.pedido_eventos enable row level security;

create policy "pedido_eventos_select_involucrados" on public.pedido_eventos
  for select using (
    public.es_superadmin() or exists (
      select 1 from public.pedidos p
      where p.id = pedido_eventos.pedido_id
        and (p.comprador_id = auth.uid() or p.vendedor_id = auth.uid())
    )
  );

-- ---------- INCIDENCIAS ----------
alter table public.incidencias enable row level security;

create policy "incidencias_select_involucrados" on public.incidencias
  for select using (
    reportado_por = auth.uid() or public.es_superadmin()
    or exists (select 1 from public.pedidos p where p.id = incidencias.pedido_id and (p.comprador_id = auth.uid() or p.vendedor_id = auth.uid()))
  );

create policy "incidencias_update_admin" on public.incidencias
  for update using (public.es_superadmin());

-- ---------- IMÁGENES DE INCIDENCIA ----------
alter table public.incidencia_imagenes enable row level security;

create policy "incidencia_imagenes_select" on public.incidencia_imagenes
  for select using (
    public.es_superadmin() or exists (
      select 1 from public.incidencias i where i.id = incidencia_imagenes.incidencia_id and i.reportado_por = auth.uid()
    )
  );

create policy "incidencia_imagenes_insert_propio" on public.incidencia_imagenes
  for insert with check (
    exists (select 1 from public.incidencias i where i.id = incidencia_imagenes.incidencia_id and i.reportado_por = auth.uid())
  );

-- ---------- CRÉDITO ----------
alter table public.solicitudes_credito enable row level security;

create policy "creditos_select_propio_o_admin" on public.solicitudes_credito
  for select using (vendedor_id = auth.uid() or public.es_superadmin());

create policy "creditos_update_admin" on public.solicitudes_credito
  for update using (public.es_superadmin());

-- ---------- NOTIFICACIONES ----------
alter table public.notificaciones enable row level security;

create policy "notificaciones_select_propio" on public.notificaciones
  for select using (usuario_id = auth.uid());

create policy "notificaciones_update_propio" on public.notificaciones
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ---------- AUDITORÍA (solo superadmin) ----------
alter table public.auditoria enable row level security;

create policy "auditoria_select_admin" on public.auditoria
  for select using (public.es_superadmin());
