// ─────────────────────────────────────────────────────────────────────────────
// deployNFT.js — Despliegue del contrato CertificadoNFT (ERC-721)
// Despliega el contrato, autoriza un emisor y mintea un NFT de prueba.
// ─────────────────────────────────────────────────────────────────────────────

const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

const { ethers } = hre;

async function main() {
  console.log("─────────────────────────────────────────────");
  console.log(" Desplegando CertificadoNFT (ERC-721)");
  console.log("─────────────────────────────────────────────");

  // ── 1. Signers ────────────────────────────────────────────────────────────
  const [deployer, emisor, estudiante] = await ethers.getSigners();

  const fmtBalance = async (signer) =>
    ethers.formatEther(await ethers.provider.getBalance(signer.address));

  console.log(`\nDeployer  : ${deployer.address}  (${await fmtBalance(deployer)} ETH)`);
  console.log(`Emisor    : ${emisor.address}  (${await fmtBalance(emisor)} ETH)`);
  console.log(`Estudiante: ${estudiante.address}  (${await fmtBalance(estudiante)} ETH)`);

  // ── 2. Deploy ─────────────────────────────────────────────────────────────
  console.log("\nDesplegando contrato...");
  const CertificadoNFT = await ethers.getContractFactory("CertificadoNFT");
  const nft = await CertificadoNFT.deploy();
  await nft.waitForDeployment();

  const contractAddress = await nft.getAddress();
  console.log(`\nContrato desplegado en : ${contractAddress}`);
  console.log(`Red                    : ${hre.network.name}`);
  console.log(`Nombre del token       : ${await nft.name()}`);
  console.log(`Símbolo del token      : ${await nft.symbol()}`);

  // ── 3. Autorizar emisor ───────────────────────────────────────────────────
  console.log("\nAutorizando emisor...");
  let tx = await nft.connect(deployer).autorizarEmisor(emisor.address);
  await tx.wait();
  console.log(`✓ Emisor autorizado    : ${emisor.address}`);

  // ── 4. Mint NFT de prueba ─────────────────────────────────────────────────
  // El hash del documento y el tokenURI son valores de ejemplo.
  // En producción, el hash sería el SHA-256 real del PDF y el URI apuntaría
  // al JSON de metadata subido a IPFS.
  console.log("\nMinteando NFT de prueba...");

  const hashDocumentoPrueba = ethers.keccak256(
    ethers.toUtf8Bytes("certificado_nft_prueba_1")
  );

  // URI de metadata (en producción sería un CID de IPFS real)
  const tokenURIPrueba = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

  tx = await nft
    .connect(emisor)
    .mintCertificado(estudiante.address, hashDocumentoPrueba, tokenURIPrueba);
  const receipt = await tx.wait();

  // Leer el tokenId del evento emitido
  const evento = receipt.logs
    .map((log) => { try { return nft.interface.parseLog(log); } catch { return null; } })
    .find((e) => e?.name === "CertificadoMinted");

  const tokenId = evento ? evento.args.tokenId.toString() : "1";

  console.log(`✓ NFT minteado         : tokenId ${tokenId}`);
  console.log(`  Hash documento       : ${hashDocumentoPrueba}`);
  console.log(`  Propietario          : ${await nft.ownerOf(tokenId)}`);
  console.log(`  Token URI            : ${await nft.tokenURI(tokenId)}`);

  // ── 5. Guardar ABI + dirección en el frontend ─────────────────────────────
  const artifact    = await hre.artifacts.readArtifact("CertificadoNFT");
  const outputDir   = path.join(__dirname, "..", "..", "frontend", "src", "contracts");
  const outputFile  = path.join(outputDir, "CertificadoNFT.json");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    outputFile,
    JSON.stringify({ address: contractAddress, abi: artifact.abi }, null, 2)
  );

  console.log(`\n✓ Archivo guardado en  : ${outputFile}`);

  // ── 6. Resumen ────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────");
  console.log(" Despliegue CertificadoNFT completado");
  console.log("─────────────────────────────────────────────");
  console.log(` Contrato    : ${contractAddress}`);
  console.log(` Owner       : ${deployer.address}`);
  console.log(` Emisor      : ${emisor.address}`);
  console.log(` NFT #1 para : ${estudiante.address}`);
  console.log("─────────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error("\n✗ Error durante el despliegue NFT:", error);
  process.exitCode = 1;
});

// ─────────────────────────────────────────────────────────────────────────────
// Uso:
//   Red local:   npx hardhat run scripts/deployNFT.js --network localhost
//   Sepolia:     npx hardhat run scripts/deployNFT.js --network sepolia
// ─────────────────────────────────────────────────────────────────────────────
