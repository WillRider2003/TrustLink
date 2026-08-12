/**
 * WEB3 — Contratos TrustLink en Arbitrum Sepolia
 * ------------------------------------------------------------------
 * Integración de solo-lectura con los contratos reales:
 *   - TrustLinkEscrow.sol      (custodia de pagos con código de entrega)
 *   - TrustLinkReputation.sol  (SBT de reputación, no transferible)
 *
 * CONFIGURACIÓN (1 sola vez, tras desplegar los contratos):
 *   1. Despliega TrustLinkReputation.sol y luego TrustLinkEscrow.sol
 *      (pasándole la dirección del de reputación al constructor).
 *   2. Llama reputacion.setEscrowContract(direccionDelEscrow).
 *   3. Pega ambas direcciones aquí abajo en TL_WEB3.
 *
 * Mientras las direcciones estén vacías, contratos.html muestra el
 * estado "pendiente de despliegue" con toda la información estática
 * de los contratos (funciones, eventos, seguridad) sin romper nada.
 *
 * Usa ethers v6 (CDN, cargado en contratos.html). Las lecturas van
 * contra el RPC público de Arbitrum Sepolia — no se necesita wallet.
 */

const TL_WEB3 = {
  red: 'Arbitrum Sepolia',
  chainId: 421614,
  rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
  explorer: 'https://sepolia.arbiscan.io',

  // ▼▼▼ PEGA AQUÍ LAS DIRECCIONES REALES TRAS EL DESPLIEGUE ▼▼▼
  escrowAddress: '0xEFFbc4f5524d4c546c0A6A3a0C36A0c6BB9ec24c',
  reputationAddress: '0x72A292696389daf898BdC72672cA6B983564ee5d',
};

/* ABIs mínimos (solo lo que el frontend lee/muestra) */
const TL_ABI_ESCROW = [
  'function PLAZO_CONFIRMACION_DEFECTO() view returns (uint256)',
  'function reputacion() view returns (address)',
  'function owner() view returns (address)',
  'function obtenerOrden(uint256 ordenId) view returns (tuple(address comprador, address vendedor, uint256 monto, uint256 creadaEn, uint256 plazoConfirmacion, bytes32 codigoHash, uint8 estado))',
  'event OrdenCreada(uint256 indexed ordenId, address indexed comprador, address indexed vendedor, uint256 monto, uint256 plazoConfirmacion)',
  'event EntregaConfirmada(uint256 indexed ordenId, address indexed comprador, address indexed vendedor, uint256 monto)',
  'event OrdenReembolsada(uint256 indexed ordenId, address indexed comprador, uint256 monto)',
  'event OrdenEnDisputa(uint256 indexed ordenId, address indexed reportadoPor)',
  'event DisputaResuelta(uint256 indexed ordenId, bool liberadoAlVendedor)',
];

const TL_ABI_REPUTATION = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function escrowContract() view returns (address)',
  'function ventasExitosas(address vendedor) view returns (uint256)',
  'function score(address vendedor) view returns (uint8)',
  'function totalCompradoresDistintos(address vendedor) view returns (uint256)',
  'function reputacionDe(address vendedor) view returns (uint256 ventas, uint8 puntaje, uint256 compradoresDistintos)',
  'function balanceOf(address owner) view returns (uint256)',
  'event ReputacionEmitida(address indexed vendedor, uint256 indexed tokenId, uint256 totalVentas)',
  'event ScoreActualizado(address indexed vendedor, uint8 nuevoScore)',
];

const TL_ESCROW_ESTADOS = ['Inexistente', 'En custodia', 'Liberado', 'Reembolsado', 'En disputa'];

let _tlProvider = null;

function tlWeb3Provider() {
  if (!_tlProvider) _tlProvider = new ethers.JsonRpcProvider(TL_WEB3.rpc, TL_WEB3.chainId);
  return _tlProvider;
}

function tlWeb3Configurado() {
  return Boolean(TL_WEB3.escrowAddress && TL_WEB3.reputationAddress);
}

function tlContratoEscrow() {
  return new ethers.Contract(TL_WEB3.escrowAddress, TL_ABI_ESCROW, tlWeb3Provider());
}

function tlContratoReputation() {
  return new ethers.Contract(TL_WEB3.reputationAddress, TL_ABI_REPUTATION, tlWeb3Provider());
}

/** ¿Hay bytecode desplegado en la dirección? (contrato vivo en la red) */
async function tlContratoDesplegado(address) {
  try {
    const code = await tlWeb3Provider().getCode(address);
    return code && code !== '0x';
  } catch (e) {
    console.error('tlContratoDesplegado:', e);
    return false;
  }
}

/** Lectura on-chain: reputación completa de una wallet de vendedor. */
async function tlLeerReputacionOnChain(direccionVendedor) {
  const c = tlContratoReputation();
  const [ventas, puntaje, compradores] = await c.reputacionDe(direccionVendedor);
  const sbts = await c.balanceOf(direccionVendedor);
  return {
    ventas: Number(ventas),
    score: Number(puntaje),
    compradoresDistintos: Number(compradores),
    sbts: Number(sbts),
  };
}

/** Lectura on-chain: una orden del escrow por su ID. */
async function tlLeerOrdenOnChain(ordenId) {
  const c = tlContratoEscrow();
  const o = await c.obtenerOrden(ordenId);
  const estado = Number(o.estado);
  if (estado === 0) return null; // Inexistente
  return {
    comprador: o.comprador,
    vendedor: o.vendedor,
    montoEth: ethers.formatEther(o.monto),
    creadaEn: new Date(Number(o.creadaEn) * 1000),
    plazoConfirmacion: new Date(Number(o.plazoConfirmacion) * 1000),
    estado: TL_ESCROW_ESTADOS[estado] || 'Desconocido',
  };
}

/** Datos generales de ambos contratos para el panel de estado. */
async function tlEstadoContratos() {
  const resultado = {
    configurado: tlWeb3Configurado(),
    escrow: { address: TL_WEB3.escrowAddress, desplegado: false, plazoHoras: null, reputacionVinculada: null },
    reputation: { address: TL_WEB3.reputationAddress, desplegado: false, nombre: null, simbolo: null, escrowVinculado: null },
  };
  if (!resultado.configurado) return resultado;

  resultado.escrow.desplegado = await tlContratoDesplegado(TL_WEB3.escrowAddress);
  resultado.reputation.desplegado = await tlContratoDesplegado(TL_WEB3.reputationAddress);

  try {
    if (resultado.escrow.desplegado) {
      const esc = tlContratoEscrow();
      resultado.escrow.plazoHoras = Number(await esc.PLAZO_CONFIRMACION_DEFECTO()) / 3600;
      resultado.escrow.reputacionVinculada = await esc.reputacion();
    }
    if (resultado.reputation.desplegado) {
      const rep = tlContratoReputation();
      resultado.reputation.nombre = await rep.name();
      resultado.reputation.simbolo = await rep.symbol();
      resultado.reputation.escrowVinculado = await rep.escrowContract();
    }
  } catch (e) {
    console.error('tlEstadoContratos:', e);
  }
  return resultado;
}
