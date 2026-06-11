import { useState, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: parsear mensajes de error del contrato
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae un mensaje legible de los distintos formatos de error que puede
 * lanzar ethers v6 al interactuar con un contrato Solidity.
 *
 * @param {unknown} err - El error capturado en el catch
 * @returns {string} Mensaje de error legible para el usuario
 */
function parsearError(err) {
  // Razón de revert estándar (require con mensaje)
  if (err.reason) return err.reason;

  // Error de revert personalizado de Solidity (custom errors)
  if (err.data?.message) return err.data.message;

  // Mensaje crudo de ethers que incluye el revert reason embebido
  if (err.message) {
    const match = err.message.match(/execution reverted: "?([^"(]+)"?/);
    if (match?.[1]) return match[1].trim();

    // Usuario rechazó la firma en MetaMask
    if (err.code === 4001 || err.message.includes("user rejected"))
      return "Transacción rechazada por el usuario";

    return err.message;
  }

  return "Error desconocido al interactuar con el contrato";
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expone todas las funciones del contrato AcademicCertification con manejo
 * centralizado de loading y errores.
 *
 * Cada función retorna { data, error }:
 *   - data  → resultado de la llamada (Transaction o datos de lectura)
 *   - error → string con el mensaje de error, o null si fue exitoso
 *
 * El estado `loading` y `error` del hook refleja la última operación.
 */
export function useContract() {
  const { contrato } = useWeb3();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  /**
   * Envuelve cualquier llamada al contrato con manejo de estado.
   * @param {() => Promise<any>} fn - Función async que hace la llamada real
   * @returns {Promise<{data: any, error: string|null}>}
   */
  const callContract = useCallback(async (fn) => {
    if (!contrato) {
      const msg = "El contrato no está inicializado. Conecta tu wallet.";
      setError(msg);
      return { data: null, error: msg };
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fn();
      setLoading(false);
      return { data, error: null };
    } catch (err) {
      const message = parsearError(err);
      setError(message);
      setLoading(false);
      return { data: null, error: message };
    }
  }, [contrato]);

  // ── Escritura (envían transacciones, modifican estado en blockchain) ────────

  /**
   * Emite un nuevo certificado académico.
   * @param {string} hashDocumento    - bytes32 hex del documento PDF
   * @param {string} codigo           - Código único del certificado
   * @param {string} nombre           - Nombre completo del estudiante
   * @param {string} estudianteWallet - Dirección Ethereum del estudiante
   */
  const emitirCertificado = useCallback(
    (hashDocumento, codigo, nombre, estudianteWallet) =>
      callContract(() =>
        contrato.emitirCertificado(hashDocumento, codigo, nombre, estudianteWallet)
      ),
    [callContract, contrato]
  );

  /**
   * Revoca un certificado existente con un motivo.
   * @param {string} hashDocumento - bytes32 del certificado
   * @param {string} motivo        - Descripción del motivo de revocación
   */
  const revocarCertificado = useCallback(
    (hashDocumento, motivo) =>
      callContract(() => contrato.revocarCertificado(hashDocumento, motivo)),
    [callContract, contrato]
  );

  /**
   * Permite al estudiante firmar la recepción de su certificado.
   * @param {string} hashDocumento - bytes32 del certificado a firmar
   */
  const firmarRecepcion = useCallback(
    (hashDocumento) =>
      callContract(() => contrato.firmarRecepcion(hashDocumento)),
    [callContract, contrato]
  );

  /**
   * Autoriza a una dirección como emisor (solo owner).
   * @param {string} direccion - Wallet address a autorizar
   */
  const autorizarEmisor = useCallback(
    (direccion) =>
      callContract(() => contrato.autorizarEmisor(direccion)),
    [callContract, contrato]
  );

  // ── Lectura (view functions, no gastan gas) ────────────────────────────────

  /**
   * Verifica un certificado por su hash y retorna todos sus campos.
   * El campo `exists` indica si el certificado está registrado.
   * @param {string} hashDocumento - bytes32 hex del documento
   * @returns {Promise<{data: CertificateData|null, error: string|null}>}
   */
  const verificarCertificado = useCallback(
    async (hashDocumento) => {
      return callContract(async () => {
        const raw = await contrato.verificarCertificado(hashDocumento);

        // Mapear la tupla de retorno a un objeto con nombres descriptivos
        // y convertir BigInt a Number para facilitar el uso en la UI
        return {
          codigoCertificado:    raw.codigoCertificado,
          nombreEstudiante:     raw.nombreEstudiante,
          estudianteWallet:     raw.estudianteWallet,
          emisor:               raw.emisor,
          fechaEmision:         Number(raw.fechaEmision),
          revocado:             raw.revocado,
          motivoRevocacion:     raw.motivoRevocacion,
          firmadoPorEstudiante: raw.firmadoPorEstudiante,
          fechaFirmaEstudiante: Number(raw.fechaFirmaEstudiante),
          exists:               raw.exists,
        };
      });
    },
    [callContract, contrato]
  );

  /**
   * Obtiene todos los hashes de certificados de un estudiante.
   * @param {string} estudianteWallet - Dirección Ethereum del estudiante
   * @returns {Promise<{data: string[], error: string|null}>}
   */
  const obtenerHistorial = useCallback(
    (estudianteWallet) =>
      callContract(() =>
        contrato.obtenerCertificadosDeEstudiante(estudianteWallet)
      ),
    [callContract, contrato]
  );

  return {
    loading,
    error,
    // Escritura
    emitirCertificado,
    revocarCertificado,
    firmarRecepcion,
    autorizarEmisor,
    // Lectura
    verificarCertificado,
    obtenerHistorial,
  };
}
