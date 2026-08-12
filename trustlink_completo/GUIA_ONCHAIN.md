# Guía: activar los contratos on-chain (hash único por venta)

Con esto, **cada venta de la plataforma genera transacciones reales en
Arbitrum Sepolia con su hash único**, verificables en Arbiscan, sin que
los usuarios necesiten wallet. Una wallet "operadora" del backend firma
todo a través de una Edge Function.

## Qué hace cada acción

| Acción en la plataforma | Transacción en TrustLinkEscrow | Hash guardado en `pedidos` |
|---|---|---|
| Comprar (crear pedido) | `crearOrden(vendedor, codigoHash)` | `tx_crear_hash` |
| Confirmar entrega con código | `confirmarEntrega(ordenId, codigo)` → libera y acuña SBT | `tx_confirmar_hash` |
| Reportar incidencia de un pedido | `reportarDisputa(ordenId)` | `tx_disputa_hash` |
| Superadmin resuelve la disputa | `resolverDisputa(ordenId, liberarAlVendedor)` | `tx_resolucion_hash` |

El detalle de cada pedido (Mis compras / Ventas) muestra el bloque
"Verificable en blockchain" con los hashes y links a Arbiscan.
La disputa de un pedido solo toca SU orden en el contrato: los demás
pedidos (aunque sean de la misma compra múltiple) no se ven afectados.

## Diseño del MVP (importante entenderlo)

- El monto on-chain es **simbólico** (0.00001 ETH por orden). El dinero
  real del usuario vive en soles dentro de la plataforma; la blockchain
  actúa como **notario público** de cada estado de la venta.
- Los vendedores aún no tienen wallet propia: su dirección se **deriva
  determinísticamente** de su UUID (`keccak256("trustlink:vendedor:"+uuid)`).
  Siempre es la misma para el mismo vendedor, así el contrato de
  reputación acumula sus ventas, SBTs y compradores distintos de forma
  consistente y auditable públicamente.
- Si los contratos no están configurados, TODO sigue funcionando igual:
  el anclaje simplemente se omite (fire-and-forget).

## Pasos para activarlo

### 1. Desplegar los contratos (una sola vez)

Con Remix (remix.ethereum.org) o Hardhat, en **Arbitrum Sepolia**
(chainId 421614), usando una wallet con ETH de faucet
(https://faucet.quicknode.com/arbitrum/sepolia):

1. Despliega `contracts/TrustLinkReputation.sol`.
2. Despliega `contracts/TrustLinkEscrow.sol` pasándole la dirección del
   de reputación al constructor.
3. En el de reputación, llama `setEscrowContract(direccionDelEscrow)`.

**Usa la MISMA wallet para desplegar y como operadora**: así es `owner`
del Escrow y puede resolver disputas.

### 2. Correr el SQL

En el SQL Editor de Supabase: `sql/14_pedidos_onchain.sql`
(agrega las columnas de hash a la tabla `pedidos`).

### 3. Desplegar la Edge Function y sus secrets

```bash
supabase functions deploy escrow-onchain
supabase secrets set OPERATOR_PRIVATE_KEY=0x...   # clave privada de la wallet operadora
supabase secrets set ESCROW_ADDRESS=0x...         # dirección del Escrow desplegado
```

La clave privada **solo** vive como Secret en Supabase — nunca en el
código del frontend.

### 4. Vincular el frontend de solo-lectura

En `js/web3-contratos.js`, pega las dos direcciones en `TL_WEB3`
(`escrowAddress` y `reputationAddress`). La página **Contratos** de la
sidebar empezará a leer datos reales: estado de órdenes, ventas
exitosas, SBTs y score de cualquier vendedor.

### 5. Probar

1. Compra un producto → en unos segundos, abre el pedido en Mis compras:
   verás "Verificable en blockchain" con el hash de `crearOrden`.
2. Confirma la entrega con el código → aparece el hash de la liberación
   (y el SBT acuñado al vendedor).
3. En la página Contratos, consulta la orden por su ID o la reputación
   del vendedor (su dirección derivada) — los datos salen del contrato.
