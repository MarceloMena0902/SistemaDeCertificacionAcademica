import { useState } from "react";
import { ethers }   from "ethers";
import { useContract }       from "../../hooks/useContract";
import { useWeb3 }           from "../../context/Web3Context";
import { calcularHashPDF, formatHashDisplay } from "../../utils/hashUtils";
import { descargarCertificado }               from "../../utils/pdfGenerator";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const SEPOLIA_CHAIN_ID = 11155111;

const etherscanTx = (chainId, hash) =>
  chainId === SEPOLIA_CHAIN_ID
    ? `https://sepolia.etherscan.io/tx/${hash}`
    : null;

const abreviarHash = (hash) =>
  hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "";

const formatFecha = () =>
  new Date().toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EmitirCertificado() {
  const { chainId, account }           = useWeb3();
  const { emitirCertificado, loading } = useContract();

  // ── Archivo PDF ────────────────────────────────────────────────────────────
  const [archivoPDF,     setArchivoPDF]     = useState(null);
  const [hashDocumento,  setHashDocumento]  = useState("");
  const [calculandoHash, setCalculandoHash] = useState(false);

  // ── Campos del formulario ──────────────────────────────────────────────────
  const [codigo,  setCodigo]  = useState("");
  const [nombre,  setNombre]  = useState("");
  const [carrera, setCarrera] = useState("");
  const [wallet,  setWallet]  = useState("");
  const [errores, setErrores] = useState({});

  // ── Estado de resultado ────────────────────────────────────────────────────
  const [txHash,  setTxHash]  = useState("");
  const [txError, setTxError] = useState("");

  // ── Manejo del archivo PDF ─────────────────────────────────────────────────

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setArchivoPDF(null);
      setHashDocumento("");
      return;
    }

    setArchivoPDF(file);
    setHashDocumento("");
    setCalculandoHash(true);
    setTxError("");

    try {
      const hash = await calcularHashPDF(file);
      setHashDocumento(hash);
    } catch {
      setTxError("No se pudo calcular el hash del archivo PDF.");
    } finally {
      setCalculandoHash(false);
    }
  };

  // ── Validación ─────────────────────────────────────────────────────────────

  const validar = () => {
    const e = {};
    if (!archivoPDF)     e.pdf    = "Selecciona el archivo PDF del certificado.";
    if (!hashDocumento)  e.pdf    = e.pdf || "Espera a que se calcule el hash.";
    if (!codigo.trim())  e.codigo  = "El código del certificado es requerido.";
    if (!nombre.trim())  e.nombre  = "El nombre del estudiante es requerido.";
    if (!carrera.trim()) e.carrera = "La carrera es requerida.";
    if (!wallet.trim())  e.wallet  = "La wallet del estudiante es requerida.";
    else if (!ethers.isAddress(wallet.trim()))
                         e.wallet  = "Dirección Ethereum inválida.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  // ── Emitir ─────────────────────────────────────────────────────────────────

  const handleEmitir = async () => {
    if (!validar()) return;
    setTxError("");

    const { data, error } = await emitirCertificado(
      hashDocumento,
      codigo.trim(),
      nombre.trim(),
      wallet.trim()
    );

    if (error) {
      setTxError(error);
      return;
    }

    setTxHash(data.hash);
  };

  // ── Descarga del PDF visual ────────────────────────────────────────────────

  const handleDescargarPDF = async () => {
    await descargarCertificado({
      nombreEstudiante:  nombre.trim(),
      codigoCertificado: codigo.trim(),
      carrera:           carrera.trim(),
      universidad:       "Universidad Boliviana",
      fechaEmision:      formatFecha(),
      hashDocumento,
      emisorWallet:      account,
      emisorTxHash:      txHash,
    });
  };

  // ── Reiniciar ──────────────────────────────────────────────────────────────

  const handleNuevo = () => {
    setArchivoPDF(null); setHashDocumento(""); setCalculandoHash(false);
    setCodigo(""); setNombre(""); setCarrera(""); setWallet("");
    setErrores({}); setTxHash(""); setTxError("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const urlEtherscan = txHash ? etherscanTx(chainId, txHash) : null;

  // ══ Éxito: certificado emitido ════════════════════════════════════════════
  if (txHash) {
    return (
      <div className="form-card">
        <h3>Certificado Emitido Exitosamente</h3>

        <div className="alert alert-success" style={{ marginInline: 0 }}>
          <div style={{ width: "100%" }}>
            <strong>Certificado registrado en blockchain</strong>
            <p style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
              Hash de la transacción:{" "}
              <code style={{ background: "rgba(0,0,0,0.06)", padding: "0.1rem 0.3rem", borderRadius: 4 }}>
                {abreviarHash(txHash)}
              </code>
              {urlEtherscan ? (
                <a
                  href={urlEtherscan}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: "0.6rem", color: "var(--primary)", fontWeight: 600 }}
                >
                  Ver en Etherscan →
                </a>
              ) : (
                <span style={{ marginLeft: "0.6rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  (red local — Etherscan no disponible)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label>Hash del certificado registrado</label>
          <div className="hash-display" title={hashDocumento}>
            {hashDocumento}
          </div>
          <span className="form-hint">
            Este hash identifica el PDF original. Cualquier persona puede verificarlo
            subiendo el mismo archivo en la sección <em>Verificar</em>.
          </span>
        </div>

        <div style={{
          marginTop:    "1rem",
          padding:      "0.9rem 1rem",
          background:   "var(--bg)",
          border:       "1px dashed var(--border)",
          borderRadius: "var(--radius)",
          textAlign:    "center",
        }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            Genera un PDF visual del certificado con el hash y datos de emisión.
            <br />
            <span style={{ fontSize: "0.78rem" }}>
              El estudiante debe recibir el PDF original para poder verificar y firmar su recepción.
            </span>
          </p>
          <button
            className="btn-primary"
            onClick={handleDescargarPDF}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            Descargar PDF del Certificado
          </button>
        </div>

        <button
          className="btn-secondary"
          onClick={handleNuevo}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Emitir otro certificado
        </button>
      </div>
    );
  }

  // ══ Formulario ═══════════════════════════════════════════════════════════
  return (
    <div className="form-card">
      <h3>Emitir Certificado Académico</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
        Sube el PDF del certificado y completa los datos. El hash SHA-256 del archivo
        quedará registrado en blockchain como prueba de autenticidad.
      </p>

      {/* ── PDF ── */}
      <div className="form-group">
        <label htmlFor="pdf-emitir">Archivo PDF del certificado</label>
        <input
          id="pdf-emitir"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFile}
        />
        {calculandoHash && (
          <div className="loading-row" style={{ justifyContent: "flex-start", paddingLeft: 0 }}>
            <span className="spinner" /> Calculando hash SHA-256…
          </div>
        )}
        {hashDocumento && (
          <span className="form-hint">
            Hash calculado:{" "}
            <strong style={{ fontFamily: "monospace" }}>
              {formatHashDisplay(hashDocumento)}
            </strong>
          </span>
        )}
        {errores.pdf && (
          <span className="form-hint" style={{ color: "var(--danger)" }}>
            {errores.pdf}
          </span>
        )}
      </div>

      {/* ── Código ── */}
      <div className="form-group">
        <label htmlFor="codigo-input">Código del certificado</label>
        <input
          id="codigo-input"
          type="text"
          placeholder="Ej: CERT-2024-001"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        {errores.codigo && (
          <span className="form-hint" style={{ color: "var(--danger)" }}>
            {errores.codigo}
          </span>
        )}
      </div>

      {/* ── Nombre ── */}
      <div className="form-group">
        <label htmlFor="nombre-input">Nombre completo del estudiante</label>
        <input
          id="nombre-input"
          type="text"
          placeholder="Ej: Ana García López"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        {errores.nombre && (
          <span className="form-hint" style={{ color: "var(--danger)" }}>
            {errores.nombre}
          </span>
        )}
      </div>

      {/* ── Carrera ── */}
      <div className="form-group">
        <label htmlFor="carrera-input">Carrera / Programa académico</label>
        <input
          id="carrera-input"
          type="text"
          placeholder="Ej: Ingeniería de Sistemas Informáticos"
          value={carrera}
          onChange={(e) => setCarrera(e.target.value)}
        />
        {errores.carrera && (
          <span className="form-hint" style={{ color: "var(--danger)" }}>
            {errores.carrera}
          </span>
        )}
      </div>

      {/* ── Wallet ── */}
      <div className="form-group">
        <label htmlFor="wallet-input">Wallet del estudiante</label>
        <input
          id="wallet-input"
          type="text"
          placeholder="0x..."
          value={wallet}
          onChange={(e) => {
            setWallet(e.target.value);
            setErrores((p) => ({ ...p, wallet: "" }));
          }}
        />
        {errores.wallet ? (
          <span className="form-hint" style={{ color: "var(--danger)" }}>
            {errores.wallet}
          </span>
        ) : (
          <span className="form-hint">
            Dirección Ethereum de la wallet del estudiante (formato 0x…).
          </span>
        )}
      </div>

      {txError && (
        <div className="alert alert-error" style={{ marginInline: 0 }}>
          {txError}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleEmitir}
        disabled={loading || calculandoHash || !hashDocumento}
        style={{ width: "100%", marginTop: "0.5rem" }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
            <span className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
            Procesando transacción…
          </span>
        ) : (
          "Emitir Certificado"
        )}
      </button>
    </div>
  );
}
