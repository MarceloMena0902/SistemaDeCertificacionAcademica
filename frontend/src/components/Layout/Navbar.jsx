import { useState, useEffect } from "react";
import { useWeb3 } from "../../context/Web3Context";

// ─── Hook de tema ─────────────────────────────────────────────────────────────

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("certchain-theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const el = document.documentElement;
    if (isDark) {
      el.setAttribute("data-theme", "dark");
      localStorage.setItem("certchain-theme", "dark");
    } else {
      el.removeAttribute("data-theme");
      localStorage.setItem("certchain-theme", "light");
    }
  }, [isDark]);

  return [isDark, setIsDark];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Muestra los últimos 6 caracteres de la dirección con prefijo ··· */
function abreviarDireccion(address) {
  if (!address) return "";
  return `···${address.slice(-6)}`;
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

  const [isDark, setIsDark] = useTheme();

  return (
    <nav className="navbar">
      {/* Marca */}
      <div className="navbar-brand">
        <span className="navbar-brand-name">CertChain</span>
        <span className="navbar-brand-sub">Certificación Académica</span>
      </div>

      {/* Zona derecha */}
      <div className="navbar-right">
        {isConnected ? (
          <>
            {/* Wallet */}
            <span className="navbar-address" title={account}>
              {abreviarDireccion(account)}
            </span>

            {/* Roles */}
            {isEmisor && (
              <span className="navbar-badge navbar-badge--emisor">Emisor</span>
            )}
            {isOwner && (
              <span className="navbar-badge navbar-badge--owner">Owner</span>
            )}

            <span className="navbar-sep" aria-hidden="true" />

            {/* Toggle tema */}
            <button
              className="navbar-btn"
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDark ? "Modo Claro" : "Modo Oscuro"}
            </button>

            {/* Desconectar */}
            <button className="navbar-btn" onClick={desconectarWallet}>
              Desconectar
            </button>
          </>
        ) : (
          <>
            {/* Toggle tema (incluso sin conectar) */}
            <button
              className="navbar-btn"
              onClick={() => setIsDark((d) => !d)}
            >
              {isDark ? "Modo Claro" : "Modo Oscuro"}
            </button>

            <button
              className="navbar-btn-connect"
              onClick={conectarWallet}
              disabled={loading}
            >
              {loading ? "Conectando…" : "Conectar MetaMask"}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
