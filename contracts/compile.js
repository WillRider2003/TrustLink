// Compilador standalone usando el paquete `solc` de npm (WASM), evitando el
// downloader nativo de Hardhat que necesita binaries.soliditylang.org
// (bloqueado en este entorno de red restringida).
//
// Genera artifacts en /artifacts/contracts/<Nombre>.sol/<Nombre>.json
// con el mismo formato { abi, bytecode } que usa Hardhat/ethers, para que
// scripts de despliegue y tests sigan funcionando igual.

const fs = require("fs");
const path = require("path");
const solc = require("solc");

const CONTRACTS_DIR = path.join(__dirname, "contracts");
const NODE_MODULES = path.join(__dirname, "node_modules");
const ARTIFACTS_DIR = path.join(__dirname, "artifacts", "contracts");

function findImports(importPath) {
  // 1) Intentar como archivo propio del proyecto (contracts/<...>.sol),
  //    cubre tanto "./Archivo.sol" como "Archivo.sol" ya normalizado por solc.
  const cleanPath = importPath.replace(/^\.\//, "").replace(/^\.\.\//, "");
  const ownContractPath = path.join(CONTRACTS_DIR, cleanPath);
  if (fs.existsSync(ownContractPath)) {
    return { contents: fs.readFileSync(ownContractPath, "utf8") };
  }
  // 2) Librerías externas (@openzeppelin/...) desde node_modules
  const libPath = path.join(NODE_MODULES, importPath);
  if (fs.existsSync(libPath)) {
    return { contents: fs.readFileSync(libPath, "utf8") };
  }
  return { error: "File not found: " + importPath };
}

function compileFile(fileName) {
  const filePath = path.join(CONTRACTS_DIR, fileName);
  const source = fs.readFileSync(filePath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      [fileName]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );

  let hasError = false;
  if (output.errors) {
    for (const err of output.errors) {
      if (err.severity === "error") {
        hasError = true;
        console.error(err.formattedMessage);
      } else {
        console.warn(err.formattedMessage);
      }
    }
  }
  if (hasError) {
    throw new Error("Fallo la compilación de " + fileName);
  }

  const contractsInFile = output.contracts[fileName];
  for (const contractName of Object.keys(contractsInFile)) {
    const contract = contractsInFile[contractName];
    const outDir = path.join(ARTIFACTS_DIR, fileName);
    fs.mkdirSync(outDir, { recursive: true });

    const artifact = {
      contractName,
      abi: contract.abi,
      bytecode: "0x" + contract.evm.bytecode.object,
      deployedBytecode: "0x" + contract.evm.deployedBytecode.object,
    };

    fs.writeFileSync(
      path.join(outDir, contractName + ".json"),
      JSON.stringify(artifact, null, 2)
    );
    console.log(`✓ Compilado: ${fileName} -> ${contractName} (bytecode ${artifact.bytecode.length / 2 - 1} bytes)`);
  }
}

console.log("Compilando contratos con solc " + solc.version() + " ...\n");

compileFile("TrustLinkReputation.sol");
compileFile("TrustLinkEscrow.sol");

console.log("\nCompilación completa. Artifacts en /artifacts/contracts/");
