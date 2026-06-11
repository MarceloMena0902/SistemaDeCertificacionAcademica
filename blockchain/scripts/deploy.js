// ─────────────────────────────────────────────────────────────────────────────
// deploy.js — Script de despliegue general
// Compatible con cualquier red: localhost, Sepolia, mainnet, etc.
// ─────────────────────────────────────────────────────────────────────────────

const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ethers se extrae de hre para usar la versión que Hardhat gestiona internamente
const { ethers } = hre;

async function main() {
  console.log("─────────────────────────────────────────────");
  console.log(" Desplegando AcademicCertification");
  console.log("─────────────────────────────────────────────");

  // ── 1. Obtener deployer ───────────────────────────────────────────────────
  // signers[0] es la cuenta que firma la transacción de despliegue.
  // En Sepolia corresponde a PRIVATE_KEY del .env; en localhost a la cuenta #0 de Hardhat.
  const [deployer] = await ethers.getSigners();

  // ── 2. Info del deployer ──────────────────────────────────────────────────
  const balanceWei = await ethers.provider.getBalance(deployer.address);
  const balanceEth = ethers.formatEther(balanceWei);

  console.log(`\nDeployer : ${deployer.address}`);
  console.log(`Balance  : ${balanceEth} ETH`);

  // ── 3. Deploy ─────────────────────────────────────────────────────────────
  // getContractFactory lee el contrato compilado desde los artifacts de Hardhat.
  console.log("\nDesplegando contrato...");
  const AcademicCertification = await ethers.getContractFactory("AcademicCertification");
  const contrato = await AcademicCertification.deploy();

  // waitForDeployment() espera a que la transacción sea minada (ethers v6).
  await contrato.waitForDeployment();

  // getAddress() retorna la dirección del contrato ya desplegado (ethers v6).
  const contractAddress = await contrato.getAddress();
  console.log(`\nContrato desplegado en : ${contractAddress}`);
  console.log(`Red                    : ${hre.network.name}`);

  // ── 4. Leer ABI desde los artifacts ──────────────────────────────────────
  // hre.artifacts.readArtifact() devuelve el artifact completo compilado por Hardhat,
  // que incluye el ABI, bytecode, etc. Solo usamos el ABI.
  const artifact = await hre.artifacts.readArtifact("AcademicCertification");

  // ── 5. Guardar address + ABI en el frontend ───────────────────────────────
  // La ruta es relativa a este script: scripts/ → blockchain/ → raíz → frontend/
  const outputDir  = path.join(__dirname, "..", "..", "frontend", "src", "contracts");
  const outputFile = path.join(outputDir, "AcademicCertification.json");

  // Crear la carpeta si todavía no existe (recursive evita error si ya existe algún padre)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`\nCarpeta creada : ${outputDir}`);
  }

  // Escribir el JSON con la dirección y el ABI completo
  const contractData = {
    address: contractAddress,
    abi:     artifact.abi,
  };
  fs.writeFileSync(outputFile, JSON.stringify(contractData, null, 2));

  console.log(`\n✓ Archivo guardado en  : ${outputFile}`);
  console.log("─────────────────────────────────────────────");
  console.log(" Despliegue completado exitosamente");
  console.log("─────────────────────────────────────────────\n");
}

// Patrón estándar de Hardhat: captura errores y establece el exit code apropiado
main().catch((error) => {
  console.error("\n✗ Error durante el despliegue:", error);
  process.exitCode = 1;
});

// ─────────────────────────────────────────────────────────────────────────────
// Uso:
//   Red local:   npx hardhat run scripts/deploy.js --network localhost
//   Sepolia:     npx hardhat run scripts/deploy.js --network sepolia
// ─────────────────────────────────────────────────────────────────────────────
