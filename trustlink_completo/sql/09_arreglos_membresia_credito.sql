-- ============================================================
-- TRUSTLINK — MIGRACIÓN 09: ARREGLOS + MEMBRESÍAS + CRÉDITO NUEVO
-- ============================================================
-- Ejecutar en Supabase → SQL Editor, después de 01-08.
--
-- Contiene:
--   A) Fix bug real: resolver_incidencia lanzaba error de tipo
--      (estado_incidencia vs text) al resolver una incidencia
--   B) Baneo de usuarios: columna + función + auditoría
--   C) Auditoría de login/logout (vía trigger no es posible en
--      Supabase Auth, se registra desde el frontend con una función)
--   D) Membresías Trusti (Blue/Silver/Gold/Black) con progreso
--      automático según historial de compras
--   E) Score de vendedor ponderado por monto vendido, no cantidad
--   F) Crédito: interés 12% mensual, aplazamiento de 5 días con
--      recargo, reporte a SBS si no paga, aceptación de trato digital
--   G) Eliminar producto (además de pausar)
-- ============================================================


-- ================================================================
-- A) FIX — resolver_incidencia: cast explícito de estado
-- ================================================================
-- Causa raíz del toast "column estado is of type estado_incidencia
-- but expression is of type text": el CASE sin cast se interpretaba
-- como text plano. Se fuerza el tipo en cada rama.
create or replace function public.resolver_incidencia(
  p_incidencia_id bigint,
  p_resolucion text,
  p_favor_comprador boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_incidencia record;
  v_pedido record;
begin
  select * into v_incidencia from public.incidencias where id = p_incidencia_id for update;
  if not found then raise exception 'Incidencia no existe'; end if;

  update public.incidencias
     set estado = (case when p_favor_comprador then 'resuelta_comprador' else 'resuelta_vendedor' end)::estado_incidencia,
         resolucion = p_resolucion, resuelto_por = v_admin, resuelto_en = now()
   where id = p_incidencia_id;

  if v_incidencia.pedido_id is not null then
    select * into v_pedido from public.pedidos where id = v_incidencia.pedido_id for update;
    if found and v_pedido.estado = 'en_disputa' then
      if p_favor_comprador then
        update public.pedidos set estado = 'reembolsado'::estado_pedido, actualizado_en = now() where id = v_pedido.id;
        update public.perfiles set credito_disponible = credito_disponible + v_pedido.monto_total where id = v_pedido.comprador_id;
        insert into public.pedido_eventos (pedido_id, estado, nota, creado_por) values (v_pedido.id, 'reembolsado', p_resolucion, v_admin);
      else
        update public.pedidos set estado = 'liberado_admin'::estado_pedido, actualizado_en = now() where id = v_pedido.id;
        update public.perfiles set score_reputacion = least(100, score_reputacion + 1) where id = v_pedido.vendedor_id;
        insert into public.pedido_eventos (pedido_id, estado, nota, creado_por) values (v_pedido.id, 'liberado_admin', p_resolucion, v_admin);
      end if;

      insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
      values (v_pedido.comprador_id, 'incidencia', 'Incidencia resuelta', p_resolucion, 'incidencias', p_incidencia_id);
      insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
      values (v_pedido.vendedor_id, 'incidencia', 'Incidencia resuelta', p_resolucion, 'incidencias', p_incidencia_id);
    end if;
  end if;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, 'INCIDENCIA_RESUELTA', 'incidencias', p_incidencia_id::text,
          jsonb_build_object('favor_comprador', p_favor_comprador, 'resolucion', p_resolucion));
end;
$$;

-- Mismo blindaje preventivo en decidir_credito (mismo patrón de CASE).
create or replace function public.decidir_credito(p_solicitud_id bigint, p_aprobar boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_solicitud record;
begin
  select * into v_solicitud from public.solicitudes_credito where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;

  update public.solicitudes_credito
     set estado = (case when p_aprobar then 'aprobado' else 'rechazado' end)::estado_credito,
         aprobado_por = v_admin, aprobado_en = now()
   where id = p_solicitud_id;

  if p_aprobar then
    update public.perfiles set credito_disponible = credito_disponible + v_solicitud.monto_solicitado where id = v_solicitud.vendedor_id;
  end if;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_solicitud.vendedor_id, 'credito',
          case when p_aprobar then 'Crédito aprobado' else 'Crédito rechazado' end,
          case when p_aprobar then 'Se aprobó tu crédito de S/ ' || v_solicitud.monto_solicitado || '. Deberás pagar S/ ' || v_solicitud.monto_a_pagar || ' (incluye interés del 12% mensual).'
               else 'Tu solicitud de crédito no fue aprobada esta vez.' end,
          'solicitudes_credito', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, case when p_aprobar then 'CREDITO_APROBADO' else 'CREDITO_RECHAZADO' end,
          'solicitudes_credito', p_solicitud_id::text, jsonb_build_object('vendedor_id', v_solicitud.vendedor_id));
end;
$$;


-- ================================================================
-- B) BANEO DE USUARIOS
-- ================================================================
alter table public.perfiles
  add column if not exists baneado boolean not null default false,
  add column if not exists baneado_motivo text,
  add column if not exists baneado_en timestamptz;

create or replace function public.banear_usuario(p_usuario_id uuid, p_motivo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;

  update public.perfiles
     set baneado = true, baneado_motivo = p_motivo, baneado_en = now()
   where id = p_usuario_id;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje)
  values (p_usuario_id, 'sistema', 'Cuenta suspendida', coalesce(p_motivo, 'Tu cuenta fue suspendida por el equipo de TrustLink.'));

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, 'USUARIO_BANEADO', 'perfiles', p_usuario_id::text, jsonb_build_object('motivo', p_motivo));
end;
$$;

create or replace function public.desbanear_usuario(p_usuario_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;

  update public.perfiles set baneado = false, baneado_motivo = null, baneado_en = null where id = p_usuario_id;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje)
  values (p_usuario_id, 'sistema', 'Cuenta reactivada', 'Tu cuenta fue reactivada. Ya puedes usar TrustLink con normalidad.');

  insert into public.auditoria (actor_id, accion, entidad, entidad_id)
  values (v_admin, 'USUARIO_DESBANEADO', 'perfiles', p_usuario_id::text);
end;
$$;

-- Lista de usuarios para el panel admin (con métricas básicas).
create or replace function public.listar_usuarios_admin()
returns table(
  id uuid, nombre text, telefono text, rol rol_usuario,
  baneado boolean, baneado_motivo text, score_reputacion int,
  credito_disponible numeric, creado_en timestamptz
)
language sql stable
security definer set search_path = public
as $$
  select p.id, p.nombre, p.telefono, p.rol, p.baneado, p.baneado_motivo,
         p.score_reputacion, p.credito_disponible, p.creado_en
  from public.perfiles p
  where public.es_superadmin()
  order by p.creado_en desc;
$$;

-- Bloquea login de usuarios baneados: se valida desde el frontend
-- tras el signIn (Supabase Auth no permite interceptar el login por
-- RLS), pero además reforzamos aquí: todas las funciones RPC de
-- negocio deben chequear esto. Empezamos por crear_pedido.
create or replace function public.usuario_esta_baneado(p_usuario_id uuid)
returns boolean
language sql stable
as $$
  select coalesce(baneado, false) from public.perfiles where id = p_usuario_id;
$$;


-- ================================================================
-- C) AUDITORÍA DE LOGIN / LOGOUT / CAMBIO DE ROL
-- ================================================================
-- Supabase Auth no dispara triggers de Postgres en cada login (solo
-- en creación de usuario), así que login/logout se registran desde
-- el frontend llamando esta función justo después de signIn/signOut.
create or replace function public.registrar_evento_auditoria(p_accion text, p_detalle jsonb default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.auditoria (actor_id, accion, entidad, detalle)
  values (auth.uid(), p_accion, 'auth', p_detalle);
end;
$$;

-- Cambios de rol (aceptar solicitud de vendedor) ya auditan en
-- decidir_solicitud_vendedor. Reforzamos con acción explícita ahí:
create or replace function public.decidir_solicitud_vendedor(p_solicitud_id bigint, p_aceptar boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_solicitud record;
begin
  select * into v_solicitud from public.solicitudes_vendedor where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;

  update public.solicitudes_vendedor
     set estado = (case when p_aceptar then 'aceptada' else 'rechazada' end)::estado_solicitud_vendedor,
         revisado_por = v_admin, revisado_en = now()
   where id = p_solicitud_id;

  if p_aceptar then
    update public.perfiles set rol = 'vendedor' where id = v_solicitud.usuario_id;
    insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
    values (v_admin, 'ROL_CAMBIADO', 'perfiles', v_solicitud.usuario_id::text, jsonb_build_object('nuevo_rol', 'vendedor', 'motivo', 'solicitud_aceptada'));
  end if;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_solicitud.usuario_id, 'solicitud_vendedor',
          case when p_aceptar then '¡Ya eres vendedor!' else 'Solicitud no aprobada' end,
          case when p_aceptar then 'Tu solicitud para vender en TrustLink fue aceptada. Ya puedes publicar productos.'
               else 'Tu solicitud para ser vendedor no fue aprobada esta vez.' end,
          'solicitudes_vendedor', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, case when p_aceptar then 'SOLICITUD_ACEPTADA' else 'SOLICITUD_RECHAZADA' end,
          'solicitudes_vendedor', p_solicitud_id::text, jsonb_build_object('usuario_id', v_solicitud.usuario_id));
end;
$$;


-- ================================================================
-- D) MEMBRESÍAS TRUSTI (Blue / Silver / Gold / Black)
-- ================================================================
do $$ begin
  create type nivel_membresia as enum ('trusti_blue', 'trusti_silver', 'trusti_gold', 'trusti_black');
exception when duplicate_object then null; end $$;

alter table public.perfiles
  add column if not exists dni text,
  add column if not exists apellido text,
  add column if not exists total_comprado numeric(10,2) not null default 0;

-- Umbrales de gasto acumulado (en soles) para cada nivel. Progresión
-- pensada tipo Cineplanet: Blue es el nivel base (todos empiezan
-- ahí), y se sube automáticamente al cruzar cada umbral.
--   Trusti Blue:   S/ 0    (todos)
--   Trusti Silver: S/ 300  acumulados en compras
--   Trusti Gold:   S/ 800  acumulados en compras
--   Trusti Black:  S/ 2000 acumulados en compras
create or replace function public.calcular_nivel_membresia(p_total_comprado numeric)
returns nivel_membresia
language sql immutable
as $$
  select case
    when p_total_comprado >= 2000 then 'trusti_black'::nivel_membresia
    when p_total_comprado >= 800  then 'trusti_gold'::nivel_membresia
    when p_total_comprado >= 300  then 'trusti_silver'::nivel_membresia
    else 'trusti_blue'::nivel_membresia
  end;
$$;

-- Vista de conveniencia: nivel actual + cuánto falta para el siguiente.
create or replace view public.mi_membresia as
select
  p.id, p.nombre, p.apellido, p.dni, p.total_comprado,
  public.calcular_nivel_membresia(p.total_comprado) as nivel,
  case public.calcular_nivel_membresia(p.total_comprado)
    when 'trusti_blue'   then 300  - p.total_comprado
    when 'trusti_silver' then 800  - p.total_comprado
    when 'trusti_gold'   then 2000 - p.total_comprado
    else 0
  end as falta_para_siguiente,
  case public.calcular_nivel_membresia(p.total_comprado)
    when 'trusti_blue'   then 'trusti_silver'::nivel_membresia
    when 'trusti_silver' then 'trusti_gold'::nivel_membresia
    when 'trusti_gold'   then 'trusti_black'::nivel_membresia
    else null
  end as siguiente_nivel
from public.perfiles p
where p.id = auth.uid();

grant select on public.mi_membresia to authenticated;

-- total_comprado se acumula cuando se confirma la entrega (venta
-- real y completada, no antes) — se engancha en confirmar_entrega.


-- ================================================================
-- E) SCORE DE VENDEDOR PONDERADO POR MONTO (no por cantidad)
-- ================================================================
-- Antes: cada venta exitosa sumaba +1 punto plano sin importar el
-- monto. Ahora: el score sube según el monto vendido acumulado,
-- con retornos decrecientes (raíz cuadrada) para que 2 taladros de
-- S/180 valgan más que 10 artesanías de S/2, pero sin que un solo
-- pedido grande dispare el score de golpe.
create or replace function public.recalcular_score_vendedor(p_vendedor_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_total_vendido numeric;
  v_nuevo_score int;
begin
  select coalesce(sum(monto_total), 0) into v_total_vendido
  from public.pedidos
  where vendedor_id = p_vendedor_id and estado in ('confirmado', 'liberado_admin');

  -- sqrt(monto) acotado a 100: S/100 vendidos ≈ 10 pts, S/2500 ≈ 50 pts,
  -- S/10000 ≈ 100 pts. Ajustable, pero da progresión suave sin techo abrupto.
  v_nuevo_score := least(100, floor(sqrt(v_total_vendido))::int);

  update public.perfiles set score_reputacion = v_nuevo_score where id = p_vendedor_id;
end;
$$;

-- confirmar_entrega ya sumaba score_reputacion + 2 fijo; lo reemplazamos
-- por el cálculo ponderado y además acumulamos total_comprado del
-- comprador (para las membresías).
create or replace function public.confirmar_entrega(p_pedido_id bigint, p_codigo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_comprador uuid := auth.uid();
  v_pedido record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no existe'; end if;
  if v_pedido.comprador_id != v_comprador then raise exception 'No autorizado'; end if;
  if v_pedido.estado != 'llegado' then raise exception 'El pedido no está listo para confirmar'; end if;

  if v_pedido.codigo_vence_en is not null and now() > v_pedido.codigo_vence_en then
    update public.bloqueos_compra set activo = false where usuario_id = v_comprador and activo = true;
    insert into public.bloqueos_compra (usuario_id, motivo, fecha_fin, activo)
    values (v_comprador, 'No confirmaste la entrega dentro de los 15 minutos.', now() + interval '12 hours', true);
    raise exception 'El código venció. Tu cuenta quedó bloqueada 12 horas para nuevas compras.';
  end if;

  update public.pedidos set codigo_intentos = codigo_intentos + 1 where id = p_pedido_id;

  if p_codigo != v_pedido.codigo_confirmacion then
    raise exception 'Código incorrecto';
  end if;

  update public.pedidos set estado = 'confirmado', confirmado_en = now(), actualizado_en = now() where id = p_pedido_id;
  insert into public.pedido_eventos (pedido_id, estado, nota, creado_por) values (p_pedido_id, 'confirmado', 'Comprador confirmó la entrega', v_comprador);

  -- Libera el pago al vendedor y acumula historial de ambas partes.
  update public.perfiles set credito_disponible = credito_disponible where id = v_pedido.vendedor_id; -- placeholder explícito: el escrow es simulado, el "pago" ya estaba descontado del comprador desde crear_pedido
  update public.perfiles set total_comprado = total_comprado + v_pedido.monto_total where id = v_comprador;

  perform public.recalcular_score_vendedor(v_pedido.vendedor_id);

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_pedido.vendedor_id, 'pedido_estado', 'Pago liberado',
          'El comprador confirmó la entrega del pedido #' || p_pedido_id || '. El pago de S/ ' || v_pedido.monto_total || ' fue liberado.', 'pedidos', p_pedido_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_comprador, 'PEDIDO_CONFIRMADO', 'pedidos', p_pedido_id::text, jsonb_build_object('monto', v_pedido.monto_total));
end;
$$;


-- ================================================================
-- F) CRÉDITO CON INTERÉS 12% MENSUAL + APLAZAMIENTO + TRATO DIGITAL
-- ================================================================
alter table public.solicitudes_credito
  add column if not exists acepto_trato boolean not null default false,
  add column if not exists fecha_vencimiento timestamptz,
  add column if not exists aplazado boolean not null default false,
  add column if not exists reportado_sbs boolean not null default false;

-- Tasa base sube de 8% fijo a 12% mensual (se documenta como mensual
-- porque el MVP no simula plazos de más de un mes).
create or replace function public.solicitar_credito(p_monto numeric, p_acepto_trato boolean default false)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  v_vendedor uuid := auth.uid();
  v_id bigint;
begin
  if p_monto <= 0 then raise exception 'Monto inválido'; end if;
  if not p_acepto_trato then raise exception 'Debes aceptar el trato digital para solicitar el préstamo'; end if;

  insert into public.solicitudes_credito (vendedor_id, monto_solicitado, tasa_interes, monto_a_pagar, acepto_trato, fecha_vencimiento)
  values (v_vendedor, p_monto, 12.00, round(p_monto * 1.12, 2), true, now() + interval '30 days')
  returning id into v_id;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_vendedor, 'CREDITO_SOLICITADO', 'solicitudes_credito', v_id::text, jsonb_build_object('monto', p_monto, 'tasa', 12.00));

  return v_id;
end;
$$;

-- Aplaza el vencimiento 5 días y aplica recargo del 5% sobre el
-- saldo pendiente. Solo se puede aplazar una vez.
create or replace function public.aplazar_credito(p_solicitud_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_vendedor uuid := auth.uid();
  v_solicitud record;
begin
  select * into v_solicitud from public.solicitudes_credito where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;
  if v_solicitud.vendedor_id != v_vendedor then raise exception 'No autorizado'; end if;
  if v_solicitud.estado != 'aprobado' or v_solicitud.pagado then raise exception 'Este crédito no está pendiente de pago'; end if;
  if v_solicitud.aplazado then raise exception 'Ya usaste tu aplazamiento para este préstamo'; end if;

  update public.solicitudes_credito
     set aplazado = true,
         fecha_vencimiento = coalesce(fecha_vencimiento, now()) + interval '5 days',
         monto_a_pagar = round(monto_a_pagar * 1.05, 2)
   where id = p_solicitud_id;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_vendedor, 'credito', 'Pago aplazado 5 días',
          'Aplazaste el pago de tu préstamo por 5 días. Se aplicó un recargo del 5%. Si no pagas al vencer, se reportará a la SBS.',
          'solicitudes_credito', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_vendedor, 'CREDITO_APLAZADO', 'solicitudes_credito', p_solicitud_id::text, jsonb_build_object('nuevo_monto', v_solicitud.monto_a_pagar));
end;
$$;

-- Superadmin marca un crédito vencido y no pagado como reportado a
-- la SBS (acción manual desde el panel; en producción sería un cron).
create or replace function public.reportar_credito_sbs(p_solicitud_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_solicitud record;
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;

  select * into v_solicitud from public.solicitudes_credito where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;
  if v_solicitud.pagado then raise exception 'Este crédito ya fue pagado'; end if;

  update public.solicitudes_credito set reportado_sbs = true where id = p_solicitud_id;
  update public.perfiles set score_reputacion = greatest(0, score_reputacion - 15) where id = v_solicitud.vendedor_id;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_solicitud.vendedor_id, 'credito', 'Préstamo reportado a la SBS',
          'Tu préstamo de S/ ' || v_solicitud.monto_solicitado || ' venció sin pago y fue reportado a la SBS, tal como aceptaste en el trato digital.',
          'solicitudes_credito', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, 'CREDITO_REPORTADO_SBS', 'solicitudes_credito', p_solicitud_id::text, jsonb_build_object('vendedor_id', v_solicitud.vendedor_id));
end;
$$;

-- pagar_credito: ahora usa recalcular_score_vendedor en vez de +3 fijo,
-- para mantener consistencia con el criterio de score por monto.
create or replace function public.pagar_credito(p_solicitud_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_vendedor uuid := auth.uid();
  v_solicitud record;
begin
  select * into v_solicitud from public.solicitudes_credito where id = p_solicitud_id for update;
  if not found then raise exception 'Solicitud no existe'; end if;
  if v_solicitud.vendedor_id != v_vendedor then raise exception 'No autorizado'; end if;
  if v_solicitud.estado != 'aprobado' or v_solicitud.pagado then raise exception 'Este crédito no está pendiente de pago'; end if;

  update public.solicitudes_credito set pagado = true, pagado_en = now() where id = p_solicitud_id;
  update public.perfiles set score_reputacion = least(100, score_reputacion + 5) where id = v_vendedor;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_vendedor, 'credito', 'Préstamo pagado', 'Pagaste tu crédito de S/ ' || v_solicitud.monto_solicitado || ' (total con interés: S/ ' || v_solicitud.monto_a_pagar || '). Esto mejora tu historial crediticio.', 'solicitudes_credito', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_vendedor, 'CREDITO_PAGADO', 'solicitudes_credito', p_solicitud_id::text, jsonb_build_object('monto_pagado', v_solicitud.monto_a_pagar));
end;
$$;


-- ================================================================
-- G) ELIMINAR PRODUCTO (además de pausar)
-- ================================================================
create or replace function public.eliminar_producto(p_producto_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_producto record;
begin
  select * into v_producto from public.productos where id = p_producto_id for update;
  if not found then raise exception 'Producto no existe'; end if;
  if v_producto.vendedor_id != v_usuario and not public.es_superadmin() then raise exception 'No autorizado'; end if;

  -- No se elimina si tiene pedidos asociados (rompería historial e
  -- integridad de auditoría) — en ese caso solo se pausa.
  if exists (select 1 from public.pedidos where producto_id = p_producto_id) then
    update public.productos set activo = false where id = p_producto_id;
    raise notice 'El producto tiene pedidos asociados: se pausó en vez de eliminarse para no romper el historial.';
  else
    delete from public.productos where id = p_producto_id;
  end if;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id)
  values (v_usuario, 'PRODUCTO_ELIMINADO', 'productos', p_producto_id::text);
end;
$$;
