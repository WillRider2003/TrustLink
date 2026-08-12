-- ============================================================
-- TRUSTLINK — FUNCIONES Y TRIGGERS
-- ============================================================
-- Ejecutar después de 01_schema.sql
-- ============================================================

-- ---------- 1. Crear perfil automáticamente al registrarse ----------
-- Se dispara cuando Supabase Auth crea un nuevo usuario (signup).
-- Lee nombre/telefono de los metadatos que manda el frontend en el signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, telefono, rol, credito_disponible, credito_limite)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario TrustLink'),
    new.raw_user_meta_data->>'telefono',
    'comprador',
    230.00,
    230.00
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------- 2. Helper: ¿el usuario tiene un bloqueo de compra vigente? ----------
create or replace function public.usuario_bloqueado(p_usuario_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.bloqueos_compra
    where usuario_id = p_usuario_id and activo = true and fecha_fin > now()
  );
$$;

create or replace function public.bloqueo_vigente(p_usuario_id uuid)
returns table(motivo text, fecha_fin timestamptz)
language sql stable
as $$
  select motivo, fecha_fin from public.bloqueos_compra
  where usuario_id = p_usuario_id and activo = true and fecha_fin > now()
  order by fecha_fin desc limit 1;
$$;


-- ---------- 3. Crear pedido: valida crédito, descuenta saldo, registra evento + notificación ----------
create or replace function public.crear_pedido(
  p_producto_id bigint,
  p_cantidad int default 1
)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  v_comprador uuid := auth.uid();
  v_producto record;
  v_monto numeric(10,2);
  v_codigo text;
  v_pedido_id bigint;
begin
  if v_comprador is null then
    raise exception 'No autenticado';
  end if;

  if public.usuario_bloqueado(v_comprador) then
    raise exception 'Tu cuenta tiene compras bloqueadas temporalmente. Revisa tus notificaciones.';
  end if;

  select * into v_producto from public.productos where id = p_producto_id and activo = true for update;
  if not found then
    raise exception 'Producto no disponible';
  end if;
  if v_producto.stock < p_cantidad then
    raise exception 'No hay stock suficiente';
  end if;
  if v_producto.vendedor_id = v_comprador then
    raise exception 'No puedes comprarte a ti mismo';
  end if;

  v_monto := v_producto.precio * p_cantidad;

  -- Verifica y descuenta crédito disponible del comprador
  update public.perfiles
     set credito_disponible = credito_disponible - v_monto
   where id = v_comprador and credito_disponible >= v_monto
   returning credito_disponible into v_monto; -- reutilizamos la variable solo para el chequeo de FOUND
  if not found then
    raise exception 'Crédito insuficiente para esta compra';
  end if;

  v_monto := v_producto.precio * p_cantidad;

  -- Código de confirmación de 6 dígitos
  v_codigo := lpad(floor(random() * 1000000)::text, 6, '0');

  update public.productos set stock = stock - p_cantidad where id = p_producto_id;

  insert into public.pedidos (comprador_id, vendedor_id, producto_id, cantidad, monto_total, estado, codigo_confirmacion)
  values (v_comprador, v_producto.vendedor_id, p_producto_id, p_cantidad, v_monto, 'creado', v_codigo)
  returning id into v_pedido_id;

  insert into public.pedido_eventos (pedido_id, estado, nota, creado_por)
  values (v_pedido_id, 'creado', 'Pago retenido en garantía. Esperando envío del vendedor.', v_comprador);

  delete from public.carrito_items where usuario_id = v_comprador and producto_id = p_producto_id;

  -- Notificación al comprador con el código (lo necesitará al llegar el pedido)
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_comprador, 'codigo_entrega', 'Guarda tu código de confirmación',
          'Tu código para confirmar la entrega del pedido #' || v_pedido_id || ' es: ' || v_codigo || '. Lo necesitarás cuando el vendedor marque el pedido como "llegado". Tendrás 15 minutos para ingresarlo.',
          'pedidos', v_pedido_id);

  -- Notificación al vendedor
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_producto.vendedor_id, 'pedido_estado', 'Nuevo pedido recibido',
          'Tienes un nuevo pedido #' || v_pedido_id || ' por S/ ' || v_monto || '. El pago ya está retenido en garantía.',
          'pedidos', v_pedido_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_comprador, 'PEDIDO_CREADO', 'pedidos', v_pedido_id::text,
          jsonb_build_object('monto', v_monto, 'producto_id', p_producto_id, 'vendedor_id', v_producto.vendedor_id));

  return v_pedido_id;
end;
$$;


-- ---------- 4. Vendedor avanza el estado del pedido (enviado / en_camino / llegado) ----------
create or replace function public.avanzar_pedido(p_pedido_id bigint, p_nuevo_estado estado_pedido)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_vendedor uuid := auth.uid();
  v_pedido record;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido no existe'; end if;
  if v_pedido.vendedor_id != v_vendedor then raise exception 'No autorizado'; end if;

  if v_pedido.estado = 'creado' and p_nuevo_estado = 'enviado' then
    -- ok
  elsif v_pedido.estado = 'enviado' and p_nuevo_estado = 'en_camino' then
    -- ok
  elsif v_pedido.estado = 'en_camino' and p_nuevo_estado = 'llegado' then
    -- arranca el timer de 15 minutos para que el comprador confirme
    update public.pedidos
       set estado = 'llegado', llegado_en = now(), codigo_vence_en = now() + interval '15 minutes', actualizado_en = now()
     where id = p_pedido_id;

    insert into public.pedido_eventos (pedido_id, estado, nota, creado_por)
    values (p_pedido_id, 'llegado', 'El vendedor marcó el pedido como entregado. El comprador tiene 15 minutos para confirmar con el código.', v_vendedor);

    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
    values (v_pedido.comprador_id, 'codigo_entrega', '¡Tu pedido llegó! Ingresa tu código',
            'Tienes 15 minutos para confirmar la entrega del pedido #' || p_pedido_id || ' con tu código de 6 dígitos, o tu cuenta quedará bloqueada para nuevas compras por 12 horas.',
            'pedidos', p_pedido_id);

    insert into public.auditoria (actor_id, accion, entidad, entidad_id)
    values (v_vendedor, 'PEDIDO_LLEGADO', 'pedidos', p_pedido_id::text);
    return;
  else
    raise exception 'Transición de estado no permitida (% -> %)', v_pedido.estado, p_nuevo_estado;
  end if;

  update public.pedidos set estado = p_nuevo_estado, actualizado_en = now() where id = p_pedido_id;
  insert into public.pedido_eventos (pedido_id, estado, creado_por) values (p_pedido_id, p_nuevo_estado, v_vendedor);

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_pedido.comprador_id, 'pedido_estado', 'Tu pedido #' || p_pedido_id || ' cambió de estado',
          case p_nuevo_estado when 'enviado' then 'El vendedor envió tu pedido.' when 'en_camino' then 'Tu pedido está en camino.' else '' end,
          'pedidos', p_pedido_id);
end;
$$;


-- ---------- 5. Comprador confirma con el código de 6 dígitos ----------
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
  if v_pedido.estado != 'llegado' then raise exception 'El pedido no está esperando confirmación'; end if;

  -- Si ya venció el timer de 15 minutos, bloquea al comprador por 12h y corta acá.
  if v_pedido.codigo_vence_en is not null and now() > v_pedido.codigo_vence_en then
    update public.bloqueos_compra set activo = false where usuario_id = v_comprador and activo = true;
    insert into public.bloqueos_compra (usuario_id, motivo, fecha_fin, activo)
    values (v_comprador, 'No confirmó la entrega del pedido #' || p_pedido_id || ' dentro de los 15 minutos', now() + interval '12 hours', true);

    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
    values (v_comprador, 'bloqueo', 'Cuenta bloqueada temporalmente',
            'No confirmaste el pedido #' || p_pedido_id || ' a tiempo. No podrás realizar nuevas compras durante 12 horas.',
            'pedidos', p_pedido_id);

    insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
    values (v_comprador, 'BLOQUEO_12H_AUTOMATICO', 'pedidos', p_pedido_id::text, jsonb_build_object('motivo','timeout_codigo'));

    raise exception 'El tiempo para confirmar venció. Tu cuenta fue bloqueada 12 horas para nuevas compras.';
  end if;

  update public.pedidos set codigo_intentos = codigo_intentos + 1 where id = p_pedido_id;

  if p_codigo != v_pedido.codigo_confirmacion then
    raise exception 'Código incorrecto';
  end if;

  update public.pedidos set estado = 'confirmado', confirmado_en = now(), actualizado_en = now() where id = p_pedido_id;
  insert into public.pedido_eventos (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'confirmado', 'Entrega confirmada por el comprador. Pago liberado al vendedor.', v_comprador);

  -- Libera el pago "on-chain simulado" al vendedor y suma reputación
  update public.perfiles set credito_disponible = credito_disponible + 0 where id = v_pedido.vendedor_id; -- placeholder simétrico (el vendedor no usa crédito de compra)
  update public.perfiles set score_reputacion = least(100, score_reputacion + 2) where id = v_pedido.vendedor_id;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_pedido.vendedor_id, 'pedido_estado', 'Pago liberado',
          'El comprador confirmó la entrega del pedido #' || p_pedido_id || '. El pago de S/ ' || v_pedido.monto_total || ' fue liberado.',
          'pedidos', p_pedido_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_comprador, 'PEDIDO_CONFIRMADO', 'pedidos', p_pedido_id::text, jsonb_build_object('monto', v_pedido.monto_total));
end;
$$;


-- ---------- 6. Superadmin resuelve una disputa/incidencia de pedido ----------
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
     set estado = case when p_favor_comprador then 'resuelta_comprador' else 'resuelta_vendedor' end,
         resolucion = p_resolucion, resuelto_por = v_admin, resuelto_en = now()
   where id = p_incidencia_id;

  if v_incidencia.pedido_id is not null then
    select * into v_pedido from public.pedidos where id = v_incidencia.pedido_id for update;
    if found and v_pedido.estado = 'en_disputa' then
      if p_favor_comprador then
        update public.pedidos set estado = 'reembolsado', actualizado_en = now() where id = v_pedido.id;
        update public.perfiles set credito_disponible = credito_disponible + v_pedido.monto_total where id = v_pedido.comprador_id;
        insert into public.pedido_eventos (pedido_id, estado, nota, creado_por) values (v_pedido.id, 'reembolsado', p_resolucion, v_admin);
      else
        update public.pedidos set estado = 'liberado_admin', actualizado_en = now() where id = v_pedido.id;
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


-- ---------- 7. Superadmin aprueba/rechaza solicitud de vendedor ----------
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
     set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
         revisado_por = v_admin, revisado_en = now()
   where id = p_solicitud_id;

  if p_aceptar then
    update public.perfiles set rol = 'vendedor' where id = v_solicitud.usuario_id;
  end if;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_solicitud.usuario_id, 'solicitud_vendedor',
          case when p_aceptar then 'Ya eres vendedor en TrustLink' else 'Tu solicitud fue rechazada' end,
          case when p_aceptar then 'Tu solicitud fue aprobada. Cierra sesión y vuelve a entrar para ver tu panel de vendedor.'
               else 'Tu solicitud para ser vendedor no fue aprobada esta vez. Puedes enviar una nueva.' end,
          'solicitudes_vendedor', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, case when p_aceptar then 'SOLICITUD_VENDEDOR_ACEPTADA' else 'SOLICITUD_VENDEDOR_RECHAZADA' end,
          'solicitudes_vendedor', p_solicitud_id::text, jsonb_build_object('usuario_id', v_solicitud.usuario_id));
end;
$$;


-- ---------- 8. Crédito: vendedor solicita, superadmin aprueba, vendedor paga con interés ----------
create or replace function public.solicitar_credito(p_monto numeric)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  v_vendedor uuid := auth.uid();
  v_id bigint;
begin
  if p_monto <= 0 then raise exception 'Monto inválido'; end if;

  insert into public.solicitudes_credito (vendedor_id, monto_solicitado, monto_a_pagar)
  values (v_vendedor, p_monto, round(p_monto * 1.08, 2))
  returning id into v_id;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_vendedor, 'CREDITO_SOLICITADO', 'solicitudes_credito', v_id::text, jsonb_build_object('monto', p_monto));

  return v_id;
end;
$$;

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
     set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
         aprobado_por = v_admin, aprobado_en = now()
   where id = p_solicitud_id;

  if p_aprobar then
    update public.perfiles set credito_disponible = credito_disponible + v_solicitud.monto_solicitado where id = v_solicitud.vendedor_id;
  end if;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_solicitud.vendedor_id, 'credito',
          case when p_aprobar then 'Crédito aprobado' else 'Crédito rechazado' end,
          case when p_aprobar then 'Se aprobó tu crédito de S/ ' || v_solicitud.monto_solicitado || '. Deberás pagar S/ ' || v_solicitud.monto_a_pagar || ' (incluye interés).'
               else 'Tu solicitud de crédito no fue aprobada esta vez.' end,
          'solicitudes_credito', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_admin, case when p_aprobar then 'CREDITO_APROBADO' else 'CREDITO_RECHAZADO' end,
          'solicitudes_credito', p_solicitud_id::text, jsonb_build_object('vendedor_id', v_solicitud.vendedor_id));
end;
$$;

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
  update public.perfiles set score_reputacion = least(100, score_reputacion + 3) where id = v_vendedor;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tabla, referencia_id)
  values (v_vendedor, 'credito', 'Préstamo pagado', 'Pagaste tu crédito de S/ ' || v_solicitud.monto_solicitado || ' (total con interés: S/ ' || v_solicitud.monto_a_pagar || '). Esto mejora tu historial crediticio.', 'solicitudes_credito', p_solicitud_id);

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_vendedor, 'CREDITO_PAGADO', 'solicitudes_credito', p_solicitud_id::text, jsonb_build_object('monto_pagado', v_solicitud.monto_a_pagar));
end;
$$;


-- ---------- 9. Reportar incidencia (comprador o vendedor) ----------
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
begin
  select rol into v_rol from public.perfiles where id = v_usuario;

  if p_pedido_id is not null then
    select * into v_pedido from public.pedidos where id = p_pedido_id for update;
    if found and v_pedido.comprador_id != v_usuario and v_pedido.vendedor_id != v_usuario then
      raise exception 'No autorizado sobre este pedido';
    end if;
    if found and v_pedido.estado not in ('reembolsado','liberado_admin','cancelado') then
      update public.pedidos set estado = 'en_disputa', actualizado_en = now() where id = p_pedido_id;
      insert into public.pedido_eventos (pedido_id, estado, nota, creado_por)
      values (p_pedido_id, 'en_disputa', 'Incidencia reportada: ' || p_categoria, v_usuario);
    end if;
  end if;

  insert into public.incidencias (pedido_id, reportado_por, rol_reportante, categoria, descripcion)
  values (p_pedido_id, v_usuario, v_rol, p_categoria, p_descripcion)
  returning id into v_id;

  insert into public.auditoria (actor_id, accion, entidad, entidad_id, detalle)
  values (v_usuario, 'INCIDENCIA_REPORTADA', 'incidencias', v_id::text, jsonb_build_object('categoria', p_categoria, 'pedido_id', p_pedido_id));

  return v_id;
end;
$$;
