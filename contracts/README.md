# TrustLink — Smart Contracts

Contratos de Escrow y Reputación (SBT) para TrustLink, listos para desplegar
en Arbitrum Sepolia.

## Qué contiene

- `contracts/TrustLinkReputation.sol` — Soulbound Token (SBT) de reputación.
  No transferible. Se acuña automáticamente cuando el Escrow confirma una
  venta sin disputas.
- `contracts/TrustLinkEscrow.sol` — Depósito en garantía: crear orden,
  confirmar entrega por código, liberación automática por timeout,
  reporte y resolución de disputas.

## Estado de las pruebas (importante, léanlo)

Estos dos contratos **fueron compilados y probados de extremo a extremo**
contra un nodo Hardhat local, incluyendo:

- Despliegue de ambos contratos y autorización cruzada.
- Ciclo completo: crear orden → confirmar entrega → SBT emitido → pago
  liberado al vendedor.
- Actualización de score on-chain.
- Verificación de que el SBT **no se puede transferir** (soulbound).
- Rechazo de confirmación con código incorrecto.
- Liberación automática por timeout (72 horas simuladas).
- Resolución de disputa con reembolso al comprador.

Los 11 casos de prueba pasan (`test_all_in_one.js`). Esto da confianza real
de que la lógica de negocio es correcta — no es solo código sin probar.

**Lo que NO se probó todavía:** el despliegue real contra Arbitrum Sepolia
(la red de testnet pública). El script `deploy_arbitrum_sepolia.js` está
listo y usa el mismo patrón ya validado localmente, pero desplegar contra
la red real requiere una wallet con ETH de testnet y conexión a un RPC
público, que el entorno donde se preparó este proyecto no tiene. Esto lo
debe hacer alguien del equipo (ver pasos abajo) — es el mismo comando, solo
que apuntando a una red real en vez de local.

## Cómo compilar (si necesitan volver a hacerlo)

Este proyecto usa un compilador standalone (`compile.js`) en vez del
comando estándar `npx hardhat compile`, porque el entorno donde se
construyó no tenía acceso a `binaries.soliditylang.org` (el downloader de
Hardhat). Si ustedes SÍ tienen acceso normal a internet, pueden usar
cualquiera de los dos:

```bash
npm install

# Opción A (recomendada, ya probada):
node compile.js

# Opción B (estándar de Hardhat, debería funcionar igual si tienen
# acceso normal a internet):
npx hardhat compile
```

Ambas generan los artifacts en `artifacts/contracts/`.

## Cómo correr los tests localmente

```bash
npm install
bash run_test.sh
```

Esto levanta un nodo Hardhat local, despliega ambos contratos, corre los
11 casos de prueba, y muestra el resultado. Debe terminar con:

```
========================================
 TODOS LOS TESTS DE INTEGRACIÓN PASARON
========================================
```

## Cómo desplegar a Arbitrum Sepolia (red de prueba real)

1. Consigan una wallet nueva (por ejemplo con MetaMask) — **no usen una
   wallet con fondos reales**, esto es solo para testnet.
2. Consigan ETH de testnet de Arbitrum Sepolia gratis en:
   https://www.alchemy.com/faucets/arbitrum-sepolia
3. Copien `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
4. Completen `.env` con la clave privada de esa wallet (empieza con `0x`).
5. Ejecuten:
   ```bash
   npm install dotenv
   node deploy_arbitrum_sepolia.js
   ```
6. Al terminar, va a aparecer un archivo `deployed_addresses.json` con las
   direcciones de los contratos ya desplegados. **El backend Spring Boot
   necesita esas direcciones** — cópienlas en su `application.properties`
   (ver README del backend).
7. Pueden verificar que los contratos existen de verdad entrando a:
   `https://sepolia.arbiscan.io/address/<direccion>`

## Direcciones importantes del contrato

- `TrustLinkReputation.setEscrowContract(address)` — ya se llama
  automáticamente en el script de despliegue, no hace falta llamarla a mano.
- El `owner()` de ambos contratos es la wallet que los despliega. Esa misma
  wallet es la que el backend debe usar para llamar `actualizarScore()` y
  `resolverDisputa()` (funciones de admin/backend, no de usuario final).

## Advertencia de seguridad para la demo

Estos contratos están pensados para un MVP de hackathon en testnet, no
para producción con dinero real:

- El backend centralizado calcula el score y decide disputas — está
  declarado así a propósito (ver la propuesta del pitch, sección de
  "dependencia del backend").
- No hay límite de gas optimizado agresivamente; para la demo no importa,
  para producción se revisaría.
- El código no ha pasado una auditoría de seguridad externa.
