# TrustLink — BUIDL Hackathon, Arbitrum Track

Marketplace con escrow verificado, reputación on-chain (SBT) y crédito
progresivo para vendedores informales, potenciado con IA y desplegado
en Arbitrum.

## Contenido de este ZIP

```
trustlink/
├── contracts/    Smart contracts en Solidity (Escrow + SBT), COMPILADOS
│                  Y PROBADOS con 11 tests de integración pasando.
│                  Incluye script de despliegue a Arbitrum Sepolia.
│
└── backend/      Aplicación web Spring Boot + Thymeleaf + MySQL.
                   Código completo, conectado a los contratos vía Web3j.
                   No se pudo compilar en el entorno donde se preparó
                   (sin acceso a Maven Central) — lean backend/README.md
                   antes de empezar.
```

## Orden recomendado para dejarlo funcionando

1. **Lean primero `contracts/README.md`** — ahí está todo el detalle de
   qué se probó y cómo desplegar a Arbitrum Sepolia con su propia
   wallet.
2. Corran `contracts/deploy_arbitrum_sepolia.js` para obtener las
   direcciones reales de los contratos desplegados.
3. **Lean `backend/README.md`** — instrucciones para compilar,
   configurar la base de datos, y conectar el backend a esas
   direcciones.
4. Corran el backend y prueben el flujo completo: registro → publicar
   producto → comprar → confirmar entrega → ver reputación → solicitar
   crédito → (superadmin) banear un usuario / resolver una disputa.

## Resumen de lo que está implementado

- **Autenticación completa:** registro, login, recuperación de
  contraseña (con token seguro de un solo uso), perfil editable (foto,
  nombre, apellido, teléfono).
- **Superadmin:** `superadmin@trustlink.com` / `trust2026` — puede
  banear/desbanear usuarios y resolver disputas de escrow.
- **Marketplace:** publicar productos, comprar con escrow real
  (depósito on-chain, código de confirmación de entrega, liberación de
  pago).
- **Reputación on-chain:** cada venta exitosa acuña un SBT (Soulbound
  Token, no transferible) y actualiza un score 0-100 con una fórmula
  simple y transparente.
- **Panel de crédito:** techo de préstamo calculado según el score
  (mockup auditable, sin desembolso on-chain — decisión de alcance
  documentada en `TrustLink_MVP_Recomendado.pdf`).
- **Blockchain real:** todo corre contra Arbitrum Sepolia (testnet
  pública), no una simulación — usando Web3j desde el backend.
- **Diseño:** paleta rojo oscuro / rojo / blanco, inspirado en el
  proyecto QuintaOla del equipo, totalmente responsive para celular.

## Advertencia importante para la demo

Antes del día de la presentación, **prueben el flujo completo al menos
dos veces de punta a punta** con la red de Arbitrum Sepolia real — la
latencia de una red pública de testnet es mayor que la de un nodo
local, y quieren estar seguros de los tiempos antes de hacerlo en vivo.
Tengan también el video de respaldo grabado, tal como recomienda
`TrustLink_MVP_Recomendado.pdf`.
