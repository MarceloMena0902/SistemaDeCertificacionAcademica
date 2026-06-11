const { expect } = require("chai");
const { ethers } = require("hardhat");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, emisor1, emisor2, estudiante1, estudiante2, tercero] =
    await ethers.getSigners();

  const CertificadoNFT = await ethers.getContractFactory("CertificadoNFT");
  const nft = await CertificadoNFT.deploy();
  await nft.waitForDeployment();

  // Hashes de prueba
  const hash1 = ethers.keccak256(ethers.toUtf8Bytes("certificado_nft_1"));
  const hash2 = ethers.keccak256(ethers.toUtf8Bytes("certificado_nft_2"));

  // URI de metadata de prueba
  const uri1 = "QmTestHash1/metadata.json";
  const uri2 = "QmTestHash2/metadata.json";

  return { nft, owner, emisor1, emisor2, estudiante1, estudiante2, tercero, hash1, hash2, uri1, uri2 };
}

/**
 * Mintea un NFT de prueba para emisor1 → estudiante1 con hash1.
 */
async function mintFixture(nft, emisor1, estudiante1, hash1, uri1) {
  await nft.connect(emisor1).mintCertificado(estudiante1.address, hash1, uri1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("CertificadoNFT", function () {
  let nft, owner, emisor1, emisor2, estudiante1, estudiante2, tercero;
  let hash1, hash2, uri1, uri2;

  beforeEach(async function () {
    ({ nft, owner, emisor1, emisor2, estudiante1, estudiante2, tercero,
       hash1, hash2, uri1, uri2 } = await deployFixture());
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Despliegue
  // ───────────────────────────────────────────────────────────────────────────

  describe("Despliegue", function () {
    it("tiene el nombre correcto: CertificadoAcademico", async function () {
      expect(await nft.name()).to.equal("CertificadoAcademico");
    });

    it("tiene el símbolo correcto: CERT", async function () {
      expect(await nft.symbol()).to.equal("CERT");
    });

    it("el owner del contrato es el deployer", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("el contador de tokens arranca en 0 (totalSupply = 0)", async function () {
      expect(await nft.totalSupply()).to.equal(0n);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Gestión de emisores
  // ───────────────────────────────────────────────────────────────────────────

  describe("Gestión de Emisores", function () {
    it("owner puede autorizar un emisor", async function () {
      await nft.connect(owner).autorizarEmisor(emisor1.address);
      expect(await nft.emisoresAutorizados(emisor1.address)).to.equal(true);
    });

    it("emite evento EmisorAutorizado al autorizar", async function () {
      await expect(nft.connect(owner).autorizarEmisor(emisor1.address))
        .to.emit(nft, "EmisorAutorizado")
        .withArgs(emisor1.address);
    });

    it("no-owner no puede autorizar emisores (revert)", async function () {
      await expect(
        nft.connect(tercero).autorizarEmisor(emisor1.address)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Mint de certificados
  // ───────────────────────────────────────────────────────────────────────────

  describe("Mint de Certificados", function () {
    beforeEach(async function () {
      await nft.connect(owner).autorizarEmisor(emisor1.address);
    });

    it("emisor autorizado puede mintear un NFT", async function () {
      await expect(
        nft.connect(emisor1).mintCertificado(estudiante1.address, hash1, uri1)
      ).to.not.be.reverted;
    });

    it("emite evento CertificadoMinted con los datos correctos", async function () {
      await expect(
        nft.connect(emisor1).mintCertificado(estudiante1.address, hash1, uri1)
      )
        .to.emit(nft, "CertificadoMinted")
        .withArgs(1n, hash1, estudiante1.address);
    });

    it("el tokenId incrementa correctamente con cada mint", async function () {
      await nft.connect(emisor1).mintCertificado(estudiante1.address, hash1, uri1);
      await nft.connect(emisor1).mintCertificado(estudiante2.address, hash2, uri2);

      expect(await nft.totalSupply()).to.equal(2n);
    });

    it("los tokenIds son 1 y 2 para el primer y segundo mint", async function () {
      await nft.connect(emisor1).mintCertificado(estudiante1.address, hash1, uri1);
      await nft.connect(emisor1).mintCertificado(estudiante2.address, hash2, uri2);

      // tokenAHash[1] debe ser hash1 y tokenAHash[2] debe ser hash2
      expect(await nft.tokenAHash(1n)).to.equal(hash1);
      expect(await nft.tokenAHash(2n)).to.equal(hash2);
    });

    it("el NFT pertenece al estudiante correcto tras el mint", async function () {
      await mintFixture(nft, emisor1, estudiante1, hash1, uri1);
      expect(await nft.ownerOf(1n)).to.equal(estudiante1.address);
    });

    it("el tokenURI queda registrado con el prefijo ipfs://", async function () {
      await mintFixture(nft, emisor1, estudiante1, hash1, uri1);
      // _baseURI() = "ipfs://" + uri almacenado
      expect(await nft.tokenURI(1n)).to.equal(`ipfs://${uri1}`);
    });

    it("no-emisor no puede mintear (revert)", async function () {
      await expect(
        nft.connect(tercero).mintCertificado(estudiante1.address, hash1, uri1)
      ).to.be.revertedWith(
        "CertificadoNFT: solo un emisor autorizado puede ejecutar esta funcion"
      );
    });

    it("hash duplicado hace revert", async function () {
      await mintFixture(nft, emisor1, estudiante1, hash1, uri1);

      await expect(
        nft.connect(emisor1).mintCertificado(estudiante2.address, hash1, uri2)
      ).to.be.revertedWith(
        "CertificadoNFT: hash ya registrado"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Verificación
  // ───────────────────────────────────────────────────────────────────────────

  describe("Verificación", function () {
    beforeEach(async function () {
      await nft.connect(owner).autorizarEmisor(emisor1.address);
      await mintFixture(nft, emisor1, estudiante1, hash1, uri1);
    });

    it("verificarPorHash retorna exists=true para hash registrado", async function () {
      const resultado = await nft.verificarPorHash(hash1);
      expect(resultado.exists).to.equal(true);
    });

    it("verificarPorHash retorna el tokenId correcto", async function () {
      const resultado = await nft.verificarPorHash(hash1);
      expect(resultado.tokenId).to.equal(1n);
    });

    it("verificarPorHash retorna el owner correcto", async function () {
      const resultado = await nft.verificarPorHash(hash1);
      expect(resultado.owner).to.equal(estudiante1.address);
    });

    it("verificarPorHash retorna exists=false para hash no registrado", async function () {
      const hashFalso = ethers.keccak256(ethers.toUtf8Bytes("hash_inexistente"));
      const resultado = await nft.verificarPorHash(hashFalso);
      expect(resultado.exists).to.equal(false);
      expect(resultado.tokenId).to.equal(0n);
      expect(resultado.owner).to.equal(ethers.ZeroAddress);
    });

    it("obtenerHashDeToken retorna el hash correcto para tokenId 1", async function () {
      expect(await nft.obtenerHashDeToken(1n)).to.equal(hash1);
    });

    it("obtenerHashDeToken retorna bytes32(0) para tokenId inexistente", async function () {
      expect(await nft.obtenerHashDeToken(999n)).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("la relación inversa hashAToken es consistente", async function () {
      const tokenId = await nft.hashAToken(hash1);
      expect(tokenId).to.equal(1n);
      expect(await nft.tokenAHash(tokenId)).to.equal(hash1);
    });
  });
});
