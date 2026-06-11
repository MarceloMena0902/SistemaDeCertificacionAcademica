import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import contractData from "../contracts/AcademicCertification.json";

// ─────────────────────────────────────────────────────────────────────────────
// Contexto
// ─────────────────────────────────────────────────────────────────────────────

const Web3Context = createContext(null);

/** Estado inicial — se reutiliza en desconectarWallet para limpiar todo. */
const INITIAL_STATE = {
  provider:    null,
  signer:      null,
  account:     null,
  chainId:     null,
  contrato:    null,
  isConnected: false,
  isOwner:     false,
  isEmisor:    false,
  loading:     false,
  error:       null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function Web3Provider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  // ── Conectar wallet ────────────────────────────────────────────────────────
  const conectarWallet = useCallback(async () => {
    if (!window.ethereum) {
      setState((prev) => ({
        ...prev,
        error: "MetaMask no está instalado. Instálalo en metamask.io",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Solicitar acceso a las cuentas del usuario
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Crear provider (ethers v6: BrowserProvider reemplaza a Web3Provider)
      const provider = new ethers.BrowserProvider(window.ethereum);

      // El signer representa la cuenta activa que firmará transacciones
      const signer  = await provider.getSigner();
      const account = await signer.getAddress();

      // Obtener la red actual para detectar si es la red correcta
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Instanciar el contrato con el signer para poder enviar transacciones
      const contrato = new ethers.Contract(
        contractData.address,
        contractData.abi,
        signer
      );

      // Verificar rol: ¿es el dueño del contrato?
      const ownerAddress = await contrato.owner();

      // Guard: si owner() devuelve address(0), el contrato no existe en esta red.
      // ethers.js v6 decodifica bytes vacíos como ZeroAddress en lugar de lanzar
      // excepción, lo que causaría isOwner=false e isEmisor=false silenciosamente.
      if (ownerAddress === ethers.ZeroAddress) {
        throw new Error(
          `El contrato no está desplegado en la red actual (chainId: ${chainId}). ` +
          `Asegúrate de que MetaMask esté en "Localhost 8545" (chainId 31337) ` +
          `y de haber ejecutado: npx hardhat run scripts/deployLocal.js --network localhost`
        );
      }

      const isOwner = ownerAddress.toLowerCase() === account.toLowerCase();

      // Verificar rol: ¿está autorizado como emisor?
      const isEmisor = await contrato.emisoresAutorizados(account);

      setState({
        provider,
        signer,
        account,
        chainId,
        contrato,
        isConnected: true,
        isOwner,
        isEmisor,
        loading: false,
        error: null,
      });
    } catch (err) {
      // El usuario rechazó la conexión u ocurrió otro error
      const message =
        err.code === 4001
          ? "Conexión rechazada por el usuario"
          : (err.message ?? "Error al conectar la wallet");

      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  // ── Desconectar wallet ─────────────────────────────────────────────────────
  const desconectarWallet = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // ── Escuchar cambios de cuenta en MetaMask ─────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // El usuario desconectó todas las cuentas desde MetaMask
        desconectarWallet();
      } else {
        // Cambió de cuenta → reconectar con la nueva
        conectarWallet();
      }
    };

    const handleChainChanged = () => {
      // MetaMask recomienda recargar la página al cambiar de red
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged",    handleChainChanged);
    };
  }, [conectarWallet, desconectarWallet]);

  return (
    <Web3Context.Provider value={{ ...state, conectarWallet, desconectarWallet }}>
      {children}
    </Web3Context.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook de acceso
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook que expone el contexto Web3.
 * Debe usarse dentro de un componente envuelto por <Web3Provider>.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 debe usarse dentro de <Web3Provider>");
  }
  return context;
}
