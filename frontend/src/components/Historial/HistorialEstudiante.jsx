import { useState } from "react";
import { ethers }   from "ethers";
import { useContract }             from "../../hooks/useContract";
import { formatHashDisplay }       from "../../utils/hashUtils";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const formatFecha = (ts) =>
  ts
    ? new Date(Number(ts) * 1000).toLocaleDateString("es-ES", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

const abreviarDir = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

// ─── Sub-componente: card de un certificado ───────────────────────────────────

function CertCard({ hash, cert, expandido, onToggle }) {
  const estadoBadge = cert.revocado
    ? { clase: "badge-danger",  texto: "❌ Revocado" }
    : !cert.firmadoPorEstudiante
      ? { clase: "badge-warning", texto: "⏳ Sin firma" }
      : { clase: "badge-success", texto: "✅ Válido"   };

  return (
    <div
      className="cert-card"
      style={{
        borderColor: cert.revocado ? "#fca5a5" : cert.firmadoPorEstudiante ? "#86efac" : "#fcd34d",
        marginBottom: "0.9rem",
      }}
    >
      {/* ── Encabezado siempre visible ── */}
      <div
        className="cert-header"
        style={{ cursor: "pointer", userSelect: "none", marginBottom: expandido ? undefined : 0 }}
        onClick={onToggle}
        role="button"
        aria-expanded={expandido}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
      >
        <div>
          <p className="cert-title" style={{ marginBottom: "0.2rem" }}>
            {cert.codigoCertificado}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            {cert.nombreEstudiante} — {formatFecha(cert.fechaEmision)}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span className={`badge ${estadoBadge.clase}`}>{estadoBadge.texto}</span>
          <span
            style={{
              fontSize:   "0.75rem",
              color:      "var(--text-muted)",
              transition: "transform 0.2s",
              transform:  expandido ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* ── Detalle expandible ── */}
      {expandido && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.75rem" }}>

          <HistField label="Código"           value={cert.codigoCertificado} />
          <HistField label="Nombre"           value={cert.nombreEstudiante}  />
          <HistField label="Wallet estudiante"
            value={abreviarDir(cert.estudianteWallet)}
            mono title={cert.estudianteWallet}
          />
          <HistField label="Emisor"
            value={abreviarDir(cert.emisor)}
            mono title={cert.emisor}
          />
          <HistField label="Fecha de emisión" value={formatFecha(cert.fechaEmision)} />

          {/* Hash del documento */}
          <div className="cert-field" style={{ alignItems: "flex-start" }}>
            <span className="cert-field-label">Hash del documento</span>
            <span className="hash-display" title={hash} style={{ fontSize: "0.78rem", flex: 1 }}>
              {formatHashDisplay(hash)}
            </span>
          </div>

          {/* Firma */}
          {cert.firmadoPorEstudiante ? (
            <HistField
              label="Firma del estudiante"
              value={`✍️ Firmado el ${formatFecha(cert.fechaFirmaEstudiante)}`}
            />
          ) : (
            <div className="cert-field">
              <span className="cert-field-label">Firma del estudiante</span>
              <span className="badge badge-warning">⏳ Pendiente de firma</span>
            </div>
          )}

          {/* Revocación */}
          {cert.revocado && (
            <div className="alert alert-error" style={{ marginInline: 0, marginTop: "0.75rem", marginBottom: 0 }}>
              <strong>Motivo de revocación:</strong> {cert.motivoRevocacion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistField({ label, value, mono = false, title }) {
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

export default function HistorialEstudiante() {
  const { verificarCertificado, obtenerHistorial } = useContract();

  const [walletInput,   setWalletInput]   = useState("");
  const [certificados,  setCertificados]  = useState(null); // null = no consultado aún
  const [buscando,      setBuscando]      = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const [expandidos,    setExpandidos]    = useState(new Set());

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleExpandir = (hash) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.has(hash) ? next.delete(hash) : next.add(hash);
      return next;
    });
  };

  const handleConsultar = async () => {
    const wallet = walletInput.trim();
    if (!wallet) { setErrorBusqueda("Ingresa una dirección de wallet."); return; }
    if (!ethers.isAddress(wallet)) { setErrorBusqueda("Dirección Ethereum inválida."); return; }

    setErrorBusqueda("");
    setCertificados(null);
    setExpandidos(new Set());
    setBuscando(true);

    // 1. Obtener lista de hashes del estudiante
    const { data: hashes, error: hashError } = await obtenerHistorial(wallet);
    if (hashError) { setErrorBusqueda(hashError); setBuscando(false); return; }

    if (!hashes || hashes.length === 0) {
      setCertificados([]);
      setBuscando(false);
      return;
    }

    // 2. Obtener datos de cada certificado en paralelo
    const resultados = await Promise.all(
      hashes.map((hash) => verificarCertificado(hash))
    );

    // 3. Construir lista con hash adjunto, filtrar si hay error y ordenar
    const lista = resultados
      .map((res, i) => (res.data?.exists ? { hash: hashes[i], ...res.data } : null))
      .filter(Boolean)
      .sort((a, b) => b.fechaEmision - a.fechaEmision); // más reciente primero

    setCertificados(lista);
    setBuscando(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="form-card">
      <h3>📋 Historial de Certificados por Estudiante</h3>

      {/* ── Formulario de consulta ── */}
      <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-end", marginBottom: "0.5rem" }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="wallet-historial">Wallet del estudiante</label>
          <input
            id="wallet-historial"
            type="text"
            placeholder="0x..."
            value={walletInput}
            onChange={(e) => { setWalletInput(e.target.value); setErrorBusqueda(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleConsultar()}
          />
        </div>
        <button
          className="btn-primary"
          onClick={handleConsultar}
          disabled={buscando}
          style={{ padding: "0.55rem 1.25rem", flexShrink: 0, alignSelf: "flex-end" }}
        >
          {buscando ? (
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
              Consultando…
            </span>
          ) : (
            "Consultar historial"
          )}
        </button>
      </div>

      {/* ── Error ── */}
      {errorBusqueda && (
        <div className="alert alert-error" style={{ marginInline: 0, marginTop: "0.75rem" }}>
          <span>⚠️</span> {errorBusqueda}
        </div>
      )}

      {/* ── Resultados ── */}
      {certificados !== null && (
        <div style={{ marginTop: "1.5rem" }}>
          {/* Contador */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontWeight: 700, color: "var(--primary)" }}>
              {certificados.length === 0
                ? "Sin certificados"
                : `${certificados.length} certificado${certificados.length !== 1 ? "s" : ""} encontrado${certificados.length !== 1 ? "s" : ""}`}
            </span>
            {certificados.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem" }}>
                {/* Leyenda de estados */}
                <span className="badge badge-success">✅ Válido</span>
                <span className="badge badge-warning">⏳ Sin firma</span>
                <span className="badge badge-danger">❌ Revocado</span>
              </div>
            )}
          </div>

          {certificados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>📭</span>
              <p>Este estudiante no tiene certificados registrados en la blockchain.</p>
            </div>
          ) : (
            /* Lista de certificados */
            <div>
              {certificados.map((cert) => (
                <CertCard
                  key={cert.hash}
                  hash={cert.hash}
                  cert={cert}
                  expandido={expandidos.has(cert.hash)}
                  onToggle={() => toggleExpandir(cert.hash)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
