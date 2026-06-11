// ─────────────────────────────────────────────────────────────────────────────
// deployLocal.js — Script de despliegue para desarrollo local
// Pensado para usarse con `npx hardhat node` corriendo en una terminal aparte.
// Extiende deploy.js con la autorización automática de un segundo emisor,
// para poder probar el flujo completo desde el frontend sin pasos manuales.
// ─────────────────────────────────────────────────────────────────────────────

const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

const { ethers } = hre;

async function main() {
  console.log("─────────────────────────────────────────────");
  console.log(" Desplegando AcademicCertification [LOCAL]");
  console.log("─────────────────────────────────────────────");

  // ── 1. Obtener signers ────────────────────────────────────────────────────
  // El nodo local de Hardhat provee 20 cuentas pre-fondeadas con 10 000 ETH cada una.
  //   signers[0] → deployer / owner del contrato (autorizado como emisor por defecto)
  //   signers[1] → segundo emisor que se autoriza automáticamente en este script
  const [deployer, emisor] = await ethers.getSigners();

  // ── 2. Info de cuentas ────────────────────────────────────────────────────
  const balanceDeployer = ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  );
  const balanceEmisor = ethers.formatEther(
    await ethers.provider.getBalance(emisor.address)
  );

  console.log(`\nDeployer (owner) : ${deployer.address}`);
  console.log(`Balance deployer : ${balanceDeployer} ETH`);
  console.log(`\nEmisor adicional : ${emisor.address}`);
  console.log(`Balance emisor   : ${balanceEmisor} ETH`);

  // ── 3. Deploy ─────────────────────────────────────────────────────────────
  console.log("\nDesplegando contrato...");
  const AcademicCertification = await ethers.getContractFactory("AcademicCertification");
  const contrato = await AcademicCertification.deploy();
  await contrato.waitForDeployment();

  const contractAddress = await contrato.getAddress();
  console.log(`\nContrato desplegado en : ${contractAddress}`);
  console.log(`Red                    : ${hre.network.name}`);

  // ── 4. Autorizar segundo emisor ───────────────────────────────────────────
  // En producción este paso se haría desde el frontend o una función admin.
  // Aquí lo automatizamos para tener el entorno local listo de inmediato.
  console.log("\nAutorizando emisor adicional...");
  const tx = await contrato.connect(deployer).autorizarEmisor(emisor.address);

  // Esperamos a que la transacción sea minada antes de continuar
  await tx.wait();

  // Verificamos en el estado del contrato que realmente quedó autorizado
  const estaAutorizado = await contrato.emisoresAutorizados(emisor.address);
  if (!estaAutorizado) {
    throw new Error("La autorización del emisor falló");
  }

  console.log(`✓ Emisor autorizado    : ${emisor.address}`);

  // ── 5. Leer ABI desde los artifacts ──────────────────────────────────────
  const artifact = await hre.artifacts.readArtifact("AcademicCertification");

  // ── 6. Guardar address + ABI en el frontend ───────────────────────────────
  const outputDir  = path.join(__dirname, "..", "..", "frontend", "src", "contracts");
  const outputFile = path.join(outputDir, "AcademicCertification.json");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`\nCarpeta creada : ${outputDir}`);
  }

  const contractData = {
    address: contractAddress,
    abi:     artifact.abi,
  };
  fs.writeFileSync(outputFile, JSON.stringify(contractData, null, 2));

  console.log(`\n✓ Archivo guardado en  : ${outputFile}`);

  // ── 7. Resumen para el desarrollador ─────────────────────────────────────
  // Imprime las cuentas listas para copiar en MetaMask o en el frontend .env
  console.log("\n─────────────────────────────────────────────");
  console.log(" Entorno local listo");
  console.log("─────────────────────────────────────────────");
  console.log(`\n Contrato   : ${contractAddress}`);
  console.log(` Owner      : ${deployer.address}  (signers[0])`);
  console.log(` Emisor     : ${emisor.address}  (signers[1])`);
  console.log("\n Importa estas cuentas en MetaMask usando las");
  console.log(" claves privadas que muestra `npx hardhat node`");
  console.log("─────────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error("\n✗ Error durante el despliegue local:", error);
  process.exitCode = 1;
});

// ─────────────────────────────────────────────────────────────────────────────
// Uso:
//   Red local:   npx hardhat run scripts/deployLocal.js --network localhost
//   Sepolia:     npx hardhat run scripts/deploy.js --network sepolia
// ─────────────────────────────────────────────────────────────────────────────
