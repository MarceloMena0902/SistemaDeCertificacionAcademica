import { useState } from "react";
import { useContract }                        from "../../hooks/useContract";
import { useWeb3 }                            from "../../context/Web3Context";
import { calcularHashPDF, formatHashDisplay } from "../../utils/hashUtils";
import { descargarCertificado }               from "../../utils/pdfGenerator";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const formatFecha = (ts) =>
  ts
    ? new Date(Number(ts) * 1000).toLocaleDateString("es-ES", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

const abreviarDir = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

// ─── Sub-componente: resultado de verificación ────────────────────────────────

function ResultadoVerificacion({ cert }) {
  if (!cert.exists) {
    return (
      <div className="cert-card" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "1.4rem" }}>⚠️</span>
          <strong style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
            CERTIFICADO NO ENCONTRADO
          </strong>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Este documento no está registrado en la blockchain. Puede que el hash
          no corresponda a un certificado emitido, o que el archivo haya sido modificado.
        </p>
      </div>
    );
  }

  if (cert.revocado) {
    return (
      <div className="cert-card cert-revocado">
        <div className="cert-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.3rem" }}>❌</span>
            <span className="cert-title">CERTIFICADO REVOCADO</span>
          </div>
          <span className="badge badge-danger">Revocado</span>
        </div>

        <div className="alert alert-error" style={{ marginInline: 0, marginTop: 0, marginBottom: "1rem" }}>
          <strong>Motivo:</strong> {cert.motivoRevocacion}
        </div>

        <CertFields cert={cert} />
      </div>
    );
  }

  // Válido
  return (
    <div className="cert-card cert-valido">
      <div className="cert-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.3rem" }}>✅</span>
          <span className="cert-title">CERTIFICADO VÁLIDO</span>
        </div>
        <span className="badge badge-success">Válido</span>
      </div>

      <CertFields cert={cert} />
    </div>
  );
}

/** Tabla de campos compartida entre válido y revocado. */
function CertFields({ cert }) {
  return (
    <div>
      <CertField label="Nombre del estudiante" value={cert.nombreEstudiante}    mono={false} />
      <CertField label="Código"                value={cert.codigoCertificado}   mono={false} />
      <CertField label="Emisor"                value={abreviarDir(cert.emisor)} mono={true}  title={cert.emisor} />
      <CertField label="Wallet estudiante"     value={abreviarDir(cert.estudianteWallet)} mono={true} title={cert.estudianteWallet} />
      <CertField label="Fecha de emisión"      value={formatFecha(cert.fechaEmision)}     mono={false} />

      {cert.firmadoPorEstudiante ? (
        <CertField
          label="Firma del estudiante"
          value={`✍️ Firmado el ${formatFecha(cert.fechaFirmaEstudiante)}`}
          mono={false}
        />
      ) : (
        <div className="cert-field">
          <span className="cert-field-label">Firma del estudiante</span>
          <span>
            <span className="badge badge-warning">⏳ Pendiente de firma del estudiante</span>
          </span>
        </div>
      )}
    </div>
  );
}

function CertField({ label, value, mono = false, title }) {
  return (
    <div className="cert-field">
      <span className="cert-field-label">{label}</span>
      <span className={`cert-field-value${mono ? "" : " normal"}`} title={title}>
        {value}
      </span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VerificarCertificado() {
  const { verificarCertificado } = useContract();
  const { contrato }             = useWeb3();

  const [modo,           setModo]           = useState("pdf");
  const [hashCalculado,  setHashCalculado]  = useState("");
  const [calculandoHash, setCalculandoHash] = useState(false);
  const [hashManual,     setHashManual]     = useState("");
  const [resultado,      setResultado]      = useState(null);
  const [buscando,       setBuscando]       = useState(false);
  const [errorBusqueda,  setErrorBusqueda]  = useState("");
  const [descargando,    setDescargando]    = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) { setHashCalculado(""); return; }

    setHashCalculado("");
    setResultado(null);
    setErrorBusqueda("");
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

  const handleVerificar = async () => {
    const hash = modo === "pdf" ? hashCalculado : hashManual.trim();
    if (!hash) {
      setErrorBusqueda(
        modo === "pdf"
          ? "Primero selecciona un archivo PDF."
          : "Ingresa el hash del certificado."
      );
      return;
    }

    setResultado(null);
    setErrorBusqueda("");
    setBuscando(true);

    const { data, error } = await verificarCertificado(hash);

    if (error) {
      setErrorBusqueda(error);
    } else {
      setResultado(data);
    }
    setBuscando(false);
  };

  const handleDescargarPDF = async () => {
    if (!resultado || !resultado.exists) return;
    setDescargando(true);

    const hash = modo === "pdf" ? hashCalculado : hashManual.trim();

    let estudianteTxHash;
    if (resultado.firmadoPorEstudiante && contrato) {
      try {
        const eventos = await contrato.queryFilter(
          contrato.filters.CertificadoFirmado(hash)
        );
        if (eventos.length > 0) {
          estudianteTxHash = eventos[0].transactionHash;
        }
      } catch {
        // si falla el query del evento, se omite el TX hash del estudiante
      }
    }

    descargarCertificado({
      nombreEstudiante:     resultado.nombreEstudiante,
      codigoCertificado:    resultado.codigoCertificado,
      carrera:              "—",
      fechaEmision:         formatFecha(resultado.fechaEmision),
      hashDocumento:        hash,
      emisorWallet:         resultado.emisor,
      estudianteTxHash,
      fechaFirmaEstudiante: resultado.firmadoPorEstudiante
        ? formatFecha(resultado.fechaFirmaEstudiante)
        : undefined,
    });

    setDescargando(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="form-card">
      <h3>🔍 Verificar Certificado</h3>

      {/* ── Selector de modo ── */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { id: "pdf",  label: "📄 Verificar por PDF"  },
          { id: "hash", label: "🔑 Verificar por Hash" },
        ].map(({ id, label }) => (
          <label
            key={id}
            style={{
              display:       "flex",
              alignItems:    "center",
              gap:           "0.4rem",
              cursor:        "pointer",
              padding:       "0.45rem 0.9rem",
              borderRadius:  "var(--radius)",
              border:        `1.5px solid ${modo === id ? "var(--primary)" : "var(--border)"}`,
              background:    modo === id ? "#eff6ff" : "var(--bg)",
              color:         modo === id ? "var(--primary)" : "var(--text-muted)",
              fontWeight:    modo === id ? 700 : 400,
              fontSize:      "0.88rem",
              transition:    "all 0.15s",
            }}
          >
            <input
              type="radio"
              name="modo"
              value={id}
              checked={modo === id}
              onChange={() => {
                setModo(id);
                setResultado(null);
                setErrorBusqueda("");
              }}
              style={{ display: "none" }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* ── Modo PDF ── */}
      {modo === "pdf" && (
        <div className="form-group">
          <label htmlFor="pdf-verificar">Selecciona el archivo PDF original</label>
          <input
            id="pdf-verificar"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFile}
          />
          <span className="form-hint">
            Se calculará el hash del archivo y se buscará en la blockchain.
          </span>

          {calculandoHash && (
            <div className="loading-row" style={{ justifyContent: "flex-start", paddingLeft: 0 }}>
              <span className="spinner" />
              Calculando hash…
            </div>
          )}

          {hashCalculado && (
            <div style={{ marginTop: "0.6rem" }}>
              <span className="form-hint">
                Hash calculado:{" "}
                <strong style={{ fontFamily: "monospace" }}>
                  {formatHashDisplay(hashCalculado)}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Modo Hash manual ── */}
      {modo === "hash" && (
        <div className="form-group">
          <label htmlFor="hash-input">Hash SHA-256 del certificado (bytes32)</label>
          <input
            id="hash-input"
            type="text"
            placeholder="0x..."
            value={hashManual}
            onChange={(e) => { setHashManual(e.target.value); setResultado(null); }}
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
          />
          <span className="form-hint">
            Pega el hash de 66 caracteres que empieza con 0x.
          </span>
        </div>
      )}

      {/* ── Botón verificar ── */}
      <button
        className="btn-primary"
        onClick={handleVerificar}
        disabled={buscando || calculandoHash}
        style={{ width: "100%", marginTop: "0.25rem" }}
      >
        {buscando ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
            <span className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
            Consultando la blockchain…
          </span>
        ) : (
          "Verificar"
        )}
      </button>

      {/* ── Error ── */}
      {errorBusqueda && (
        <div className="alert alert-error" style={{ marginTop: "1rem", marginInline: 0 }}>
          <span>⚠️</span> {errorBusqueda}
        </div>
      )}

      {/* ── Resultado ── */}
      {resultado && <ResultadoVerificacion cert={resultado} />}

      {/* ── Botón descargar PDF (siempre visible cuando hay resultado válido) ── */}
      {resultado && resultado.exists && (
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
            disabled={descargando}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            {descargando ? (
              <>
                <span className="spinner" />
                Generando PDF…
              </>
            ) : resultado.firmadoPorEstudiante ? (
              "⬇ Descargar PDF con ambas firmas"
            ) : (
              "⬇ Descargar PDF (firma pendiente)"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
