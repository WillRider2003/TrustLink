-- =============================================================
-- 14 — ANCLAJE ON-CHAIN DE PEDIDOS (Arbitrum Sepolia)
-- Correr después del 01-13.
--
-- Cada pedido puede quedar anclado al contrato TrustLinkEscrow:
--   - onchain_orden_id : ID de la orden dentro del contrato
--   - tx_*_hash        : hash único de cada transacción real
-- Los escribe la Edge Function "escrow-onchain" (service role);
-- los usuarios solo los leen (las políticas RLS de pedidos ya
-- restringen el SELECT a comprador/vendedor/superadmin).
-- =============================================================

alter table public.pedidos add column if not exists onchain_orden_id bigint;
alter table public.pedidos add column if not exists tx_crear_hash text;
alter table public.pedidos add column if not exists tx_confirmar_hash text;
alter table public.pedidos add column if not exists tx_disputa_hash text;
alter table public.pedidos add column if not exists tx_resolucion_hash text;

comment on column public.pedidos.onchain_orden_id is 'ID de la orden en el contrato TrustLinkEscrow (Arbitrum Sepolia)';
comment on column public.pedidos.tx_crear_hash is 'Hash de la tx crearOrden() — único por venta';
comment on column public.pedidos.tx_confirmar_hash is 'Hash de la tx confirmarEntrega()';
comment on column public.pedidos.tx_disputa_hash is 'Hash de la tx reportarDisputa()';
comment on column public.pedidos.tx_resolucion_hash is 'Hash de la tx resolverDisputa()';
