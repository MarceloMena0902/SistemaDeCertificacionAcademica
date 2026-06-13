import { useState } from "react";
import { useContract }  from "../../hooks/useContract";
import { useWeb3 }      from "../../context/Web3Context";
import { calcularHashPDF, formatHashDisplay } from "../../utils/hashUtils";
import { descargarCertificado } from "../../utils/pdfGenerator";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const formatFecha = (ts) => {
  if (!ts) return "—";
  const ms = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
  return new Date(ms).toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });
};

const abreviarDir = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

// ─── Sub-componente: resultado de verificación ────────────────────────────────

function ResultadoVerificacion({ cert }) {
  if (!cert.exists) {
    return (
      <div className="cert-card" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <strong style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
          CERTIFICADO NO ENCONTRADO
        </strong>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Este certificado no está registrado en la blockchain. Verifica que el archivo
          PDF sea el original sin modificaciones.
        </p>
      </div>
    );
  }

  if (cert.revocado) {
    return (
      <div className="cert-card cert-revocado">
        <div className="cert-header">
          <span className="cert-title">CERTIFICADO REVOCADO</span>
          <span className="badge badge-danger">Revocado</span>
        </div>

        <div className="alert alert-error" style={{ marginInline: 0, marginTop: 0, marginBottom: "1rem" }}>
          <strong>Motivo:</strong> {cert.motivoRevocacion}
        </div>

        <CertFields cert={cert} />
      </div>
    );
  }

  return (
    <div className="cert-card cert-valido">
      <div className="cert-header">
        <span className="cert-title">CERTIFICADO VÁLIDO</span>
        <span className="badge badge-success">Válido</span>
      </div>

      <CertFields cert={cert} />
    </div>
  );
}

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
          value={`Firmado el ${formatFecha(cert.fechaFirmaEstudiante)}`}
          mono={false}
        />
      ) : (
        <div className="cert-field">
          <span className="cert-field-label">Firma del estudiante</span>
          <span className="badge badge-warning">Pendiente de firma del estudiante</span>
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

  // ── Estado de modo ─────────────────────────────────────────────────────────
  const [modo, setModo] = useState("pdf"); // "pdf" | "hash"

  // ── Modo PDF ───────────────────────────────────────────────────────────────
  const [hashCalculado,  setHashCalculado]  = useState("");
  const [calculandoHash, setCalculandoHash] = useState(false);

  // ── Modo Hash ──────────────────────────────────────────────────────────────
  const [hashManual, setHashManual] = useState("");

  // ── Estado compartido ──────────────────────────────────────────────────────
  const [hashUsado,     setHashUsado]     = useState("");
  const [resultado,     setResultado]     = useState(null);
  const [buscando,      setBuscando]      = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const [carrera,       setCarrera]       = useState("");
  const [descargando,   setDescargando]   = useState(false);

  // ── Cambio de modo ─────────────────────────────────────────────────────────
  const cambiarModo = (m) => {
    setModo(m);
    setResultado(null);
    setErrorBusqueda("");
    setHashUsado("");
    setHashCalculado("");
    setHashManual("");
    setCarrera("");
  };

  // ── Manejo del archivo PDF ─────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files[0];
    setHashCalculado("");
    setResultado(null);
    setErrorBusqueda("");
    setHashUsado("");

    if (!file) return;

    setCalculandoHash(true);
    try {
      const hash = await calcularHashPDF(file);
      setHashCalculado(hash);
    } catch {
      setErrorBusqueda("No se pudo calcular el hash del archivo PDF.");
    } finally {
      setCalculandoHash(false);
    }
  };

  // ── Verificar ──────────────────────────────────────────────────────────────
  const handleVerificar = async () => {
    const hash = modo === "pdf" ? hashCalculado : hashManual.trim();

    if (!hash) {
      setErrorBusqueda(
        modo === "pdf"
          ? "Selecciona un archivo PDF primero."
          : "Ingresa el hash del certificado."
      );
      return;
    }

    setResultado(null);
    setErrorBusqueda("");
    setCarrera("");
    setBuscando(true);
    setHashUsado(hash);

    const { data, error } = await verificarCertificado(hash);

    if (error) {
      setErrorBusqueda(error);
    } else {
      setResultado(data);
    }

    setBuscando(false);
  };

  // ── Descargar PDF visual ───────────────────────────────────────────────────
  const handleDescargarPDF = async () => {
    if (!resultado || !resultado.exists) return;
    setDescargando(true);

    let estudianteTxHash;
    if (resultado.firmadoPorEstudiante && contrato) {
      try {
        const eventos = await contrato.queryFilter(
          contrato.filters.CertificadoFirmado(hashUsado)
        );
        if (eventos.length > 0) estudianteTxHash = eventos[0].transactionHash;
      } catch {
        // Si falla el query del evento, se omite el TX hash del estudiante
      }
    }

    await descargarCertificado({
      nombreEstudiante:     resultado.nombreEstudiante,
      codigoCertificado:    resultado.codigoCertificado,
      carrera:              carrera.trim(),
      universidad:          "Universidad Boliviana",
      fechaEmision:         formatFecha(resultado.fechaEmision),
      hashDocumento:        hashUsado,
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
      <h3>Verificar Certificado</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
        Sube el PDF oficial del certificado para verificar su autenticidad, o ingresa
        el hash directamente si lo tienes disponible.
      </p>

      {/* ── Selector de modo ── */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { id: "pdf",  label: "Verificar por PDF"  },
          { id: "hash", label: "Verificar por Hash" },
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
              background:    modo === id ? "var(--color-active-bg)" : "var(--bg)",
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
              onChange={() => cambiarModo(id)}
              style={{ display: "none" }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* ══ MODO: Verificar por PDF ══ */}
      {modo === "pdf" && (
        <div className="form-group">
          <label htmlFor="pdf-verificar">Archivo PDF del certificado</label>
          <input
            id="pdf-verificar"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFile}
          />
          {calculandoHash && (
            <div className="loading-row" style={{ justifyContent: "flex-start", paddingLeft: 0 }}>
              <span className="spinner" /> Calculando hash SHA-256…
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

      {/* ══ MODO: Verificar por Hash ══ */}
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
            Pega el hash de 66 caracteres que empieza con 0x (visible en el PDF o en la tx de emisión).
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
          {errorBusqueda}
        </div>
      )}

      {/* ── Resultado ── */}
      {resultado && (
        <div style={{ marginTop: "1.25rem" }}>
          <ResultadoVerificacion cert={resultado} />
        </div>
      )}

      {/* ── Campo carrera para PDF (solo cuando existe el certificado) ── */}
      {resultado && resultado.exists && (
        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label htmlFor="carrera-verificar">
            Carrera / Programa académico
            <span style={{ color: "var(--color-text-muted)", fontWeight: 400, marginLeft: "0.4rem", fontSize: "0.82rem" }}>
              (para el PDF descargable)
            </span>
          </label>
          <input
            id="carrera-verificar"
            type="text"
            placeholder="Ej: Ingeniería de Sistemas Informáticos"
            value={carrera}
            onChange={(e) => setCarrera(e.target.value)}
          />
          <span className="form-hint">
            Este dato no se almacena en blockchain. Ingrésalo para que figure correctamente en el PDF.
          </span>
        </div>
      )}

      {/* ── Botón descargar PDF visual ── */}
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
              "Descargar PDF con ambas firmas"
            ) : (
              "Descargar PDF (firma pendiente)"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
