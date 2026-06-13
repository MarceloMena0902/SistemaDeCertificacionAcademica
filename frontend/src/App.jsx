import { useState } from "react";
import { Web3Provider, useWeb3 } from "./context/Web3Context";
import Navbar                    from "./components/Layout/Navbar";
import EmitirCertificado         from "./components/Emitir/EmitirCertificado";
import VerificarCertificado      from "./components/Verificar/VerificarCertificado";
import RevocarCertificado        from "./components/Revocar/RevocarCertificado";
import HistorialEstudiante       from "./components/Historial/HistorialEstudiante";
import FirmarRecepcion           from "./components/Firmar/FirmarRecepcion";
import "./App.css";

// ─── Definición de tabs ───────────────────────────────────────────────────────

const TABS = [
  { id: "verificar", label: "Verificar",  roleRequired: false },
  { id: "historial", label: "Historial",  roleRequired: false },
  { id: "firmar",    label: "Firmar",     roleRequired: false },
  { id: "emitir",    label: "Emitir",     roleRequired: true  },
  { id: "revocar",   label: "Revocar",    roleRequired: true  },
];

// ─── Contenido principal ──────────────────────────────────────────────────────

function AppContent() {
  const { isConnected, isOwner, isEmisor, error, conectarWallet } = useWeb3();
  const [tabActivo, setTabActivo] = useState("verificar");

  const tabsVisibles = TABS.filter(
    (tab) => !tab.roleRequired || isOwner || isEmisor
  );

  const tabFinal = tabsVisibles.some((t) => t.id === tabActivo)
    ? tabActivo
    : (tabsVisibles[0]?.id ?? "verificar");

  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {isConnected ? (
          <>
            <nav className="tab-bar" role="tablist">
              {tabsVisibles.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={tabFinal === tab.id}
                  className={`tab-btn ${tabFinal === tab.id ? "tab-btn--active" : ""}`}
                  onClick={() => setTabActivo(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <section className="tab-panel" role="tabpanel">
              {tabFinal === "verificar" && <VerificarCertificado />}
              {tabFinal === "historial" && <HistorialEstudiante />}
              {tabFinal === "firmar"    && <FirmarRecepcion />}
              {tabFinal === "emitir"    && <EmitirCertificado />}
              {tabFinal === "revocar"   && <RevocarCertificado />}
            </section>
          </>
        ) : (
          <div className="welcome">
            <div className="welcome-card">
              <span className="welcome-mark" aria-hidden="true" />
              <h2 className="welcome-title">CertChain</h2>
              <p className="welcome-subtitle">
                Sistema de certificación académica en Ethereum
              </p>

              <ul className="feature-list">
                <li>Emisión inmutable de certificados en blockchain</li>
                <li>Verificación descentralizada de autenticidad</li>
                <li>Firma digital de recepción por el estudiante</li>
                <li>Historial completo de certificados por wallet</li>
              </ul>

              <button className="btn-primary btn-lg" onClick={conectarWallet}>
                Conectar MetaMask
              </button>

              <p className="welcome-note">
                Requiere MetaMask instalado y conexión a la red configurada.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}
