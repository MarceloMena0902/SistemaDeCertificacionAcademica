const { expect }         = require("chai");
const { ethers }         = require("hardhat");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Despliega una instancia fresca del contrato y retorna el contrato
 * junto con los signers estándar usados en todos los tests.
 */
async function deployFixture() {
  const [owner, emisor1, emisor2, estudiante1, estudiante2, tercero] =
    await ethers.getSigners();

  const AcademicCertification = await ethers.getContractFactory(
    "AcademicCertification"
  );
  const contrato = await AcademicCertification.deploy();
  await contrato.waitForDeployment();

  // Hash de prueba reproducible
  const hashDocumento = ethers.keccak256(
    ethers.toUtf8Bytes("certificado_prueba_1")
  );

  return { contrato, owner, emisor1, emisor2, estudiante1, estudiante2, tercero, hashDocumento };
}

/**
 * Emite un certificado de prueba con valores por defecto razonables.
 * Retorna el hash utilizado.
 */
async function emitirCertificadoDefault(contrato, emisor, estudiante, hash) {
  await contrato
    .connect(emisor)
    .emitirCertificado(hash, "CERT-2024-001", "Ana García", estudiante.address);
  return hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite principal
// ─────────────────────────────────────────────────────────────────────────────

describe("AcademicCertification", function () {
  // Variables compartidas — se reasignan en cada beforeEach
  let contrato, owner, emisor1, emisor2, estudiante1, estudiante2, tercero, hashDocumento;

  beforeEach(async function () {
    ({ contrato, owner, emisor1, emisor2, estudiante1, estudiante2, tercero, hashDocumento } =
      await deployFixture());
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Gestión de Emisores
  // ───────────────────────────────────────────────────────────────────────────

  describe("Gestión de Emisores", function () {
    it("owner está autorizado como emisor por defecto", async function () {
      expect(await contrato.emisoresAutorizados(owner.address)).to.equal(true);
    });

    it("owner puede autorizar un nuevo emisor", async function () {
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
      expect(await contrato.emisoresAutorizados(emisor1.address)).to.equal(true);
    });

    it("emite evento EmisorAutorizado al autorizar un emisor", async function () {
      await expect(contrato.connect(owner).autorizarEmisor(emisor1.address))
        .to.emit(contrato, "EmisorAutorizado")
        .withArgs(emisor1.address);
    });

    it("no-owner no puede autorizar emisores (revert)", async function () {
      await expect(
        contrato.connect(tercero).autorizarEmisor(emisor1.address)
      ).to.be.revertedWith(
        "AcademicCertification: solo el owner puede ejecutar esta funcion"
      );
    });

    it("owner puede revocar un emisor previamente autorizado", async function () {
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
      await contrato.connect(owner).revocarEmisor(emisor1.address);
      expect(await contrato.emisoresAutorizados(emisor1.address)).to.equal(false);
    });

    it("emite evento EmisorRevocado al revocar un emisor", async function () {
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
      await expect(contrato.connect(owner).revocarEmisor(emisor1.address))
        .to.emit(contrato, "EmisorRevocado")
        .withArgs(emisor1.address);
    });

    it("owner no puede auto-revocarse (revert)", async function () {
      await expect(
        contrato.connect(owner).revocarEmisor(owner.address)
      ).to.be.revertedWith(
        "AcademicCertification: no se puede revocar al owner"
      );
    });

    it("emisor revocado no puede emitir certificados (revert)", async function () {
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
      await contrato.connect(owner).revocarEmisor(emisor1.address);

      await expect(
        contrato
          .connect(emisor1)
          .emitirCertificado(hashDocumento, "CERT-2024-001", "Ana García", estudiante1.address)
      ).to.be.revertedWith(
        "AcademicCertification: solo un emisor autorizado puede ejecutar esta funcion"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Emisión de Certificados
  // ───────────────────────────────────────────────────────────────────────────

  describe("Emisión de Certificados", function () {
    beforeEach(async function () {
      // Autorizar emisor1 antes de cada test de este bloque
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
    });

    it("emisor autorizado puede emitir un certificado", async function () {
      await expect(
        contrato
          .connect(emisor1)
          .emitirCertificado(hashDocumento, "CERT-2024-001", "Ana García", estudiante1.address)
      ).to.not.be.reverted;
    });

    it("emite evento CertificadoEmitido con los datos correctos", async function () {
      await expect(
        contrato
          .connect(emisor1)
          .emitirCertificado(hashDocumento, "CERT-2024-001", "Ana García", estudiante1.address)
      )
        .to.emit(contrato, "CertificadoEmitido")
        .withArgs(hashDocumento, "CERT-2024-001", estudiante1.address, emisor1.address);
    });

    it("el certificado queda almacenado correctamente (verifica todos los campos)", async function () {
      const tx = await contrato
        .connect(emisor1)
        .emitirCertificado(hashDocumento, "CERT-2024-001", "Ana García", estudiante1.address);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);

      const cert = await contrato.verificarCertificado(hashDocumento);

      expect(cert.codigoCertificado).to.equal("CERT-2024-001");
      expect(cert.nombreEstudiante).to.equal("Ana García");
      expect(cert.estudianteWallet).to.equal(estudiante1.address);
      expect(cert.emisor).to.equal(emisor1.address);
      expect(cert.fechaEmision).to.equal(BigInt(block.timestamp));
      expect(cert.revocado).to.equal(false);
      expect(cert.motivoRevocacion).to.equal("");
      expect(cert.firmadoPorEstudiante).to.equal(false);
      expect(cert.fechaFirmaEstudiante).to.equal(0n);
      expect(cert.exists).to.equal(true);
    });

    it("el hash del certificado se agrega al historial del estudiante", async function () {
      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);

      const historial = await contrato.obtenerCertificadosDeEstudiante(estudiante1.address);

      expect(historial).to.have.lengthOf(1);
      expect(historial[0]).to.equal(hashDocumento);
    });

    it("no-emisor no puede emitir certificados (revert)", async function () {
      await expect(
        contrato
          .connect(tercero)
          .emitirCertificado(hashDocumento, "CERT-2024-001", "Ana García", estudiante1.address)
      ).to.be.revertedWith(
        "AcademicCertification: solo un emisor autorizado puede ejecutar esta funcion"
      );
    });

    it("no se puede emitir un certificado con hash duplicado (revert)", async function () {
      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);

      await expect(
        contrato
          .connect(emisor1)
          .emitirCertificado(hashDocumento, "CERT-2024-002", "Otro Nombre", estudiante2.address)
      ).to.be.revertedWith(
        "AcademicCertification: el certificado ya existe"
      );
    });

    it("no se puede emitir con wallet address(0) como estudiante (revert)", async function () {
      await expect(
        contrato
          .connect(emisor1)
          .emitirCertificado(hashDocumento, "CERT-2024-001", "Ana García", ethers.ZeroAddress)
      ).to.be.revertedWith(
        "AcademicCertification: wallet del estudiante invalida"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Firma de Recepción
  // ───────────────────────────────────────────────────────────────────────────

  describe("Firma de Recepción", function () {
    beforeEach(async function () {
      // Estado base: emisor1 autorizado + certificado emitido a estudiante1
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);
    });

    it("el estudiante puede firmar la recepción de su propio certificado", async function () {
      await expect(
        contrato.connect(estudiante1).firmarRecepcion(hashDocumento)
      ).to.not.be.reverted;
    });

    it("emite evento CertificadoFirmado con los datos correctos", async function () {
      await expect(contrato.connect(estudiante1).firmarRecepcion(hashDocumento))
        .to.emit(contrato, "CertificadoFirmado")
        .withArgs(hashDocumento, estudiante1.address);
    });

    it("firmadoPorEstudiante = true y fechaFirmaEstudiante > 0 tras firmar", async function () {
      await contrato.connect(estudiante1).firmarRecepcion(hashDocumento);

      const cert = await contrato.verificarCertificado(hashDocumento);

      expect(cert.firmadoPorEstudiante).to.equal(true);
      expect(cert.fechaFirmaEstudiante).to.be.gt(0n);
    });

    it("tercero no puede firmar el certificado de otro estudiante (revert)", async function () {
      await expect(
        contrato.connect(tercero).firmarRecepcion(hashDocumento)
      ).to.be.revertedWith(
        "AcademicCertification: solo el estudiante propietario puede firmar"
      );
    });

    it("no se puede firmar el mismo certificado dos veces (revert)", async function () {
      await contrato.connect(estudiante1).firmarRecepcion(hashDocumento);

      await expect(
        contrato.connect(estudiante1).firmarRecepcion(hashDocumento)
      ).to.be.revertedWith(
        "AcademicCertification: el certificado ya fue firmado"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Revocación de Certificados
  // ───────────────────────────────────────────────────────────────────────────

  describe("Revocación de Certificados", function () {
    const MOTIVO = "Título obtenido con documentación fraudulenta";

    beforeEach(async function () {
      // Estado base: emisor1 autorizado + certificado emitido a estudiante1
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);
    });

    it("emisor autorizado puede revocar un certificado con un motivo", async function () {
      await expect(
        contrato.connect(emisor1).revocarCertificado(hashDocumento, MOTIVO)
      ).to.not.be.reverted;
    });

    it("emite evento CertificadoRevocado con los datos correctos", async function () {
      await expect(contrato.connect(emisor1).revocarCertificado(hashDocumento, MOTIVO))
        .to.emit(contrato, "CertificadoRevocado")
        .withArgs(hashDocumento, MOTIVO, emisor1.address);
    });

    it("revocado = true y motivoRevocacion queda guardado en el contrato", async function () {
      await contrato.connect(emisor1).revocarCertificado(hashDocumento, MOTIVO);

      const cert = await contrato.verificarCertificado(hashDocumento);

      expect(cert.revocado).to.equal(true);
      expect(cert.motivoRevocacion).to.equal(MOTIVO);
    });

    it("el historial completo del certificado se conserva tras la revocación", async function () {
      await contrato.connect(emisor1).revocarCertificado(hashDocumento, MOTIVO);

      const cert = await contrato.verificarCertificado(hashDocumento);

      // Los datos originales no se borran
      expect(cert.exists).to.equal(true);
      expect(cert.codigoCertificado).to.equal("CERT-2024-001");
      expect(cert.nombreEstudiante).to.equal("Ana García");
      expect(cert.estudianteWallet).to.equal(estudiante1.address);
      expect(cert.emisor).to.equal(emisor1.address);
      expect(cert.fechaEmision).to.be.gt(0n);
    });

    it("no-emisor no puede revocar un certificado (revert)", async function () {
      await expect(
        contrato.connect(tercero).revocarCertificado(hashDocumento, MOTIVO)
      ).to.be.revertedWith(
        "AcademicCertification: solo un emisor autorizado puede ejecutar esta funcion"
      );
    });

    it("no se puede revocar un certificado que ya fue revocado (revert)", async function () {
      await contrato.connect(emisor1).revocarCertificado(hashDocumento, MOTIVO);

      await expect(
        contrato.connect(emisor1).revocarCertificado(hashDocumento, "Otro motivo")
      ).to.be.revertedWith(
        "AcademicCertification: el certificado ya fue revocado"
      );
    });

    it("motivo vacío hace revert", async function () {
      await expect(
        contrato.connect(emisor1).revocarCertificado(hashDocumento, "")
      ).to.be.revertedWith(
        "AcademicCertification: el motivo no puede estar vacio"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Verificación
  // ───────────────────────────────────────────────────────────────────────────

  describe("Verificación", function () {
    beforeEach(async function () {
      await contrato.connect(owner).autorizarEmisor(emisor1.address);
    });

    it("verificarCertificado retorna exists=true para un certificado válido", async function () {
      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);

      const cert = await contrato.verificarCertificado(hashDocumento);

      expect(cert.exists).to.equal(true);
    });

    it("verificarCertificado retorna exists=false para un hash inexistente", async function () {
      const hashFalso = ethers.keccak256(ethers.toUtf8Bytes("hash_que_no_existe"));

      const cert = await contrato.verificarCertificado(hashFalso);

      expect(cert.exists).to.equal(false);
    });

    it("verificarCertificado muestra revocado=true después de revocar", async function () {
      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);
      await contrato
        .connect(emisor1)
        .revocarCertificado(hashDocumento, "Motivo de prueba");

      const cert = await contrato.verificarCertificado(hashDocumento);

      expect(cert.revocado).to.equal(true);
    });

    it("obtenerCertificadosDeEstudiante retorna el array correcto con múltiples certificados", async function () {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("certificado_prueba_2"));

      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);
      await contrato
        .connect(emisor1)
        .emitirCertificado(hash2, "CERT-2024-002", "Ana García", estudiante1.address);

      const historial = await contrato.obtenerCertificadosDeEstudiante(estudiante1.address);

      expect(historial).to.have.lengthOf(2);
      expect(historial[0]).to.equal(hashDocumento);
      expect(historial[1]).to.equal(hash2);
    });

    it("obtenerCertificadosDeEstudiante retorna array vacío para un estudiante sin certificados", async function () {
      const historial = await contrato.obtenerCertificadosDeEstudiante(estudiante2.address);

      expect(historial).to.have.lengthOf(0);
    });

    it("los historiales de dos estudiantes distintos son independientes", async function () {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("certificado_prueba_2"));

      await emitirCertificadoDefault(contrato, emisor1, estudiante1, hashDocumento);
      await contrato
        .connect(emisor1)
        .emitirCertificado(hash2, "CERT-2024-002", "Carlos López", estudiante2.address);

      const historialE1 = await contrato.obtenerCertificadosDeEstudiante(estudiante1.address);
      const historialE2 = await contrato.obtenerCertificadosDeEstudiante(estudiante2.address);

      expect(historialE1).to.have.lengthOf(1);
      expect(historialE2).to.have.lengthOf(1);
      expect(historialE1[0]).to.equal(hashDocumento);
      expect(historialE2[0]).to.equal(hash2);
    });
  });
});

// npx hardhat test
