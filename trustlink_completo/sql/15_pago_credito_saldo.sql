-- =============================================================
-- 15 — PAGO DE CRÉDITO: DESCONTAR DEL SALDO DISPONIBLE
-- Correr después del 01-14.
--
-- Bug arreglado: pagar_credito marcaba el crédito como pagado y
-- subía la reputación, pero NUNCA restaba el monto pagado
-- (capital + interés) de perfiles.credito_disponible — por eso el
-- saldo del sidebar seguía igual después de pagar.
--
-- Ahora:
--   1. Valida que el vendedor tenga saldo suficiente para pagar.
--   2. Descuenta monto_a_pagar de credito_disponible (atómico).
-- =============================================================

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

  -- Descuenta el pago (capital + interés) del saldo disponible.
  -- El UPDATE condicionado garantiza atomicidad: si no hay saldo
  -- suficiente, no se modifica nada y se lanza el error.
  update public.perfiles
     set credito_disponible = credito_disponible - v_solicitud.monto_a_pagar
   where id = v_vendedor and credito_disponible >= v_solicitud.monto_a_pagar;
  if not found then
    raise exception 'Saldo insuficiente: necesitas S/ % disponibles para pagar este crédito', v_solicitud.monto_a_pagar;
  end if;

  update public.solicitudes_credito set pagado = true, pagado_en = now() where id = p_solicitud_id;
  update public.perfiles set score_reputacion = least(100, score_reputacion + 5) where id = v_vendedor;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_vendedor, 'credito', 'Préstamo pagado', 'Pagaste tu crédito de S/ ' || v_solicitud.monto_solicitado || ' (total con interés: S/ ' || v_solicitud.monto_a_pagar || '). El monto se descontó de tu saldo disponible.', 'solicitudes_credito', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_vendedor, 'CREDITO_PAGADO', 'solicitudes_credito', p_solicitud_id::text, jsonb_build_object('monto_pagado', v_solicitud.monto_a_pagar));
end;
$$;
