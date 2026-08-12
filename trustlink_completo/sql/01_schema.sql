-- ============================================================
-- TRUSTLINK — SCHEMA COMPLETO (Supabase / PostgreSQL)
-- ============================================================
-- Ejecutar este archivo completo en el SQL Editor de Supabase,
-- de una sola vez, en un proyecto nuevo. Ver PDF de despliegue
-- para el paso a paso completo.
-- ============================================================

-- ---------- EXTENSIONES ----------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------- TIPOS ----------
do $$ begin
  create type rol_usuario as enum ('comprador', 'vendedor', 'superadmin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_solicitud_vendedor as enum ('pendiente', 'aceptada', 'rechazada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_pedido as enum (
    'creado',           -- se creó la orden, pago retenido en garantía
    'enviado',          -- el vendedor marcó que lo envió
    'en_camino',        -- en camino al comprador
    'llegado',          -- el vendedor marcó que llegó (arranca el timer de 15 min)
    'confirmado',       -- el comprador validó el código -> pago liberado
    'en_disputa',       -- alguna de las partes reportó una incidencia
    'reembolsado',      -- superadmin resolvió a favor del comprador
    'liberado_admin',   -- superadmin resolvió a favor del vendedor
    'cancelado'         -- cancelado antes de enviarse
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_incidencia as enum ('abierta', 'en_revision', 'resuelta_comprador', 'resuelta_vendedor', 'descartada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_credito as enum ('pendiente', 'aprobado', 'rechazado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_notificacion as enum (
    'codigo_entrega', 'pedido_estado', 'bloqueo', 'solicitud_vendedor',
    'incidencia', 'credito', 'sistema'
  );
exception when duplicate_object then null; end $$;

-- ---------- PERFILES (extiende auth.users de Supabase) ----------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text,
  rol rol_usuario not null default 'comprador',
  credito_disponible numeric(10,2) not null default 230.00, -- saldo demo inicial
  credito_limite numeric(10,2) not null default 230.00,
  score_reputacion int not null default 0 check (score_reputacion between 0 and 100),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.perfiles is 'Perfil extendido de cada usuario. Todo usuario nuevo arranca como comprador con S/230 de crédito demo.';

-- ---------- BLOQUEOS DE COMPRA (patrón QuintaOla: activo + fecha_fin > now()) ----------
create table if not exists public.bloqueos_compra (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  motivo text not null,
  fecha_fin timestamptz not null,
  activo boolean not null default true,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);
create index if not exists idx_bloqueos_usuario_activo on public.bloqueos_compra(usuario_id, activo, fecha_fin);

-- ---------- SOLICITUDES PARA SER VENDEDOR ----------
create table if not exists public.solicitudes_vendedor (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  dni text not null,
  rubro text not null,
  descripcion text,
  estado estado_solicitud_vendedor not null default 'pendiente',
  revisado_por uuid references public.perfiles(id),
  revisado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists idx_solicitudes_estado on public.solicitudes_vendedor(estado);

-- ---------- PRODUCTOS ----------
create table if not exists public.productos (
  id bigint generated always as identity primary key,
  vendedor_id uuid not null references public.perfiles(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null check (precio > 0),
  categoria text,
  imagen_url text,
  stock int not null default 1 check (stock >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index if not exists idx_productos_vendedor on public.productos(vendedor_id);
create index if not exists idx_productos_activo on public.productos(activo);

-- ---------- CARRITO ----------
create table if not exists public.carrito_items (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  producto_id bigint not null references public.productos(id) on delete cascade,
  cantidad int not null default 1 check (cantidad > 0),
  agregado_en timestamptz not null default now(),
  unique (usuario_id, producto_id)
);

-- ---------- PEDIDOS (la orden con escrow simulado) ----------
create table if not exists public.pedidos (
  id bigint generated always as identity primary key,
  comprador_id uuid not null references public.perfiles(id),
  vendedor_id uuid not null references public.perfiles(id),
  producto_id bigint not null references public.productos(id),
  cantidad int not null default 1,
  monto_total numeric(10,2) not null,
  estado estado_pedido not null default 'creado',

  -- Código de confirmación de entrega (equivalente al codigoHash on-chain)
  codigo_confirmacion text not null,          -- 6 dígitos, se muestra solo al comprador
  codigo_intentos int not null default 0,

  -- Timer de 15 minutos: arranca cuando el vendedor marca "llegado"
  llegado_en timestamptz,
  codigo_vence_en timestamptz,

  confirmado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists idx_pedidos_comprador on public.pedidos(comprador_id);
create index if not exists idx_pedidos_vendedor on public.pedidos(vendedor_id);
create index if not exists idx_pedidos_estado on public.pedidos(estado);

-- Historial de cambios de estado del pedido (para timeline visual + auditoría)
create table if not exists public.pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references public.pedidos(id) on delete cascade,
  estado estado_pedido not null,
  nota text,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);
create index if not exists idx_pedido_eventos_pedido on public.pedido_eventos(pedido_id);

-- ---------- INCIDENCIAS (reportes de comprador y vendedor) ----------
create table if not exists public.incidencias (
  id bigint generated always as identity primary key,
  pedido_id bigint references public.pedidos(id) on delete set null,
  reportado_por uuid not null references public.perfiles(id),
  rol_reportante rol_usuario not null,
  categoria text not null,           -- 'producto_dañado', 'no_llego', 'no_es_lo_pedido', 'comprador_no_confirma', 'otro', ...
  descripcion text not null,
  estado estado_incidencia not null default 'abierta',
  resolucion text,
  resuelto_por uuid references public.perfiles(id),
  resuelto_en timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists idx_incidencias_estado on public.incidencias(estado);
create index if not exists idx_incidencias_pedido on public.incidencias(pedido_id);

create table if not exists public.incidencia_imagenes (
  id bigint generated always as identity primary key,
  incidencia_id bigint not null references public.incidencias(id) on delete cascade,
  storage_path text not null,   -- ruta dentro del bucket 'incidencias' de Supabase Storage
  creado_en timestamptz not null default now()
);

-- ---------- CRÉDITO (estilo "Yape Créditos": solicitud, aprobación, pago con interés) ----------
create table if not exists public.solicitudes_credito (
  id bigint generated always as identity primary key,
  vendedor_id uuid not null references public.perfiles(id) on delete cascade,
  monto_solicitado numeric(10,2) not null check (monto_solicitado > 0),
  tasa_interes numeric(5,2) not null default 8.00, -- % fijo del MVP
  monto_a_pagar numeric(10,2) not null,            -- monto + interés, calculado al aprobar
  estado estado_credito not null default 'pendiente',
  aprobado_por uuid references public.perfiles(id),
  aprobado_en timestamptz,
  pagado boolean not null default false,
  pagado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists idx_creditos_vendedor on public.solicitudes_credito(vendedor_id);
create index if not exists idx_creditos_estado on public.solicitudes_credito(estado);

-- ---------- NOTIFICACIONES ----------
create table if not exists public.notificaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  tipo tipo_notificacion not null,
  titulo text not null,
  mensaje text not null,
  leida boolean not null default false,
  referencia_tabla text,   -- 'pedidos' | 'incidencias' | 'solicitudes_vendedor' | 'solicitudes_credito'
  referencia_id bigint,
  creado_en timestamptz not null default now()
);
create index if not exists idx_notif_usuario_leida on public.notificaciones(usuario_id, leida);

-- ---------- AUDITORÍA (registro global de acciones sensibles) ----------
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  actor_id uuid references public.perfiles(id),
  accion text not null,          -- 'PEDIDO_CREADO', 'PEDIDO_CONFIRMADO', 'SOLICITUD_ACEPTADA', 'CREDITO_APROBADO', etc.
  entidad text,                  -- tabla afectada
  entidad_id text,
  detalle jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists idx_auditoria_fecha on public.auditoria(creado_en desc);
create index if not exists idx_auditoria_accion on public.auditoria(accion);
