// Script de despliegue a Arbitrum Sepolia.
//
// Uso:
//   1. Copiar .env.example a .env y completar PRIVATE_KEY y ARBITRUM_SEPOLIA_RPC
//      (pueden usar el RPC público https://sepolia-rollup.arbitrum.io/rpc,
//      o uno propio de Alchemy/Infura para más estabilidad).
//   2. Asegurarse de que la wallet de PRIVATE_KEY tenga ETH de testnet de
//      Arbitrum Sepolia (faucet: https://www.alchemy.com/faucets/arbitrum-sepolia).
//   3. Ejecutar: node deploy_arbitrum_sepolia.js
//   4. El script guarda las direcciones desplegadas en deployed_addresses.json,
//      que el backend Spring Boot lee para saber a qué contratos conectarse.

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function loadArtifact(fileName, contractName) {
  const p = path.join(__dirname, "artifacts", "contracts", fileName, contractName + ".json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";

  if (!PRIVATE_KEY || PRIVATE_KEY.startsWith("0x000000")) {
    console.error("✗ Falta configurar PRIVATE_KEY en el archivo .env");
    console.error("  Copien .env.example a .env y completen su clave privada de testnet.");
    process.exit(1);
  }

  console.log("Conectando a Arbitrum Sepolia:", RPC_URL);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const network = await provider.getNetwork();
  console.log("Chain ID detectado:", network.chainId.toString(), "(Arbitrum Sepolia = 421614)\n");

  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet de despliegue:", wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    console.error("✗ La wallet no tiene fondos. Consigan ETH de testnet en:");
    console.error("  https://www.alchemy.com/faucets/arbitrum-sepolia");
    process.exit(1);
  }

  // ---- Desplegar TrustLinkReputation ----
  console.log("Desplegando TrustLinkReputation...");
  const repArtifact = loadArtifact("TrustLinkReputation.sol", "TrustLinkReputation");
  const RepFactory = new ethers.ContractFactory(repArtifact.abi, repArtifact.bytecode, wallet);
  const reputacion = await RepFactory.deploy();
  await reputacion.waitForDeployment();
  const reputacionAddr = await reputacion.getAddress();
  console.log("✓ TrustLinkReputation desplegado en:", reputacionAddr);

  // ---- Desplegar TrustLinkEscrow ----
  console.log("Desplegando TrustLinkEscrow...");
  const escrowArtifact = loadArtifact("TrustLinkEscrow.sol", "TrustLinkEscrow");
  const EscrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
  const escrow = await EscrowFactory.deploy(reputacionAddr);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("✓ TrustLinkEscrow desplegado en:   ", escrowAddr);

  // ---- Autorizar al Escrow para mintear SBTs ----
  console.log("Autorizando Escrow en el contrato de reputación...");
  const tx = await reputacion.setEscrowContract(escrowAddr);
  await tx.wait();
  console.log("✓ Autorización confirmada\n");

  // ---- Guardar direcciones para que el backend las use ----
  const deployedInfo = {
    network: "arbitrumSepolia",
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    contracts: {
      TrustLinkReputation: {
        address: reputacionAddr,
        abi: repArtifact.abi,
      },
      TrustLinkEscrow: {
        address: escrowAddr,
        abi: escrowArtifact.abi,
      },
    },
  };

  fs.writeFileSync(
    path.join(__dirname, "deployed_addresses.json"),
    JSON.stringify(deployedInfo, null, 2)
  );

  console.log("========================================");
  console.log(" DESPLIEGUE COMPLETO");
  console.log("========================================");
  console.log("TrustLinkReputation:", reputacionAddr);
  console.log("TrustLinkEscrow:    ", escrowAddr);
  console.log("");
  console.log("Direcciones guardadas en deployed_addresses.json");
  console.log("Verificar en Arbiscan Sepolia:");
  console.log("  https://sepolia.arbiscan.io/address/" + reputacionAddr);
  console.log("  https://sepolia.arbiscan.io/address/" + escrowAddr);
}

main().catch((err) => {
  console.error("\n✗ Error en el despliegue:", err.message || err);
  process.exit(1);
});
