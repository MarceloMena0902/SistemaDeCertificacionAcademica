import { useState } from "react";
import { ethers }   from "ethers";
import { useContract }       from "../../hooks/useContract";
import { formatHashDisplay } from "../../utils/hashUtils";

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
    ? { clase: "badge-danger",  texto: "Revocado" }
    : !cert.firmadoPorEstudiante
      ? { clase: "badge-warning", texto: "Sin firma" }
      : { clase: "badge-success", texto: "Válido"   };

  const borderClass = cert.revocado
    ? "cert-revocado"
    : cert.firmadoPorEstudiante
      ? "cert-valido"
      : "";

  return (
    <div className={`cert-card ${borderClass}`} style={{ marginBottom: "0.9rem" }}>
      {/* Encabezado siempre visible */}
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
          <p style={{ fontSize: "0.83rem", color: "var(--color-text-muted)", margin: 0 }}>
            {cert.nombreEstudiante} — {formatFecha(cert.fechaEmision)}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span className={`badge ${estadoBadge.clase}`}>{estadoBadge.texto}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", minWidth: "48px", textAlign: "right" }}>
            {expandido ? "Ocultar" : "Ver más"}
          </span>
        </div>
      </div>

      {/* Detalle expandible */}
      {expandido && (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem", marginTop: "0.75rem" }}>
          <HistField label="Código"            value={cert.codigoCertificado} />
          <HistField label="Nombre"            value={cert.nombreEstudiante}  />
          <HistField
            label="Wallet estudiante"
            value={abreviarDir(cert.estudianteWallet)}
            mono title={cert.estudianteWallet}
          />
          <HistField
            label="Emisor"
            value={abreviarDir(cert.emisor)}
            mono title={cert.emisor}
          />
          <HistField label="Fecha de emisión" value={formatFecha(cert.fechaEmision)} />

          <div className="cert-field" style={{ alignItems: "flex-start" }}>
            <span className="cert-field-label">Hash del documento</span>
            <span className="hash-display" title={hash} style={{ fontSize: "0.78rem", flex: 1 }}>
              {formatHashDisplay(hash)}
            </span>
          </div>

          {cert.firmadoPorEstudiante ? (
            <HistField
              label="Firma del estudiante"
              value={`Firmado el ${formatFecha(cert.fechaFirmaEstudiante)}`}
            />
          ) : (
            <div className="cert-field">
              <span className="cert-field-label">Firma del estudiante</span>
              <span className="badge badge-warning">Pendiente de firma</span>
            </div>
          )}

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
  const [certificados,  setCertificados]  = useState(null);
  const [buscando,      setBuscando]      = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const [expandidos,    setExpandidos]    = useState(new Set());

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

    const { data: hashes, error: hashError } = await obtenerHistorial(wallet);
    if (hashError) { setErrorBusqueda(hashError); setBuscando(false); return; }

    if (!hashes || hashes.length === 0) {
      setCertificados([]);
      setBuscando(false);
      return;
    }

    const resultados = await Promise.all(
      hashes.map((hash) => verificarCertificado(hash))
    );

    const lista = resultados
      .map((res, i) => (res.data?.exists ? { hash: hashes[i], ...res.data } : null))
      .filter(Boolean)
      .sort((a, b) => b.fechaEmision - a.fechaEmision);

    setCertificados(lista);
    setBuscando(false);
  };

  return (
    <div className="form-card">
      <h3>Historial de Certificados</h3>

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
          style={{ padding: "10px 20px", flexShrink: 0, alignSelf: "flex-end" }}
        >
          {buscando ? (
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
              Consultando…
            </span>
          ) : (
            "Consultar"
          )}
        </button>
      </div>

      {errorBusqueda && (
        <div className="alert alert-error" style={{ marginInline: 0, marginTop: "0.75rem" }}>
          {errorBusqueda}
        </div>
      )}

      {certificados !== null && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "1rem", paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--color-border)",
          }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-primary)" }}>
              {certificados.length === 0
                ? "Sin certificados registrados"
                : `${certificados.length} certificado${certificados.length !== 1 ? "s" : ""} encontrado${certificados.length !== 1 ? "s" : ""}`}
            </span>
            {certificados.length > 0 && (
              <div style={{ display: "flex", gap: "0.45rem", fontSize: "0.8rem" }}>
                <span className="badge badge-success">Válido</span>
                <span className="badge badge-warning">Sin firma</span>
                <span className="badge badge-danger">Revocado</span>
              </div>
            )}
          </div>

          {certificados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--color-text-muted)" }}>
              <p style={{ fontSize: "0.9rem" }}>
                Este estudiante no tiene certificados registrados en la blockchain.
              </p>
            </div>
          ) : (
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
