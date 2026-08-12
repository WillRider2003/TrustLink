-- ============================================================
-- TRUSTLINK — FIX: notificación faltante al reportar incidencia
-- ============================================================
-- Ejecutar en Supabase → SQL Editor, después de 01-07.
--
-- DIAGNÓSTICO (verificación del sistema de notificaciones):
-- Todas las demás acciones de negocio notifican a las partes
-- afectadas: crear_pedido, avanzar_pedido, confirmar_entrega,
-- resolver_incidencia, decidir_solicitud_vendedor, decidir_credito
-- y pagar_credito insertan en public.notificaciones. La única
-- excepción era reportar_incidencia (sql/02_funciones.sql): abre
-- la disputa, cambia el pedido a 'en_disputa', pero nunca avisaba
-- a la otra parte del pedido. Resultado real: si el comprador
-- reportaba una incidencia, el vendedor no se enteraba salvo que
-- entrara manualmente a revisar el pedido (y viceversa).
--
-- Este script redefine la función (mismo nombre y firma, por eso
-- "create or replace" es seguro de re-ejecutar) agregando la
-- notificación a la contraparte del pedido cuando corresponde.
-- No se notifica al superadmin aquí a propósito: ninguna otra
-- solicitud pendiente (crédito, ser vendedor) lo hace tampoco en
-- este proyecto — el panel de admin se revisa directamente — así
-- que se mantiene ese mismo criterio para no romper el patrón
-- existente.
-- ============================================================

create or replace function public.reportar_incidencia(
  p_pedido_id bigint,
  p_categoria text,
  p_descripcion text
)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_pedido record;
  v_rol rol_usuario;
  v_id bigint;
  v_contraparte uuid;
  v_pedido_encontrado boolean := false;
begin
  select rol into v_rol from public.perfiles where id = v_usuario;

  if p_pedido_id is not null then
    select * into v_pedido from public.pedidos where id = p_pedido_id for update;
    v_pedido_encontrado := found;
    if v_pedido_encontrado and v_pedido.comprador_id != v_usuario and v_pedido.vendedor_id != v_usuario then
      raise exception 'No autorizado sobre este pedido';
    end if;
    if v_pedido_encontrado and v_pedido.estado not in ('reembolsado','liberado_admin','cancelado') then
      update public.pedidos set estado = 'en_disputa', actualizado_en = now() where id = p_pedido_id;
      insert into public.pedido_eventos (pedido_id, estado, nota, creado_por)
      values (p_pedido_id, 'en_disputa', 'Incidencia reportada: ' || p_categoria, v_usuario);
    end if;
  end if;

  insert into public.incidencias (pedido_id, reportado_por, rol_reportante, categoria, descripcion)
  values (p_pedido_id, v_usuario, v_rol, p_categoria, p_descripcion)
  returning id into v_id;

  -- Notifica a la contraparte del pedido (si la incidencia está
  -- ligada a un pedido y hay otra parte distinta de quien reporta).
  if v_pedido_encontrado then
    v_contraparte := case when v_pedido.comprador_id = v_usuario then v_pedido.vendedor_id else v_pedido.comprador_id end;
    if v_contraparte is not null then
      insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
      values (v_contraparte, 'incidencia', 'Se abrió una incidencia sobre tu pedido #' || p_pedido_id,
              'Se reportó una incidencia (' || p_categoria || ') sobre el pedido #' || p_pedido_id || '. Un superadmin la va a revisar y resolver.',
              'incidencias', v_id);
    end if;
  end if;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_usuario, 'INCIDENCIA_REPORTADA', 'incidencias', v_id::text, jsonb_build_object('categoria', p_categoria, 'pedido_id', p_pedido_id));

  return v_id;
end;
$$;
