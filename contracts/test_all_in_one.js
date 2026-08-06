// Test de integración end-to-end contra un nodo Hardhat local, usando
// ethers.js directamente sobre los artifacts compilados con solc-js.
//
// NOTAS IMPORTANTES sobre bugs de entorno encontrados y corregidos:
// 1) provider.getBalance() de ethers v6 devolvía valores desactualizados
//    contra este nodo Hardhat local -> se usa getBalanceRaw() con
//    eth_getBalance crudo en su lugar.
// 2) El nonce automático de ethers.Wallet no siempre se sincronizaba
//    correctamente entre transacciones consecutivas del mismo signer
//    contra este nodo -> se maneja el nonce manualmente con un contador
//    por dirección (nextNonce()).
// Si migran esto a producción contra Arbitrum Sepolia real, estos
// workarounds no deberían hacer falta, pero no está de más dejarlos:
// son inofensivos y hacen el código más predecible en cualquier entorno.

const { spawn } = require("child_process");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const PORT = 8600;
const RPC_URL = `http://127.0.0.1:${PORT}`;

function loadArtifact(fileName, contractName) {
  const p = path.join(__dirname, "artifacts", "contracts", fileName, contractName + ".json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNode(provider, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await provider.getBlockNumber();
      return true;
    } catch (e) {
      await sleep(500);
    }
  }
  return false;
}

async function runTests(provider) {
  async function getBalanceRaw(address) {
    const hex = await provider.send("eth_getBalance", [address, "latest"]);
    return BigInt(hex);
  }

  const deployerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const compradorKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const vendedorKey = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

  const deployer = new ethers.Wallet(deployerKey, provider);
  const comprador = new ethers.Wallet(compradorKey, provider);
  const vendedor = new ethers.Wallet(vendedorKey, provider);

  const vendedorAddr = await vendedor.getAddress();
  const compradorAddr = await comprador.getAddress();
  const deployerAddr = await deployer.getAddress();

  // Contador de nonce manual por dirección, para evitar desincronización
  // del auto-nonce de ethers.js contra este nodo.
  const nonceCounters = {};
  async function nextNonce(address) {
    if (nonceCounters[address] === undefined) {
      nonceCounters[address] = await provider.getTransactionCount(address, "latest");
    }
    const n = nonceCounters[address];
    nonceCounters[address] = n + 1;
    return n;
  }

  console.log("Deployer:  ", deployerAddr);
  console.log("Comprador: ", compradorAddr);
  console.log("Vendedor:  ", vendedorAddr);
  console.log("");

  // ---- 1. Desplegar TrustLinkReputation ----
  const repArtifact = loadArtifact("TrustLinkReputation.sol", "TrustLinkReputation");
  const RepFactory = new ethers.ContractFactory(repArtifact.abi, repArtifact.bytecode, deployer);
  const reputacion = await RepFactory.deploy({ nonce: await nextNonce(deployerAddr) });
  await reputacion.waitForDeployment();
  console.log("✓ TrustLinkReputation desplegado en:", await reputacion.getAddress());

  // ---- 2. Desplegar TrustLinkEscrow ----
  const escrowArtifact = loadArtifact("TrustLinkEscrow.sol", "TrustLinkEscrow");
  const EscrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, deployer);
  const escrow = await EscrowFactory.deploy(await reputacion.getAddress(), { nonce: await nextNonce(deployerAddr) });
  await escrow.waitForDeployment();
  console.log("✓ TrustLinkEscrow desplegado en:   ", await escrow.getAddress());

  // ---- 3. Autorizar al Escrow para mintear SBTs ----
  const tx1 = await reputacion.connect(deployer).setEscrowContract(await escrow.getAddress(), { nonce: await nextNonce(deployerAddr) });
  await tx1.wait();
  console.log("✓ Escrow autorizado en el contrato de reputación\n");

  // ---- 4. Comprador crea una orden ----
  const codigo = "ENTREGA-1234";
  const codigoHash = ethers.keccak256(ethers.solidityPacked(["string"], [codigo]));
  const montoOrden = ethers.parseEther("0.01");

  const escrowComprador = escrow.connect(comprador);

  const txCrear = await escrowComprador.crearOrden(vendedorAddr, codigoHash, { value: montoOrden, nonce: await nextNonce(compradorAddr) });
  const reciboCrear = await txCrear.wait();
  console.log("✓ Orden creada. Gas usado:", reciboCrear.gasUsed.toString());

  const ordenId = 1n;
  const ordenAntes = await escrow.obtenerOrden(ordenId);
  assert.strictEqual(ordenAntes.estado, 1n, "La orden debe estar EnCustodia (1)");
  console.log("✓ Orden en estado EnCustodia, monto:", ethers.formatEther(ordenAntes.monto), "ETH\n");

  const balanceVendedorAntes = await getBalanceRaw(vendedorAddr);

  // ---- 5. Comprador confirma la entrega ----
  const txConfirmar = await escrowComprador.confirmarEntrega(ordenId, codigo, { nonce: await nextNonce(compradorAddr) });
  await txConfirmar.wait();
  console.log("✓ Entrega confirmada con código correcto");

  const ordenDespues = await escrow.obtenerOrden(ordenId);
  assert.strictEqual(ordenDespues.estado, 2n, "La orden debe estar Liberado (2)");
  console.log("✓ Orden en estado Liberado");

  const balanceVendedorDespues = await getBalanceRaw(vendedorAddr);
  assert.ok(balanceVendedorDespues > balanceVendedorAntes, "El vendedor debe haber recibido el pago");
  console.log("✓ Pago liberado correctamente al vendedor (recibió " + ethers.formatEther(balanceVendedorDespues - balanceVendedorAntes) + " ETH)\n");

  // ---- 6. Verificar SBT emitido ----
  const balanceSBT = await reputacion.balanceOf(vendedorAddr);
  assert.strictEqual(balanceSBT, 1n, "El vendedor debe tener 1 SBT");
  console.log("✓ SBT acuñado: el vendedor tiene", balanceSBT.toString(), "token(s) de reputación");

  const [ventas, score, compradoresDistintos] = await reputacion.reputacionDe(vendedorAddr);
  console.log("✓ Reputación on-chain -> ventas:", ventas.toString(), "| score:", score.toString(), "| compradores distintos:", compradoresDistintos.toString());

  // ---- 7. Backend publica un score (simulando el módulo de IA) ----
  const txScore = await reputacion.connect(deployer).actualizarScore(vendedorAddr, 72, { nonce: await nextNonce(deployerAddr) });
  await txScore.wait();
  const [, scoreActualizado] = await reputacion.reputacionDe(vendedorAddr);
  assert.strictEqual(scoreActualizado, 72n, "El score debe haberse actualizado a 72");
  console.log("✓ Score actualizado on-chain por el backend: 72/100\n");

  // ---- 8. El SBT NO se puede transferir (soulbound) ----
  let transferenciaFallo = false;
  try {
    await reputacion.connect(vendedor).transferFrom(vendedorAddr, compradorAddr, 1n, { nonce: await nextNonce(vendedorAddr) });
  } catch (e) {
    transferenciaFallo = true;
    nonceCounters[vendedorAddr] = await provider.getTransactionCount(vendedorAddr, "latest");
  }
  assert.ok(transferenciaFallo, "La transferencia del SBT debe fallar (es soulbound)");
  console.log("✓ Intento de transferencia del SBT fue rechazado correctamente (soulbound confirmado)\n");

  // ---- 9. Código incorrecto debe revertir ----
  const codigoHash2 = ethers.keccak256(ethers.solidityPacked(["string"], ["OTRO-CODIGO"]));
  const txCrear2 = await escrowComprador.crearOrden(vendedorAddr, codigoHash2, { value: montoOrden, nonce: await nextNonce(compradorAddr) });
  await txCrear2.wait();
  let codigoIncorrectoFallo = false;
  try {
    await escrowComprador.confirmarEntrega(2n, "CODIGO-INCORRECTO", { nonce: await nextNonce(compradorAddr) });
  } catch (e) {
    codigoIncorrectoFallo = true;
    // La tx revirtió pero el nonce igual se consumió on-chain; resincronizar
    // el contador local con el nonce real de la red antes de seguir.
    nonceCounters[compradorAddr] = await provider.getTransactionCount(compradorAddr, "latest");
  }
  assert.ok(codigoIncorrectoFallo, "Confirmar con código incorrecto debe fallar");
  console.log("✓ Confirmación con código incorrecto fue rechazada correctamente\n");

  // ---- 10. Liberación automática por timeout ----
  const codigoHash3 = ethers.keccak256(ethers.solidityPacked(["string"], ["CODIGO-3"]));
  const txCrear3 = await escrowComprador.crearOrden(vendedorAddr, codigoHash3, { value: montoOrden, nonce: await nextNonce(compradorAddr) });
  await txCrear3.wait();

  await provider.send("evm_increaseTime", [73 * 60 * 60]);
  await provider.send("evm_mine", []);

  const balanceVendedorAntesTimeout = await getBalanceRaw(vendedorAddr);
  const txLiberar = await escrow.connect(deployer).liberarPorTimeout(3n, { nonce: await nextNonce(deployerAddr) });
  await txLiberar.wait();
  const balanceVendedorDespuesTimeout = await getBalanceRaw(vendedorAddr);
  assert.ok(balanceVendedorDespuesTimeout > balanceVendedorAntesTimeout, "El vendedor debe recibir el pago tras el timeout");
  console.log("✓ Liberación automática por timeout funcionó correctamente\n");

  // ---- 11. Reembolso por disputa ----
  const codigoHash4 = ethers.keccak256(ethers.solidityPacked(["string"], ["CODIGO-4"]));
  const txCrear4 = await escrowComprador.crearOrden(vendedorAddr, codigoHash4, { value: montoOrden, nonce: await nextNonce(compradorAddr) });
  await txCrear4.wait();
  const txDisputa = await escrowComprador.reportarDisputa(4n, { nonce: await nextNonce(compradorAddr) });
  await txDisputa.wait();
  const balanceCompradorAntesReembolso = await getBalanceRaw(compradorAddr);
  const txResolver = await escrow.connect(deployer).resolverDisputa(4n, false, { nonce: await nextNonce(deployerAddr) });
  await txResolver.wait();
  const balanceCompradorDespuesReembolso = await getBalanceRaw(compradorAddr);
  assert.ok(balanceCompradorDespuesReembolso > balanceCompradorAntesReembolso, "El comprador debe recibir el reembolso");
  console.log("✓ Resolución de disputa con reembolso al comprador funcionó correctamente\n");

  console.log("========================================");
  console.log(" TODOS LOS TESTS DE INTEGRACIÓN PASARON ");
  console.log("========================================");
}

async function main() {
  const externalPort = process.env.EXTERNAL_RPC_PORT;

  if (externalPort) {
    const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${externalPort}`);
    const ok = await waitForNode(provider, 20);
    if (!ok) {
      console.error("✗ No se pudo conectar al nodo externo en puerto " + externalPort);
      process.exit(1);
    }
    console.log("✓ Conectado al nodo Hardhat externo en puerto " + externalPort + "\n");
    try {
      await runTests(provider);
      process.exit(0);
    } catch (err) {
      console.error("\n✗ TEST FALLÓ:", err.message || err);
      process.exit(1);
    }
    return;
  }

  console.log("Iniciando nodo Hardhat local en puerto " + PORT + " ...");
  const child = spawn("npx", ["hardhat", "node", "--port", String(PORT)], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ok = await waitForNode(provider, 30);

  if (!ok) {
    console.error("✗ El nodo Hardhat no arrancó a tiempo.");
    child.kill();
    process.exit(1);
  }

  console.log("✓ Nodo Hardhat listo.\n");

  let exitCode = 0;
  try {
    await runTests(provider);
  } catch (err) {
    console.error("\n✗ TEST FALLÓ:", err.message || err);
    exitCode = 1;
  } finally {
    child.kill();
  }

  process.exit(exitCode);
}

main();
