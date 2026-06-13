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

const formatFecha = (ts = Date.now()) =>
  new Date(ts).toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EmitirCertificado() {
  const { chainId, account }           = useWeb3();
  const { emitirCertificado, loading } = useContract();

  // Campos del formulario
  const [hashDocumento,  setHashDocumento]  = useState("");
  const [calculandoHash, setCalculandoHash] = useState(false);
  const [codigo,         setCodigo]         = useState("");
  const [nombre,         setNombre]         = useState("");
  const [carrera,        setCarrera]        = useState("");
  const [wallet,         setWallet]         = useState("");

  // Resultados
  const [errores,    setErrores]    = useState({});
  const [txHash,     setTxHash]     = useState("");
  const [txError,    setTxError]    = useState("");

  /**
   * Datos del certificado emitido — guardados antes de limpiar el formulario
   * para poder generar el PDF tras el éxito sin perder los valores.
   */
  const [certEmitido, setCertEmitido] = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) { setHashDocumento(""); return; }

    setHashDocumento("");
    setTxError("");
    setCalculandoHash(true);

    try {
      const hash = await calcularHashPDF(file);
      setHashDocumento(hash);
    } catch {
      setTxError("No se pudo leer el archivo. Asegúrate de que sea un PDF válido.");
    } finally {
      setCalculandoHash(false);
    }
  };

  const validar = () => {
    const e = {};
    if (!hashDocumento)       e.archivo = "Selecciona un archivo PDF.";
    if (!codigo.trim())       e.codigo  = "El código del certificado es requerido.";
    if (!nombre.trim())       e.nombre  = "El nombre del estudiante es requerido.";
    if (!carrera.trim())      e.carrera = "La carrera es requerida.";
    if (!wallet.trim())       e.wallet  = "La wallet del estudiante es requerida.";
    else if (!ethers.isAddress(wallet.trim()))
                              e.wallet  = "Dirección Ethereum inválida.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTxHash("");
    setTxError("");
    setCertEmitido(null);
    if (!validar()) return;

    const { data, error } = await emitirCertificado(
      hashDocumento,
      codigo.trim(),
      nombre.trim(),
      wallet.trim()
    );

    if (error) {
      setTxError(error);
    } else {
      // Guardar todos los datos ANTES de limpiar el formulario
      setCertEmitido({
        nombreEstudiante:   nombre.trim(),
        codigoCertificado:  codigo.trim(),
        carrera:            carrera.trim(),
        fechaEmision:       formatFecha(),
        hashDocumento:      hashDocumento,
        emisorWallet:       account,
        emisorTxHash:       data.hash,
        // estudianteTxHash omitido → se mostrará PENDIENTE en el PDF
      });

      setTxHash(data.hash);

      // Limpiar formulario
      setCodigo("");
      setNombre("");
      setCarrera("");
      setWallet("");
      setHashDocumento("");
      setErrores({});
    }
  };

  const handleDescargarPDF = async () => {
    if (!certEmitido) return;
    await descargarCertificado(certEmitido);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const urlEtherscan = txHash ? etherscanTx(chainId, txHash) : null;

  return (
    <div className="form-card">
      <h3>📄 Emitir Certificado Académico</h3>

      <form onSubmit={handleSubmit} noValidate>

        {/* ── PDF ── */}
        <div className="form-group">
          <label htmlFor="pdf-input">Documento PDF del certificado</label>
          <input
            id="pdf-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFile}
          />
          <span className="form-hint">
            Se calculará el hash SHA-256 del archivo para registrarlo en la blockchain.
          </span>
          {errores.archivo && (
            <span className="form-hint" style={{ color: "var(--danger)" }}>
              {errores.archivo}
            </span>
          )}
        </div>

        {/* ── Hash calculado ── */}
        {calculandoHash && (
          <div className="loading-row" style={{ justifyContent: "flex-start", paddingLeft: 0 }}>
            <span className="spinner" />
            Calculando hash SHA-256…
          </div>
        )}
        {hashDocumento && (
          <div className="form-group">
            <label>Hash SHA-256 del documento (bytes32)</label>
            <div className="hash-display" title={hashDocumento}>
              {hashDocumento}
            </div>
            <span className="form-hint">
              Abreviado: <strong>{formatHashDisplay(hashDocumento)}</strong> — este valor
              se registrará en la blockchain para identificar el documento.
            </span>
          </div>
        )}

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
            onChange={(e) => { setWallet(e.target.value); setErrores((p) => ({ ...p, wallet: "" })); }}
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

        {/* ── Botón emitir ── */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || calculandoHash}
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
      </form>

      {/* ── Resultado: éxito ── */}
      {txHash && (
        <>
          <div className="alert alert-success" style={{ marginTop: "1.25rem", marginInline: 0 }}>
            <div style={{ width: "100%" }}>
              <strong>✅ Certificado emitido exitosamente</strong>
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

          {/* ── Botón descargar PDF ── */}
          <div style={{
            marginTop:     "1rem",
            padding:       "1rem",
            background:    "var(--bg)",
            border:        "1px dashed var(--border)",
            borderRadius:  "var(--radius)",
            textAlign:     "center",
          }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              Descarga la representación visual del certificado en PDF.
              <br />
              <span style={{ fontSize: "0.78rem" }}>
                ℹ️ El hash registrado en blockchain corresponde al documento PDF original que subiste,
                no a este PDF generado.
              </span>
            </p>
            <button
              className="btn-secondary"
              onClick={handleDescargarPDF}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span>⬇️</span>
              Descargar PDF del Certificado
            </button>
          </div>
        </>
      )}

      {/* ── Resultado: error ── */}
      {txError && (
        <div className="alert alert-error" style={{ marginTop: "1.25rem", marginInline: 0 }}>
          <span>⚠️</span>
          <span>{txError}</span>
        </div>
      )}
    </div>
  );
}
