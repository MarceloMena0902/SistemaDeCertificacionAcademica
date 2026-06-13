import { useState, useEffect } from "react";
import { useContract }                        from "../../hooks/useContract";
import { useWeb3 }                            from "../../context/Web3Context";
import { calcularHashPDF, formatHashDisplay } from "../../utils/hashUtils";
import { descargarCertificado }               from "../../utils/pdfGenerator";

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

/** Valida que un string tenga el formato bytes32 hex (0x + 64 chars hex). */
const esHashValido = (h) => /^0x[0-9a-fA-F]{64}$/.test(h);

// ─── Sub-componente: preview del certificado ──────────────────────────────────

function PreviewCertificado({ cert, account, onFirmar, procesando }) {
  const mismaWallet =
    cert.estudianteWallet?.toLowerCase() === account?.toLowerCase();

  return (
    <div
      className="cert-card"
      style={{
        borderColor: cert.revocado ? "#fca5a5" : "#93c5fd",
        background:  cert.revocado ? "#fef2f2"  : "#eff6ff",
        marginTop:   "1.25rem",
      }}
    >
      {/* Encabezado */}
      <div className="cert-header">
        <span className="cert-title">{cert.codigoCertificado}</span>
        <span className={`badge ${cert.revocado ? "badge-danger" : "badge-info"}`}>
          {cert.revocado ? "Revocado" : "Activo"}
        </span>
      </div>

      {/* Campos */}
      <div className="cert-field">
        <span className="cert-field-label">Nombre</span>
        <span className="cert-field-value normal">{cert.nombreEstudiante}</span>
      </div>
      <div className="cert-field">
        <span className="cert-field-label">Emisor</span>
        <span className="cert-field-value" title={cert.emisor}>
          {abreviarDir(cert.emisor)}
        </span>
      </div>
      <div className="cert-field">
        <span className="cert-field-label">Fecha de emisión</span>
        <span className="cert-field-value normal">{formatFecha(cert.fechaEmision)}</span>
      </div>
      <div className="cert-field">
        <span className="cert-field-label">Destinatario</span>
        <span className="cert-field-value" title={cert.estudianteWallet}>
          {abreviarDir(cert.estudianteWallet)}
        </span>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginTop: "1rem", paddingTop: "1rem" }}>
        {/* Ya firmado */}
        {cert.firmadoPorEstudiante && (
          <div className="alert alert-success" style={{ marginInline: 0 }}>
            <div>
              <strong>✍️ Certificado ya firmado</strong>
              <p style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
                Firmado el {formatFecha(cert.fechaFirmaEstudiante)}
              </p>
            </div>
          </div>
        )}

        {/* No firmado — wallet correcta */}
        {!cert.firmadoPorEstudiante && !cert.revocado && mismaWallet && (
          <div>
            <div className="alert alert-warning" style={{ marginInline: 0, marginBottom: "0.75rem" }}>
              <span>⏳</span>
              <span>Este certificado está pendiente de tu firma de recepción.</span>
            </div>
            <button
              className="btn-primary"
              onClick={onFirmar}
              disabled={procesando}
              style={{ width: "100%" }}
            >
              {procesando ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
                  <span className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
                  Procesando firma…
                </span>
              ) : (
                "✍️ Firmar Recepción"
              )}
            </button>
          </div>
        )}

        {/* No firmado — wallet incorrecta */}
        {!cert.firmadoPorEstudiante && !cert.revocado && !mismaWallet && (
          <div className="alert alert-error" style={{ marginInline: 0 }}>
            <span>🚫</span>
            <div>
              <strong>Esta wallet no es la destinataria del certificado.</strong>
              <p style={{ marginTop: "0.3rem", fontSize: "0.82rem" }}>
                El certificado pertenece a{" "}
                <code style={{ background: "rgba(0,0,0,0.06)", padding: "0.1rem 0.3rem", borderRadius: 4 }}>
                  {abreviarDir(cert.estudianteWallet)}
                </code>.
                Cambia de cuenta en MetaMask para firmar.
              </p>
            </div>
          </div>
        )}

        {/* Revocado */}
        {cert.revocado && (
          <div className="alert alert-error" style={{ marginInline: 0 }}>
            <span>❌</span>
            <div>
              <strong>Certificado revocado — no se puede firmar.</strong>
              <p style={{ marginTop: "0.3rem", fontSize: "0.82rem" }}>
                Motivo: {cert.motivoRevocacion}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FirmarRecepcion() {
  const { account, chainId }                        = useWeb3();
  const { verificarCertificado, firmarRecepcion }   = useContract();

  const [modo,          setModo]          = useState("pdf");
  const [hashCalculado, setHashCalculado] = useState("");
  const [calculandoHash,setCalculandoHash]= useState(false);
  const [hashManual,    setHashManual]    = useState("");

  const [certData,      setCertData]      = useState(null);
  const [buscando,      setBuscando]      = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");

  const [procesando,    setProcesando]    = useState(false);
  const [txHash,        setTxHash]        = useState("");
  const [txError,       setTxError]       = useState("");

  // Hash activo según el modo seleccionado
  const hashDocumento = modo === "pdf" ? hashCalculado : hashManual.trim();

  // ── Auto-búsqueda cuando el hash activo es válido ──────────────────────────
  useEffect(() => {
    setCertData(null);
    setErrorBusqueda("");
    setTxHash("");
    setTxError("");

    if (!esHashValido(hashDocumento)) return;

    let cancelado = false;
    setBuscando(true);

    verificarCertificado(hashDocumento).then(({ data, error }) => {
      if (cancelado) return;
      setBuscando(false);
      if (error) {
        setErrorBusqueda(error);
      } else if (!data.exists) {
        setErrorBusqueda("El certificado no está registrado en la blockchain.");
      } else {
        setCertData(data);
      }
    });

    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashDocumento]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) { setHashCalculado(""); return; }

    setHashCalculado("");
    setCalculandoHash(true);

    try {
      const hash = await calcularHashPDF(file);
      setHashCalculado(hash);
    } catch {
      setErrorBusqueda("No se pudo calcular el hash del archivo.");
    } finally {
      setCalculandoHash(false);
    }
  };

  const handleFirmar = async () => {
    setTxError("");
    setProcesando(true);

    const { data, error } = await firmarRecepcion(hashDocumento);

    if (error) {
      setTxError(error);
    } else {
      setTxHash(data.hash);
      // Actualizar el preview localmente sin refetch
      setCertData((prev) => ({
        ...prev,
        firmadoPorEstudiante: true,
        fechaFirmaEstudiante: Math.floor(Date.now() / 1000),
      }));
    }
    setProcesando(false);
  };

  const handleDescargarPDF = () => {
    if (!certData || !txHash) return;
    descargarCertificado({
      nombreEstudiante:     certData.nombreEstudiante,
      codigoCertificado:    certData.codigoCertificado,
      carrera:              "—",
      fechaEmision:         formatFecha(certData.fechaEmision),
      hashDocumento:        hashDocumento,
      emisorWallet:         certData.emisor,
      estudianteTxHash:     txHash,
      fechaFirmaEstudiante: formatFecha(certData.fechaFirmaEstudiante),
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const urlEtherscan = txHash ? etherscanTx(chainId, txHash) : null;

  return (
    <div className="form-card">
      <h3>✍️ Firmar Recepción de Certificado</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
        Como estudiante, puedes firmar digitalmente la recepción de tu certificado
        para confirmar que lo has recibido.
      </p>

      {/* ── Selector de modo ── */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[
          { id: "pdf",  label: "📄 Buscar por PDF"  },
          { id: "hash", label: "🔑 Buscar por Hash" },
        ].map(({ id, label }) => (
          <label
            key={id}
            style={{
              display:      "flex", alignItems: "center", gap: "0.35rem",
              cursor:       "pointer", padding: "0.4rem 0.9rem",
              borderRadius: "var(--radius)",
              border:       `1.5px solid ${modo === id ? "var(--primary)" : "var(--border)"}`,
              background:    modo === id ? "#eff6ff" : "var(--bg)",
              color:         modo === id ? "var(--primary)" : "var(--text-muted)",
              fontWeight:    modo === id ? 700 : 400,
              fontSize:      "0.88rem",
              transition:    "all 0.15s",
            }}
          >
            <input
              type="radio"
              name="modo-firmar"
              value={id}
              checked={modo === id}
              onChange={() => {
                setModo(id);
                setHashCalculado("");
                setHashManual("");
              }}
              style={{ display: "none" }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* ── Entrada PDF ── */}
      {modo === "pdf" && (
        <div className="form-group">
          <label htmlFor="pdf-firmar">Archivo PDF del certificado</label>
          <input
            id="pdf-firmar"
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
              Hash calculado:{" "}
              <strong style={{ fontFamily: "monospace" }}>
                {formatHashDisplay(hashCalculado)}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* ── Entrada hash manual ── */}
      {modo === "hash" && (
        <div className="form-group">
          <label htmlFor="hash-firmar">Hash SHA-256 del certificado (bytes32)</label>
          <input
            id="hash-firmar"
            type="text"
            placeholder="0x..."
            value={hashManual}
            onChange={(e) => setHashManual(e.target.value)}
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
          />
          <span className="form-hint">
            El certificado se buscará automáticamente cuando el hash sea válido (66 caracteres).
          </span>
        </div>
      )}

      {/* ── Loading búsqueda ── */}
      {buscando && (
        <div className="loading-row">
          <span className="spinner" />
          Consultando la blockchain…
        </div>
      )}

      {/* ── Error de búsqueda ── */}
      {errorBusqueda && (
        <div className="alert alert-error" style={{ marginInline: 0, marginTop: "0.75rem" }}>
          <span>⚠️</span> {errorBusqueda}
        </div>
      )}

      {/* ── Preview + acciones ── */}
      {certData && (
        <PreviewCertificado
          cert={certData}
          account={account}
          onFirmar={handleFirmar}
          procesando={procesando}
        />
      )}

      {/* ── Error al firmar ── */}
      {txError && (
        <div className="alert alert-error" style={{ marginInline: 0, marginTop: "1rem" }}>
          <span>⚠️</span> {txError}
        </div>
      )}

      {/* ── Éxito de firma ── */}
      {txHash && (
        <>
          <div className="alert alert-success" style={{ marginInline: 0, marginTop: "1rem" }}>
            <div style={{ width: "100%" }}>
              <strong>✅ Firma registrada en blockchain</strong>
              <p style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
                Hash de transacción:{" "}
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

          {/* ── Botón descargar PDF con ambas firmas ── */}
          <div style={{
            marginTop:    "1rem",
            padding:      "0.9rem 1rem",
            background:   "var(--bg)",
            border:       "1px dashed var(--border)",
            borderRadius: "var(--radius)",
            textAlign:    "center",
          }}>
            <button
              className="btn-secondary"
              onClick={handleDescargarPDF}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              ⬇ Descargar PDF con ambas firmas
            </button>
          </div>
        </>
      )}
    </div>
  );
}
