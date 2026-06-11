import { useWeb3 } from "../../context/Web3Context";

// ─── Paleta de colores ────────────────────────────────────────────────────────
const COLOR = {
  primary:   "#1a3c6e",
  secondary: "#2a5298",
  white:     "#ffffff",
  green:     "#22c55e",
  blue:      "#3b82f6",
  purple:    "#8b5cf6",
  grayLight: "#f1f5f9",
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = {
  nav: {
    backgroundColor: COLOR.primary,
    color:           COLOR.white,
    padding:         "0 2rem",
    height:          "64px",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    boxShadow:       "0 2px 8px rgba(0,0,0,0.25)",
    position:        "sticky",
    top:             0,
    zIndex:          100,
  },
  brand: {
    fontSize:   "1.2rem",
    fontWeight: 700,
    letterSpacing: "0.02em",
    color:      COLOR.white,
    margin:     0,
    display:    "flex",
    alignItems: "center",
    gap:        "0.5rem",
  },
  brandIcon: {
    fontSize: "1.4rem",
  },
  right: {
    display:    "flex",
    alignItems: "center",
    gap:        "0.75rem",
  },
  badge: (color) => ({
    backgroundColor: color,
    color:           COLOR.white,
    fontSize:        "0.7rem",
    fontWeight:      600,
    padding:         "0.2rem 0.55rem",
    borderRadius:    "999px",
    letterSpacing:   "0.04em",
    textTransform:   "uppercase",
  }),
  address: {
    fontSize:        "0.85rem",
    color:           "#cbd5e1",
    fontFamily:      "monospace",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding:         "0.25rem 0.65rem",
    borderRadius:    "6px",
  },
  btnConnect: {
    backgroundColor: COLOR.white,
    color:           COLOR.primary,
    border:          "none",
    padding:         "0.45rem 1.1rem",
    borderRadius:    "6px",
    fontWeight:      700,
    fontSize:        "0.85rem",
    cursor:          "pointer",
    transition:      "opacity 0.15s",
  },
  btnDisconnect: {
    backgroundColor: "transparent",
    color:           "#94a3b8",
    border:          "1px solid #475569",
    padding:         "0.35rem 0.8rem",
    borderRadius:    "6px",
    fontSize:        "0.78rem",
    cursor:          "pointer",
    transition:      "border-color 0.15s, color 0.15s",
  },
};

// ─── Helpers de presentación ─────────────────────────────────────────────────

/** Abrevia una dirección Ethereum: 0x1234...abcd */
function abreviarDireccion(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const {
    isConnected,
    account,
    isOwner,
    isEmisor,
    loading,
    conectarWallet,
    desconectarWallet,
  } = useWeb3();

  return (
    <nav style={styles.nav}>
      {/* Marca */}
      <h1 style={styles.brand}>
        <span style={styles.brandIcon}>🎓</span>
        CertChain — Certificación Académica
      </h1>

      {/* Zona derecha */}
      <div style={styles.right}>
        {isConnected ? (
          <>
            {/* Dirección abreviada */}
            <span style={styles.address} title={account}>
              {abreviarDireccion(account)}
            </span>

            {/* Badge: siempre aparece si está conectado */}
            <span style={styles.badge(COLOR.green)}>Conectado</span>

            {/* Badge: rol Emisor */}
            {isEmisor && (
              <span style={styles.badge(COLOR.blue)}>Emisor</span>
            )}

            {/* Badge: rol Owner (se muestra junto al de Emisor si aplica) */}
            {isOwner && (
              <span style={styles.badge(COLOR.purple)}>Owner</span>
            )}

            {/* Botón desconectar */}
            <button
              style={styles.btnDisconnect}
              onClick={desconectarWallet}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#94a3b8";
                e.target.style.color       = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#475569";
                e.target.style.color       = "#94a3b8";
              }}
            >
              Desconectar
            </button>
          </>
        ) : (
          /* Botón conectar */
          <button
            style={{
              ...styles.btnConnect,
              opacity: loading ? 0.65 : 1,
              cursor:  loading ? "not-allowed" : "pointer",
            }}
            onClick={conectarWallet}
            disabled={loading}
          >
            {loading ? "Conectando…" : "Conectar MetaMask"}
          </button>
        )}
      </div>
    </nav>
  );
}
