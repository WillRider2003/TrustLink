-- =============================================================
-- 16 — NOTIFICAR AL SUPERADMIN LAS SOLICITUDES DE VENDEDOR
-- Correr después del 01-15.
--
-- Bug arreglado: la solicitud "quiero ser vendedor" se inserta
-- directo en la tabla (sin RPC), así que nadie generaba la
-- notificación para el superadmin — la campana quedaba en cero
-- aunque hubiera solicitudes nuevas.
--
-- Solución: trigger AFTER INSERT que notifica a TODOS los
-- superadmins. Corre como owner de la tabla, así que puede
-- insertar en notificaciones sin pelearse con RLS.
-- =============================================================

create or replace function public.notificar_solicitud_vendedor()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_nombre text;
begin
  select trim(coalesce(nombre, '') || ' ' || coalesce(apellido, ''))
    into v_nombre from public.perfiles where id = new.usuario_id;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  select p.id, 'solicitud_vendedor', 'Nueva solicitud de vendedor',
         coalesce(nullif(v_nombre, ''), 'Un comprador') || ' quiere convertirse en vendedor (rubro: ' || coalesce(new.rubro, '—') || '). Revísala en "Solicitudes vendedor".',
         'solicitudes_vendedor', new.id
    from public.perfiles p
   where p.rol = 'superadmin';

  return new;
end;
$$;

drop trigger if exists trg_notificar_solicitud_vendedor on public.solicitudes_vendedor;
create trigger trg_notificar_solicitud_vendedor
  after insert on public.solicitudes_vendedor
  for each row execute function public.notificar_solicitud_vendedor();

-- Notificaciones retroactivas para solicitudes pendientes que se
-- crearon antes de este trigger (para que no queden invisibles):
insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
select p.id, 'solicitud_vendedor', 'Solicitud de vendedor pendiente',
       trim(coalesce(pe.nombre, '') || ' ' || coalesce(pe.apellido, '')) || ' tiene una solicitud pendiente de revisión.',
       'solicitudes_vendedor', s.id
  from public.solicitudes_vendedor s
  join public.perfiles pe on pe.id = s.usuario_id
 cross join public.perfiles p
 where p.rol = 'superadmin'
   and s.estado = 'pendiente'
   and not exists (
     select 1 from public.notificaciones n
      where n.referencia_tabla = 'solicitudes_vendedor'
        and n.referencia_id = s.id
        and n.usuario_id = p.id
   );
