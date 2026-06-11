/**
 * pdfGenerator.js
 * Genera un PDF de certificado académico profesional usando jsPDF.
 *
 * NOTA sobre hashes:
 * El hash registrado en blockchain es el SHA-256 del archivo ORIGINAL que el
 * emisor subió al sistema. El PDF que genera este módulo es una representación
 * visual de los datos del certificado; su hash SHA-256 será diferente al
 * registrado en cadena, lo cual es intencional por diseño.
 */

import { jsPDF } from "jspdf";

// ─── Constantes de layout ────────────────────────────────────────────────────

const A4_W   = 210;   // ancho A4 en mm
const A4_H   = 297;   // alto  A4 en mm
const CENTER = A4_W / 2;
const MARGIN = 15;

// Colores (RGB)
const CLR = {
  primary:     [26,  60,  110],   // #1a3c6e  azul universitario
  primaryDark: [18,  45,   84],   // #122d54
  white:       [255, 255, 255],
  black:       [15,  15,   15],
  gray:        [102, 102, 102],   // #666
  grayLight:   [160, 160, 160],   // labels tabla
  grayBg:      [245, 245, 245],   // #f5f5f5
  borderLine:  [218, 218, 218],
  accent:      [201, 162,  39],   // dorado decorativo
};

// ─── Helpers internos ────────────────────────────────────────────────────────

/** Abrevia una dirección Ethereum: 0x1234...abcd */
function _abrevDir(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

/** Abrevia un tx hash: 0x1234...abcd */
function _abrevHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 12)}...${hash.slice(-10)}`;
}

/** Aplica color de relleno desde array RGB */
function _fill(doc, rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

/** Aplica color de texto desde array RGB */
function _text(doc, rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

/** Aplica color de trazo desde array RGB */
function _draw(doc, rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

// ─── Función principal ───────────────────────────────────────────────────────

/**
 * Genera el PDF del certificado y retorna la instancia de jsPDF.
 *
 * @param {object} datos
 * @param {string} datos.nombreEstudiante
 * @param {string} datos.codigoCertificado
 * @param {string} datos.carrera
 * @param {string} [datos.universidad="Universidad Boliviana"]
 * @param {string} datos.fechaEmision  - fecha ya formateada (legible)
 * @param {string} datos.hashDocumento - bytes32 hex del documento original
 * @param {string} datos.emisorWallet  - dirección del emisor
 * @param {string} [datos.txHash]      - hash de la transacción (opcional)
 * @returns {jsPDF}
 */
export function generarCertificadoPDF(datos) {
  const {
    nombreEstudiante,
    codigoCertificado,
    carrera,
    universidad    = "Universidad Boliviana",
    fechaEmision,
    hashDocumento,
    emisorWallet,
    txHash,
  } = datos;

  const doc = new jsPDF({
    orientation: "portrait",
    unit:        "mm",
    format:      "a4",
  });

  // ── 1. HEADER — fondo azul ─────────────────────────────────────────────────

  const headerH = 40;
  _fill(doc, CLR.primary);
  doc.rect(0, 0, A4_W, headerH, "F");

  // Línea dorada decorativa en la parte inferior del header
  _fill(doc, CLR.accent);
  doc.rect(0, headerH - 1.5, A4_W, 1.5, "F");

  // Título principal
  _text(doc, CLR.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CERTIFICADO ACADÉMICO", CENTER, 21, { align: "center" });

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Verificado en Blockchain Ethereum", CENTER, 32, { align: "center" });

  // ── 2. MARCO DECORATIVO del cuerpo ────────────────────────────────────────

  _draw(doc, CLR.primary);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, headerH + 6, A4_W - 2 * MARGIN, 219, "S");

  // Esquinas decorativas (líneas doradas en las 4 esquinas del marco)
  const cx = MARGIN;
  const cy = headerH + 6;
  const cw = A4_W - 2 * MARGIN;
  const ch = 219;
  const cs = 6; // tamaño del adorno de esquina

  _draw(doc, CLR.accent);
  doc.setLineWidth(1);
  // Esquina superior izquierda
  doc.line(cx, cy, cx + cs, cy);
  doc.line(cx, cy, cx, cy + cs);
  // Esquina superior derecha
  doc.line(cx + cw - cs, cy, cx + cw, cy);
  doc.line(cx + cw, cy, cx + cw, cy + cs);
  // Esquina inferior izquierda
  doc.line(cx, cy + ch, cx + cs, cy + ch);
  doc.line(cx, cy + ch - cs, cx, cy + ch);
  // Esquina inferior derecha
  doc.line(cx + cw - cs, cy + ch, cx + cw, cy + ch);
  doc.line(cx + cw, cy + ch - cs, cx + cw, cy + ch);

  // ── 3. TEXTO INTRODUCTORIO ─────────────────────────────────────────────────

  _text(doc, CLR.gray);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.text(`La ${universidad} certifica que:`, CENTER, 60, { align: "center" });

  // ── 4. NOMBRE DEL ESTUDIANTE (elemento destacado) ─────────────────────────

  _text(doc, CLR.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(nombreEstudiante, CENTER, 78, { align: "center" });

  // Subrayado decorativo bajo el nombre
  _draw(doc, CLR.accent);
  doc.setLineWidth(0.8);
  const nameWidth = doc.getTextWidth(nombreEstudiante);
  const underlineX = CENTER - nameWidth / 2;
  doc.line(underlineX, 80.5, underlineX + nameWidth, 80.5);

  // ── 5. SEPARADOR Y TEXTO DE LOGRO ─────────────────────────────────────────

  _draw(doc, CLR.borderLine);
  doc.setLineWidth(0.25);
  doc.line(MARGIN + 20, 88, A4_W - MARGIN - 20, 88);

  _text(doc, CLR.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "ha completado satisfactoriamente los requisitos del programa:",
    CENTER, 97, { align: "center" }
  );

  // ── 6. NOMBRE DE LA CARRERA ────────────────────────────────────────────────

  _text(doc, CLR.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(carrera, CENTER, 110, { align: "center" });

  // ── 7. SEPARADOR INFERIOR ANTES DE LA TABLA ───────────────────────────────

  _draw(doc, CLR.borderLine);
  doc.setLineWidth(0.25);
  doc.line(MARGIN + 10, 120, A4_W - MARGIN - 10, 120);

  // ── 8. TABLA DE DATOS (dos columnas, sin bordes) ──────────────────────────

  // Posicionamiento: labels alineados a la derecha, valores a la izquierda
  const labelRightX = CENTER - 8;
  const valueLeftX  = CENTER + 8;
  const rowStep     = 9.5;   // separación vertical entre filas
  let   rowY        = 132;   // Y de la primera fila

  const filas = [
    ["Código del Certificado:", codigoCertificado || "—"],
    ["Fecha de Emisión:",       fechaEmision || "—"],
    ["Institución:",            universidad],
    ["Dirección del Emisor:",   _abrevDir(emisorWallet)],
  ];

  doc.setFontSize(9);

  filas.forEach(([label, value]) => {
    // Label en gris claro, alineado a la derecha
    _text(doc, CLR.grayLight);
    doc.setFont("helvetica", "normal");
    doc.text(label, labelRightX, rowY, { align: "right" });

    // Valor en negro, alineado a la izquierda
    _text(doc, CLR.black);
    doc.setFont("helvetica", "bold");
    doc.text(value, valueLeftX, rowY, { align: "left" });

    rowY += rowStep;
  });

  // ── 9. SELLO / ESPACIO PARA FIRMA ─────────────────────────────────────────

  const selloY = 180;

  // Línea de firma izquierda
  _draw(doc, CLR.primary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 15, selloY, MARGIN + 70, selloY);
  _text(doc, CLR.grayLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Autoridad Académica", MARGIN + 42, selloY + 5, { align: "center" });

  // Línea de firma derecha
  doc.line(A4_W - MARGIN - 70, selloY, A4_W - MARGIN - 15, selloY);
  doc.text("Registro y Certificación", A4_W - MARGIN - 42, selloY + 5, { align: "center" });

  // Texto de validez
  _text(doc, CLR.gray);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    "Este documento tiene validez jurídica respaldada por la tecnología blockchain.",
    CENTER, selloY + 14, { align: "center" }
  );

  // ── 10. FOOTER — fondo gris claro ─────────────────────────────────────────

  const footerY = A4_H - 30;

  _fill(doc, CLR.grayBg);
  doc.rect(0, footerY, A4_W, 30, "F");

  // Línea separadora en el tope del footer
  _draw(doc, CLR.borderLine);
  doc.setLineWidth(0.3);
  doc.line(0, footerY, A4_W, footerY);

  // Acento del footer — pequeña barra azul en el borde izquierdo
  _fill(doc, CLR.primary);
  doc.rect(0, footerY, 2, 30, "F");

  // Etiqueta del hash
  _text(doc, CLR.grayLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Hash SHA-256 del documento original:", MARGIN + 3, footerY + 7);

  // Valor del hash en monospace
  _text(doc, CLR.black);
  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  doc.text(hashDocumento || "—", MARGIN + 3, footerY + 13);

  // URL de verificación
  _text(doc, CLR.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "Verificación en línea: certchain.app",
    CENTER, footerY + 21, { align: "center" }
  );

  // TX hash (opcional)
  if (txHash) {
    _text(doc, CLR.grayLight);
    doc.setFont("courier", "normal");
    doc.setFontSize(6.5);
    doc.text(
      `TX Blockchain: ${_abrevHash(txHash)}`,
      CENTER, footerY + 27, { align: "center" }
    );
  }

  return doc;
}

// ─── Funciones secundarias ───────────────────────────────────────────────────

/**
 * Genera el PDF y lo descarga directamente en el navegador.
 *
 * @param {object} datos - Mismos parámetros que generarCertificadoPDF
 */
export function descargarCertificado(datos) {
  const doc = generarCertificadoPDF(datos);
  // Sanitizar el código para que sea un nombre de archivo válido
  const codigo = (datos.codigoCertificado || "certificado")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`certificado_${codigo}.pdf`);
}

/**
 * Genera el PDF y lo retorna como Blob.
 * Útil para procesar el archivo antes de descargarlo (previsualizar, etc.).
 *
 * @param {object} datos - Mismos parámetros que generarCertificadoPDF
 * @returns {Blob}
 */
export function obtenerBlobCertificado(datos) {
  const doc = generarCertificadoPDF(datos);
  return doc.output("blob");
}
