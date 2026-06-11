import { useState } from "react";
import { useContract }                        from "../../hooks/useContract";
import { useWeb3 }                            from "../../context/Web3Context";
import { calcularHashPDF, formatHashDisplay } from "../../utils/hashUtils";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const SEPOLIA_CHAIN_ID = 11155111;

const formatFecha = (ts) =>
  ts
    ? new Date(Number(ts) * 1000).toLocaleDateString("es-ES", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

const abreviarDir = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

const etherscanTx = (chainId, hash) =>
  chainId === SEPOLIA_CHAIN_ID
    ? `https://sepolia.etherscan.io/tx/${hash}`
    : null;

const MOTIVO_MIN = 10;

// ─── Sub-componente: preview del certificado encontrado ───────────────────────

function PreviewCertificado({ cert }) {
  const esRevocado = cert.revocado;
  return (
    <div
      className="cert-card"
      style={{
        borderColor: esRevocado ? "var(--danger)" : "var(--accent)",
        background:  esRevocado ? "#fef2f2"       : "#eff6ff",
        marginTop:   "1rem",
      }}
    >
      <div className="cert-header">
        <span className="cert-title">
          {esRevocado ? "❌ Certificado ya revocado" : "📋 Certificado encontrado"}
        </span>
        <span className={`badge ${esRevocado ? "badge-danger" : "badge-info"}`}>
          {esRevocado ? "Revocado" : "Activo"}
        </span>
      </div>

      <div className="cert-field">
        <span className="cert-field-label">Nombre</span>
        <span className="cert-field-value normal">{cert.nombreEstudiante}</span>
      </div>
      <div className="cert-field">
        <span className="cert-field-label">Código</span>
        <span className="cert-field-value normal">{cert.codigoCertificado}</span>
      </div>
      <div className="cert-field">
        <span className="cert-field-label">Emisor</span>
        <span className="cert-field-value" title={cert.emisor}>{abreviarDir(cert.emisor)}</span>
      </div>
      <div className="cert-field">
        <span className="cert-field-label">Fecha de emisión</span>
        <span className="cert-field-value normal">{formatFecha(cert.fechaEmision)}</span>
      </div>

      {esRevocado && (
        <div className="alert alert-error" style={{ marginInline: 0, marginTop: "0.75rem", marginBottom: 0 }}>
          <strong>Motivo de revocación:</strong> {cert.motivoRevocacion}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RevocarCertificado() {
  const { chainId }                              = useWeb3();
  const { verificarCertificado, revocarCertificado } = useContract();

  // Modo de entrada del hash
  const [modoInput,      setModoInput]      = useState("pdf");

  // Campos de entrada
  const [hashCalculado,  setHashCalculado]  = useState("");
  const [calculandoHash, setCalculandoHash] = useState(false);
  const [hashManual,     setHashManual]     = useState("");

  // Hash definitivo a usar
  const hashDocumento = modoInput === "pdf" ? hashCalculado : hashManual.trim();

  // Búsqueda del certificado
  const [certPreview,   setCertPreview]   = useState(null);
  const [buscando,      setBuscando]      = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");

  // Formulario de revocación
  const [motivo,     setMotivo]     = useState("");
  const [errorMotivo, setErrorMotivo] = useState("");

  // Flujo de confirmación de dos pasos
  const [confirmando, setConfirmando] = useState(false);
  const [procesando,  setProcesando]  = useState(false);

  // Resultado
  const [txHash,  setTxHash]  = useState("");
  const [txError, setTxError] = useState("");

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) { setHashCalculado(""); return; }

    setHashCalculado("");
    resetBusqueda();
    setCalculandoHash(true);

    try {
      const hash = await calcularHashPDF(file);
      setHashCalculado(hash);
    } catch {
      setErrorBusqueda("No se pudo leer el archivo PDF.");
    } finally {
      setCalculandoHash(false);
    }
  };

  const resetBusqueda = () => {
    setCertPreview(null);
    setErrorBusqueda("");
    setMotivo("");
    setErrorMotivo("");
    setConfirmando(false);
    setTxHash("");
    setTxError("");
  };

  const handleBuscar = async () => {
    if (!hashDocumento) {
      setErrorBusqueda(
        modoInput === "pdf"
          ? "Selecciona primero un archivo PDF."
          : "Ingresa el hash del certificado."
      );
      return;
    }

    resetBusqueda();
    setBuscando(true);

    const { data, error } = await verificarCertificado(hashDocumento);

    if (error) {
      setErrorBusqueda(error);
    } else if (!data.exists) {
      setErrorBusqueda("El certificado no está registrado en la blockchain.");
    } else {
      setCertPreview(data);
    }
    setBuscando(false);
  };

  const handleRevocarClick = () => {
    // Validar motivo antes de entrar al flujo de confirmación
    if (motivo.trim().length < MOTIVO_MIN) {
      setErrorMotivo(`El motivo debe tener al menos ${MOTIVO_MIN} caracteres.`);
      return;
    }
    setErrorMotivo("");
    setConfirmando(true);
  };

  const handleConfirmar = async () => {
    setConfirmando(false);
    setTxError("");
    setProcesando(true);

    const { data, error } = await revocarCertificado(hashDocumento, motivo.trim());

    if (error) {
      setTxError(error);
    } else {
      setTxHash(data.hash);
      // Marcar el preview como revocado localmente
      setCertPreview((prev) => ({ ...prev, revocado: true, motivoRevocacion: motivo.trim() }));
      setMotivo("");
    }
    setProcesando(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const urlEtherscan = txHash ? etherscanTx(chainId, txHash) : null;
  const certYaRevocado = certPreview?.revocado;
  const puedeRevocar   = certPreview && !certYaRevocado && !txHash;

  return (
    <div className="form-card">
      <h3>🚫 Revocar Certificado</h3>

      {/* ── Selector de modo de entrada ── */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[
          { id: "pdf",  label: "📄 Por PDF"  },
          { id: "hash", label: "🔑 Por Hash" },
        ].map(({ id, label }) => (
          <label
            key={id}
            style={{
              display:    "flex", alignItems: "center", gap: "0.35rem",
              cursor:     "pointer", padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius)",
              border:     `1.5px solid ${modoInput === id ? "var(--primary)" : "var(--border)"}`,
              background:  modoInput === id ? "#eff6ff" : "var(--bg)",
              color:       modoInput === id ? "var(--primary)" : "var(--text-muted)",
              fontWeight:  modoInput === id ? 700 : 400,
              fontSize:    "0.88rem",
            }}
          >
            <input
              type="radio"
              name="modo-revocar"
              value={id}
              checked={modoInput === id}
              onChange={() => { setModoInput(id); resetBusqueda(); setHashCalculado(""); setHashManual(""); }}
              style={{ display: "none" }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* ── Entrada: PDF ── */}
      {modoInput === "pdf" && (
        <div className="form-group">
          <label htmlFor="pdf-revocar">Archivo PDF del certificado</label>
          <input
            id="pdf-revocar"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFile}
          />
          {calculandoHash && (
            <div className="loading-row" style={{ justifyContent: "flex-start", paddingLeft: 0 }}>
              <span className="spinner" /> Calculando hash…
            </div>
          )}
          {hashCalculado && (
            <span className="form-hint">
              Hash: <strong style={{ fontFamily: "monospace" }}>{formatHashDisplay(hashCalculado)}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── Entrada: hash manual ── */}
      {modoInput === "hash" && (
        <div className="form-group">
          <label htmlFor="hash-revocar">Hash SHA-256 del certificado (bytes32)</label>
          <input
            id="hash-revocar"
            type="text"
            placeholder="0x..."
            value={hashManual}
            onChange={(e) => { setHashManual(e.target.value); resetBusqueda(); }}
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </div>
      )}

      {/* ── Botón buscar ── */}
      <button
        className="btn-secondary"
        onClick={handleBuscar}
        disabled={buscando || calculandoHash || !hashDocumento}
        style={{ marginBottom: "0.75rem" }}
      >
        {buscando ? (
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="spinner" /> Buscando certificado…
          </span>
        ) : (
          "Buscar certificado"
        )}
      </button>

      {/* ── Error de búsqueda ── */}
      {errorBusqueda && (
        <div className="alert alert-error" style={{ marginInline: 0 }}>
          <span>⚠️</span> {errorBusqueda}
        </div>
      )}

      {/* ── Preview del certificado ── */}
      {certPreview && <PreviewCertificado cert={certPreview} />}

      {/* ── Formulario de revocación (solo si el cert existe y no está revocado) ── */}
      {puedeRevocar && (
        <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
          <div className="form-group">
            <label htmlFor="motivo">
              Motivo de revocación{" "}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                (mín. {MOTIVO_MIN} caracteres)
              </span>
            </label>
            <textarea
              id="motivo"
              placeholder="Describe el motivo de la revocación..."
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setErrorMotivo(""); setConfirmando(false); }}
              rows={3}
            />
            <span className="form-hint" style={{ color: motivo.trim().length < MOTIVO_MIN && motivo ? "var(--danger)" : "var(--text-muted)" }}>
              {motivo.trim().length}/{MOTIVO_MIN}+ caracteres
            </span>
            {errorMotivo && (
              <span className="form-hint" style={{ color: "var(--danger)" }}>
                {errorMotivo}
              </span>
            )}
          </div>

          {/* ── Botones de revocación con confirmación en dos pasos ── */}
          {!confirmando ? (
            <button
              className="btn-danger"
              onClick={handleRevocarClick}
              disabled={procesando}
              style={{ width: "100%" }}
            >
              Revocar Certificado
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn-danger"
                onClick={handleConfirmar}
                disabled={procesando}
                style={{ flex: 1 }}
              >
                {procesando ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <span className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
                    Procesando transacción…
                  </span>
                ) : (
                  "⚠️ Confirmar Revocación"
                )}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setConfirmando(false)}
                disabled={procesando}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Resultado: éxito ── */}
      {txHash && (
        <div className="alert alert-success" style={{ marginTop: "1.25rem", marginInline: 0 }}>
          <div style={{ width: "100%" }}>
            <strong>✅ Certificado revocado exitosamente</strong>
            <p style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
              Hash de la transacción:{" "}
              <code style={{ background: "rgba(0,0,0,0.06)", padding: "0.1rem 0.3rem", borderRadius: 4 }}>
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
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
      )}

      {/* ── Resultado: error ── */}
      {txError && (
        <div className="alert alert-error" style={{ marginTop: "1.25rem", marginInline: 0 }}>
          <span>⚠️</span> {txError}
        </div>
      )}
    </div>
  );
}
