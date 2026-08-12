/**
 * Edge Function: escrow-onchain
 * ------------------------------------------------------------------
 * Ancla cada venta de TrustLink al contrato TrustLinkEscrow en
 * Arbitrum Sepolia, firmando con una wallet OPERADORA del backend
 * (los usuarios no necesitan wallet ni ven nada de cripto).
 *
 * Cada acción genera una transacción REAL con su hash único:
 *   crear     -> crearOrden(vendedorDerivado, codigoHash) + monto simbólico
 *   confirmar -> confirmarEntrega(ordenId, codigo)  (libera + acuña SBT)
 *   disputa   -> reportarDisputa(ordenId)
 *   resolver  -> resolverDisputa(ordenId, liberarAlVendedor)  (owner)
 *
 * El hash se guarda en la tabla pedidos (tx_*_hash) y el frontend lo
 * muestra con link a Arbiscan.
 *
 * DESPLIEGUE (una sola vez):
 *   supabase functions deploy escrow-onchain
 *   supabase secrets set OPERATOR_PRIVATE_KEY=0x... (wallet con ETH de faucet
 *                          y que sea LA MISMA que desplegó el Escrow, para
 *                          poder resolver disputas como owner)
 *   supabase secrets set ESCROW_ADDRESS=0x...       (dirección del Escrow)
 *
 * Notas de diseño (MVP honesto):
 *  - El monto on-chain es SIMBÓLICO (0.00001 ETH por orden): el dinero real
 *    del usuario vive en soles dentro de la plataforma; la blockchain se usa
 *    como notario público de cada estado de la venta.
 *  - Los vendedores aún no tienen wallet propia, así que su dirección se
 *    DERIVA determinísticamente de su UUID (keccak256). Es la misma siempre
 *    para el mismo vendedor, así el contrato de reputación acumula sus
 *    ventas/SBTs de forma consistente y auditable.
 *  - Si los secrets no están configurados, responde { skipped: true } y la
 *    plataforma sigue funcionando normal (sin anclaje).
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.13.2";

const RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614;
const MONTO_SIMBOLICO_ETH = "0.00001";

const ABI_ESCROW = [
  "function crearOrden(address vendedor, bytes32 codigoHash) payable returns (uint256)",
  "function confirmarEntrega(uint256 ordenId, string codigo)",
  "function reportarDisputa(uint256 ordenId)",
  "function resolverDisputa(uint256 ordenId, bool liberarAlVendedor)",
  "event OrdenCreada(uint256 indexed ordenId, address indexed comprador, address indexed vendedor, uint256 monto, uint256 plazoConfirmacion)",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Dirección determinística (sin clave privada) derivada del UUID del vendedor. */
function direccionDerivada(uuid: string): string {
  const hash = ethers.keccak256(ethers.toUtf8Bytes("trustlink:vendedor:" + uuid));
  return ethers.getAddress("0x" + hash.slice(-40));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const pk = Deno.env.get("OPERATOR_PRIVATE_KEY");
    const escrowAddress = Deno.env.get("ESCROW_ADDRESS");
    if (!pk || !escrowAddress) {
      return json({ skipped: true, motivo: "Contratos aún no configurados (OPERATOR_PRIVATE_KEY / ESCROW_ADDRESS)" });
    }

    // ---- Autenticación del usuario que llama ----
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "No autenticado" }, 401);
    const uid = userData.user.id;

    const { accion, pedido_id, incidencia_id, favor_comprador } = await req.json();

    // ---- Resolver el pedido objetivo ----
    let pedidoId = pedido_id as number | null;
    if (accion === "resolver" && incidencia_id) {
      const { data: inc } = await supabase.from("incidencias").select("pedido_id").eq("id", incidencia_id).single();
      pedidoId = inc?.pedido_id ?? null;
    }
    if (!pedidoId) return json({ skipped: true, motivo: "Sin pedido asociado" });

    const { data: pedido, error: pedErr } = await supabase.from("pedidos").select("*").eq("id", pedidoId).single();
    if (pedErr || !pedido) return json({ error: "Pedido no existe" }, 404);

    // ---- Permisos por acción ----
    const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", uid).single();
    const esSuperadmin = perfil?.rol === "superadmin";
    const esComprador = pedido.comprador_id === uid;
    const esVendedor = pedido.vendedor_id === uid;

    if ((accion === "crear" || accion === "confirmar") && !esComprador) return json({ error: "Solo el comprador" }, 403);
    if (accion === "disputa" && !esComprador && !esVendedor && !esSuperadmin) return json({ error: "No autorizado" }, 403);
    if (accion === "resolver" && !esSuperadmin) return json({ error: "Solo superadmin" }, 403);

    // ---- Firma on-chain ----
    const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(pk, provider);
    const escrow = new ethers.Contract(escrowAddress, ABI_ESCROW, wallet);

    if (accion === "crear") {
      if (pedido.tx_crear_hash) return json({ ok: true, txHash: pedido.tx_crear_hash, yaAnclado: true });

      const vendedorAddr = direccionDerivada(pedido.vendedor_id);
      const codigoHash = ethers.keccak256(ethers.toUtf8Bytes(pedido.codigo_confirmacion));
      const tx = await escrow.crearOrden(vendedorAddr, codigoHash, { value: ethers.parseEther(MONTO_SIMBOLICO_ETH) });
      const receipt = await tx.wait();

      // ordenId del evento OrdenCreada
      let ordenId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = escrow.interface.parseLog(log);
          if (parsed?.name === "OrdenCreada") { ordenId = Number(parsed.args.ordenId); break; }
        } catch (_) { /* log de otro contrato */ }
      }

      await supabase.from("pedidos").update({ onchain_orden_id: ordenId, tx_crear_hash: receipt.hash }).eq("id", pedidoId);
      return json({ ok: true, txHash: receipt.hash, ordenId });
    }

    // Las demás acciones requieren que la orden exista on-chain
    if (!pedido.onchain_orden_id) return json({ skipped: true, motivo: "El pedido no está anclado on-chain" });
    const ordenId = pedido.onchain_orden_id;

    if (accion === "confirmar") {
      if (pedido.tx_confirmar_hash) return json({ ok: true, txHash: pedido.tx_confirmar_hash, yaAnclado: true });
      const tx = await escrow.confirmarEntrega(ordenId, pedido.codigo_confirmacion);
      const receipt = await tx.wait();
      await supabase.from("pedidos").update({ tx_confirmar_hash: receipt.hash }).eq("id", pedidoId);
      return json({ ok: true, txHash: receipt.hash });
    }

    if (accion === "disputa") {
      if (pedido.tx_disputa_hash) return json({ ok: true, txHash: pedido.tx_disputa_hash, yaAnclado: true });
      const tx = await escrow.reportarDisputa(ordenId);
      const receipt = await tx.wait();
      await supabase.from("pedidos").update({ tx_disputa_hash: receipt.hash }).eq("id", pedidoId);
      return json({ ok: true, txHash: receipt.hash });
    }

    if (accion === "resolver") {
      if (pedido.tx_resolucion_hash) return json({ ok: true, txHash: pedido.tx_resolucion_hash, yaAnclado: true });
      const liberarAlVendedor = !favor_comprador;
      const tx = await escrow.resolverDisputa(ordenId, liberarAlVendedor);
      const receipt = await tx.wait();
      await supabase.from("pedidos").update({ tx_resolucion_hash: receipt.hash }).eq("id", pedidoId);
      return json({ ok: true, txHash: receipt.hash });
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    console.error("escrow-onchain:", e);
    // Nunca romper el flujo de la plataforma por un fallo on-chain
    return json({ skipped: true, motivo: String(e?.message ?? e) });
  }
});
