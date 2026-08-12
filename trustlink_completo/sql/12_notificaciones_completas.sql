-- ============================================================
-- TRUSTLINK — MIGRACIÓN 12: NOTIFICACIONES COMPLETAS
-- ============================================================
-- Ejecutar en Supabase → SQL Editor, después de 01-11.
--
-- Arregla dos huecos de notificación reportados:
--
-- A) Al solicitar un crédito, ningún superadmin se enteraba —
--    tenían que entrar manualmente al panel de Créditos pendientes
--    para verlo. Ahora se notifica a todos los superadmin, igual
--    que ya se hace con incidencias (sql/11).
--
-- B) Al resolver una incidencia, la notificación de "resuelta" solo
--    se enviaba si la incidencia tenía un pedido asociado Y ese
--    pedido seguía en estado 'en_disputa' en ese momento. Una
--    incidencia sin pedido (o cuyo pedido ya había cambiado de
--    estado por otro motivo) se resolvía en silencio: quien la
--    reportó nunca se enteraba. Ahora la notificación a quien
--    reportó (y a la contraparte del pedido, si existe) es
--    incondicional.
-- ============================================================

-- ---------- A) Notifica a todos los superadmin al solicitar crédito ----------
create or replace function public.solicitar_credito(p_monto numeric, p_acepto_trato boolean default false)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  v_vendedor uuid := auth.uid();
  v_nombre_vendedor text;
  v_id bigint;
  v_admin_id uuid;
begin
  if p_monto <= 0 then raise exception 'Monto inválido'; end if;
  if not p_acepto_trato then raise exception 'Debes aceptar el trato digital para solicitar el préstamo'; end if;

  select nombre into v_nombre_vendedor from public.perfiles where id = v_vendedor;

  insert into public.solicitudes_credito (vendedor_id, monto_solicitado, tasa_interes, monto_a_pagar, acepto_trato, fecha_vencimiento)
  values (v_vendedor, p_monto, 12.00, round(p_monto * 1.12, 2), true, now() + interval '30 days')
  returning id into v_id;

  for v_admin_id in select id from public.perfiles where rol = 'superadmin'
  loop
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
    values (v_admin_id, 'credito', 'Nueva solicitud de crédito',
            coalesce(v_nombre_vendedor, 'Un vendedor') || ' solicitó S/ ' || p_monto || ' de crédito. Revísalo en Créditos pendientes.',
            'solicitudes_credito', v_id);
  end loop;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_vendedor, 'CREDITO_SOLICITADO', 'solicitudes_credito', v_id::text, jsonb_build_object('monto', p_monto, 'tasa', 12.00));

  return v_id;
end;
$$;

-- ---------- B) Notificación de resolución de incidencia, incondicional ----------
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
  v_pedido_encontrado boolean := false;
  v_contraparte uuid;
  v_sufijo text;
begin
  select * into v_incidencia from public.incidencias where id = p_incidencia_id for update;
  if not found then raise exception 'Incidencia no existe'; end if;

  update public.incidencias
     set estado = (case when p_favor_comprador then 'resuelta_comprador' else 'resuelta_vendedor' end)::estado_incidencia,
         resolucion = p_resolucion, resuelto_por = v_admin, resuelto_en = now()
   where id = p_incidencia_id;

  if v_incidencia.pedido_id is not null then
    select * into v_pedido from public.pedidos where id = v_incidencia.pedido_id for update;
    v_pedido_encontrado := found;
    if v_pedido_encontrado and v_pedido.estado = 'en_disputa' then
      if p_favor_comprador then
        update public.pedidos set estado = 'reembolsado'::estado_pedido, actualizado_en = now() where id = v_pedido.id;
        update public.perfiles set credito_disponible = credito_disponible + v_pedido.monto_total where id = v_pedido.comprador_id;
        insert into public.pedido_eventos (pedido_id, estado, nota, creado_por) values (v_pedido.id, 'reembolsado', p_resolucion, v_admin);
      else
        update public.pedidos set estado = 'liberado_admin'::estado_pedido, actualizado_en = now() where id = v_pedido.id;
        update public.perfiles set score_reputacion = least(100, score_reputacion + 1) where id = v_pedido.vendedor_id;
        insert into public.pedido_eventos (pedido_id, estado, nota, creado_por) values (v_pedido.id, 'liberado_admin', p_resolucion, v_admin);
      end if;
    end if;
  end if;

  v_sufijo := case when p_favor_comprador then ' (a favor del comprador)' else ' (a favor del vendedor)' end;

  -- Antes esta notificación vivía DENTRO del `if ... estado = 'en_disputa'`
  -- de arriba, así que una incidencia sin pedido, o con pedido que ya
  -- había cambiado de estado, se resolvía sin avisarle a nadie. Ahora
  -- siempre se notifica a quien reportó la incidencia.
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_incidencia.reportado_por, 'incidencia', 'Tu incidencia fue resuelta', p_resolucion || v_sufijo, 'incidencias', p_incidencia_id);

  -- Y a la contraparte del pedido (si existe y es distinta de quien reportó).
  if v_pedido_encontrado then
    v_contraparte := case when v_pedido.comprador_id = v_incidencia.reportado_por then v_pedido.vendedor_id else v_pedido.comprador_id end;
    if v_contraparte is not null and v_contraparte != v_incidencia.reportado_por then
      insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
      values (v_contraparte, 'incidencia', 'Incidencia resuelta', p_resolucion || v_sufijo, 'incidencias', p_incidencia_id);
    end if;
  end if;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, 'INCIDENCIA_RESUELTA', 'incidencias', p_incidencia_id::text,
          jsonb_build_object('favor_comprador', p_favor_comprador, 'resolucion', p_resolucion));
end;
$$;
