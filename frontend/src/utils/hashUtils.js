/**
 * hashUtils.js
 * Utilidades para calcular y formatear hashes SHA-256 de archivos.
 * Usa la Web Crypto API nativa del navegador (sin dependencias externas).
 */

/**
 * Calcula el hash SHA-256 de un archivo y lo retorna en formato bytes32
 * compatible con Solidity (string hex de 32 bytes con prefijo 0x).
 *
 * @param {File} file - Objeto File del input[type="file"] del navegador
 * @returns {Promise<string>} Hash SHA-256 en formato "0x<64 chars hex>"
 *
 * @example
 * const hash = await calcularHashPDF(event.target.files[0]);
 * // "0xa3f5c2...1b4e"  ← 66 chars total, listo para enviar al contrato
 */
export async function calcularHashPDF(file) {
  // Leer el contenido completo del archivo como ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Delegar el cálculo SHA-256 a la Web Crypto API del navegador
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", arrayBuffer);

  // Convertir el resultado (ArrayBuffer) a una cadena hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex   = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Prefijo 0x requerido por ethers.js para valores bytes32
  return "0x" + hashHex;
}

/**
 * Abrevia un hash largo para mostrarlo en la UI sin ocupar demasiado espacio.
 * Toma los primeros 10 caracteres (incluye "0x") y los últimos 8.
 *
 * @param {string} hash - Hash hexadecimal con prefijo "0x"
 * @returns {string} Formato "0x12345678...abcdef12"
 *
 * @example
 * formatHashDisplay("0xa3f5c2d1e8b047a91c3f...")
 * // "0xa3f5c2d1...1c3fabcd"
 */
export function formatHashDisplay(hash) {
  if (!hash || hash.length < 20) return hash ?? "";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

/**
 * Calcula el hash SHA-256 de un ArrayBuffer.
 * Útil para hashear el contenido binario de un archivo ya leído.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>} Hash SHA-256 en formato "0x<64 chars hex>"
 */
export async function calcularHashDeArrayBuffer(arrayBuffer) {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  const hashHex    = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hashHex;
}
