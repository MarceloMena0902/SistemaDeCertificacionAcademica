import { useState, useRef, useEffect } from "react";
import { ethers }                       from "ethers";
import SignaturePad                      from "signature_pad";
import { useContract }                  from "../../hooks/useContract";
import { useWeb3 }                      from "../../context/Web3Context";
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

// ─── Sub-componente: pad de firma auto-contenido ──────────────────────────────
// Todos los refs y el useEffect viven DENTRO del componente para que el pad
// solo se inicialice UNA VEZ al montar, sin re-ejecutarse por re-renders del padre.

function FirmaPad({ label, onFirma, error }) {
  const canvasRef = useRef(null);
  const padRef    = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ajustar resolución HiDPI UNA SOLA VEZ al montar
    const ratio  = window.devicePixelRatio || 1;
    const rect   = canvas.getBoundingClientRect();
    const width  = rect.width  || 500;   // fallback si aún no está pintado
    const height = rect.height || 150;

    canvas.width  = width  * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    // Inicializar SignaturePad DESPUÉS del resize
    padRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)",
      penColor:        "#1B4332",
      minWidth:        1.5,
      maxWidth:        3,
    });

    padRef.current.addEventListener("endStroke", () => {
      if (!padRef.current.isEmpty()) {
        onFirma(padRef.current.toDataURL("image/png"));
      }
    });

    return () => {
      padRef.current?.off();
    };
  }, []); // <- solo al montar; onFirma es setState (estable)

  const limpiar = () => {
    padRef.current?.clear();
    onFirma(null);
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={{
        display:      "block",
        fontSize:     "13px",
        fontWeight:   "500",
        color:        "var(--color-text-secondary)",
        marginBottom: "6px",
      }}>
        {label} *
      </label>
      <div style={{
        border:        "1.5px solid var(--color-border)",
        borderRadius:  "6px",
        background:    "#FFFFFF",
        position:      "relative",
        height:        "150px",
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width:        "100%",
            height:       "150px",
            cursor:       "crosshair",
            display:      "block",
            borderRadius: "6px",
          }}
        />
        <button
          type="button"
          onClick={limpiar}
          style={{
            position:     "absolute",
            top:          "8px",
            right:        "8px",
            background:   "transparent",
            border:       "1px solid var(--color-border)",
            borderRadius: "4px",
            padding:      "4px 10px",
            fontSize:     "12px",
            cursor:       "pointer",
            color:        "var(--color-text-secondary)",
            zIndex:       10,
          }}
        >
          Limpiar
        </button>
      </div>
      <p style={{
        fontSize:     "12px",
        color:        "var(--color-text-muted)",
        margin:       "4px 0 0 0",
      }}>
        Firme con el mouse o con el dedo en el área blanca
      </p>
      {error && (
        <span style={{ color: "var(--color-error)", fontSize: "12px" }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

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

  // ── Datos de firmas (base64 PNG capturado por FirmaPad) ────────────────────
  const [firmaRectorData,   setFirmaRectorData]   = useState(null);
  const [firmaDirectorData, setFirmaDirectorData] = useState(null);
  const [firmaPadKey,       setFirmaPadKey]       = useState(0);

  // ── Estado de resultado ────────────────────────────────────────────────────
  const [txHash,  setTxHash]  = useState("");
  const [txError, setTxError] = useState("");

  // ── Limpiar estado al cambiar de cuenta ────────────────────────────────────
  useEffect(() => {
    setArchivoPDF(null);
    setHashDocumento("");
    setCalculandoHash(false);
    setCodigo("");
    setNombre("");
    setCarrera("");
    setWallet("");
    setErrores({});
    setFirmaRectorData(null);
    setFirmaDirectorData(null);
    setTxHash("");
    setTxError("");
    setFirmaPadKey((k) => k + 1); // remonta los pads (los vacía)
  }, [account]);

  // ── Manejo del archivo PDF ─────────────────────────────────────────────────

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) { setArchivoPDF(null); setHashDocumento(""); return; }

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
    if (!archivoPDF)     e.pdf     = "Selecciona el archivo PDF del certificado.";
    if (!hashDocumento)  e.pdf     = e.pdf || "Espera a que se calcule el hash.";
    if (!codigo.trim())  e.codigo  = "El código del certificado es requerido.";
    if (!nombre.trim())  e.nombre  = "El nombre del estudiante es requerido.";
    if (!carrera.trim()) e.carrera = "La carrera es requerida.";
    if (!wallet.trim())  e.wallet  = "La wallet del estudiante es requerida.";
    else if (!ethers.isAddress(wallet.trim()))
                         e.wallet  = "Dirección Ethereum inválida.";

    if (!firmaRectorData)   e.firmaRector   = "La firma del Rector es obligatoria.";
    if (!firmaDirectorData) e.firmaDirector = "La firma del Director es obligatoria.";

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

    if (error) { setTxError(error); return; }

    // Guardar datos del certificado en localStorage para recuperarlos
    // al descargar el PDF desde FirmarRecepcion o VerificarCertificado
    const datosCertificadoEmitido = {
      codigoCertificado: codigo.trim(),
      nombreEstudiante:  nombre.trim(),
      carrera:           carrera.trim(),
      firmaRector:       firmaRectorData,
      firmaDirector:     firmaDirectorData,
      emisorTxHash:      data.hash,
      fechaEmision:      new Date().toLocaleDateString("es-ES", {
        year: "numeric", month: "long", day: "numeric",
      }),
      emisorWallet:      account,
      hashDocumento:     hashDocumento,
    };
    const certificadosGuardados = JSON.parse(
      localStorage.getItem("certchain_certificados") || "{}"
    );
    certificadosGuardados[hashDocumento] = datosCertificadoEmitido;
    localStorage.setItem(
      "certchain_certificados",
      JSON.stringify(certificadosGuardados)
    );

    setTxHash(data.hash);
  };

  // ── Descarga del PDF visual ────────────────────────────────────────────────

  const handleDescargarPDF = async () => {
    console.log("firmaRector:",   firmaRectorData   ? "OK" : "NULL");
    console.log("firmaDirector:", firmaDirectorData ? "OK" : "NULL");
    await descargarCertificado({
      nombreEstudiante:  nombre.trim(),
      codigoCertificado: codigo.trim(),
      carrera:           carrera.trim(),
      universidad:       "Universidad Boliviana",
      fechaEmision:      formatFecha(),
      hashDocumento,
      emisorWallet:      account,
      emisorTxHash:      txHash,
      estudianteTxHash:  undefined,
      fechaFirmaEstudiante: undefined,
      firmaRector:       firmaRectorData,
      firmaDirector:     firmaDirectorData,
    });
  };

  // ── Reiniciar ──────────────────────────────────────────────────────────────

  const handleNuevo = () => {
    setArchivoPDF(null); setHashDocumento(""); setCalculandoHash(false);
    setCodigo(""); setNombre(""); setCarrera(""); setWallet("");
    setErrores({}); setTxHash(""); setTxError("");
    setFirmaRectorData(null); setFirmaDirectorData(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const urlEtherscan = txHash ? etherscanTx(chainId, txHash) : null;

  // ══ Éxito ════════════════════════════════════════════════════════════════
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
          <div className="hash-display" title={hashDocumento}>{hashDocumento}</div>
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
            El PDF oficial incluye las firmas manuscritas del Rector y del Director.
            <br />
            <span style={{ fontSize: "0.78rem" }}>
              El estudiante debe recibir el PDF original para poder verificar y firmar su recepción.
            </span>
          </p>
          <button
            className="btn-primary"
            onClick={handleDescargarPDF}
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

  // ══ Formulario ══════════════════════════════════════════════════════════════
  return (
    <div className="form-card">
      <h3>Emitir Certificado Académico</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
        Sube el PDF del certificado, completa los datos y firma digitalmente.
        El hash SHA-256 del archivo quedará registrado en blockchain como prueba de autenticidad.
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
          <span className="form-hint" style={{ color: "var(--danger)" }}>{errores.pdf}</span>
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
          <span className="form-hint" style={{ color: "var(--danger)" }}>{errores.codigo}</span>
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
          <span className="form-hint" style={{ color: "var(--danger)" }}>{errores.nombre}</span>
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
          <span className="form-hint" style={{ color: "var(--danger)" }}>{errores.carrera}</span>
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
          <span className="form-hint" style={{ color: "var(--danger)" }}>{errores.wallet}</span>
        ) : (
          <span className="form-hint">
            Dirección Ethereum de la wallet del estudiante (formato 0x…).
          </span>
        )}
      </div>

      {/* ── Firmas institucionales ── */}
      <div style={{
        borderTop:    "1px solid var(--color-border)",
        marginTop:    "0.5rem",
        paddingTop:   "1.25rem",
        marginBottom: "0.5rem",
      }}>
        <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
          Firmas institucionales — dibuje cada firma con el mouse o con el dedo
        </p>

        <FirmaPad
          key={`rector-${firmaPadKey}`}
          label="Firma del Rector"
          onFirma={setFirmaRectorData}
          error={errores.firmaRector}
        />

        <FirmaPad
          key={`director-${firmaPadKey}`}
          label="Firma del Director del Programa"
          onFirma={setFirmaDirectorData}
          error={errores.firmaDirector}
        />
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
