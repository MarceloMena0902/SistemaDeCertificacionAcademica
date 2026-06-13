/**
 * pdfGenerator.js
 * Genera un PDF de certificado académico profesional usando jsPDF.
 *
 * NOTA sobre hashes:
 * El hash registrado en blockchain es el SHA-256 de los DATOS del certificado
 * (código, nombre, carrera, fecha, emisor). El PDF es la representación visual;
 * su hash de archivo puede diferir, lo cual es intencional por diseño.
 */

import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// ─── Constantes de layout ────────────────────────────────────────────────────

const A4_W   = 210;         // ancho A4 en mm
const A4_H   = 297;         // alto  A4 en mm
const CENTER = A4_W / 2;   // 105 mm
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
  logoGold:    [212, 175,  55],   // #D4AF37 - dorado del logo
  green:       [22,  163,  74],   // firma confirmada
  warning:     [180, 120,   0],   // firma pendiente
};

// ─── Helpers internos ────────────────────────────────────────────────────────

/** Aplica color de relleno desde array RGB */
function _fill(doc, rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
/** Aplica color de texto desde array RGB */
function _text(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
/** Aplica color de trazo desde array RGB */
function _draw(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

// ─── Función principal ───────────────────────────────────────────────────────

/**
 * Genera el PDF del certificado y retorna la instancia de jsPDF.
 *
 * @param {object} datos
 * @param {string} datos.nombreEstudiante
 * @param {string} datos.codigoCertificado
 * @param {string} datos.carrera
 * @param {string} [datos.universidad="Universidad Boliviana"]
 * @param {string} datos.fechaEmision        - fecha formateada (legible)
 * @param {string} datos.hashDocumento       - bytes32 hex del certificado
 * @param {string} datos.emisorWallet        - dirección del emisor
 * @param {string} [datos.txHash]            - hash de tx de emisión (legacy)
 * @param {string} [datos.emisorTxHash]      - hash de tx de emisión (preferido)
 * @param {string} [datos.estudianteTxHash]  - hash de tx del estudiante (opcional)
 * @param {string} [datos.fechaFirmaEstudiante] - fecha legible de firma del estudiante
 * @returns {Promise<jsPDF>}
 */
export async function generarCertificadoPDF(datos) {
  const {
    nombreEstudiante,
    codigoCertificado,
    carrera,
    universidad          = "Universidad Boliviana",
    fechaEmision,
    hashDocumento,
    emisorWallet,
    txHash,
    emisorTxHash,
    estudianteTxHash,
    fechaFirmaEstudiante,
  } = datos;

  const _emisorTxHash = emisorTxHash || txHash || null;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER — fondo azul (h=42 mm para acomodar logo más grande)
  // ══════════════════════════════════════════════════════════════════════════

  const headerH = 42;
  _fill(doc, CLR.primary);
  doc.rect(0, 0, A4_W, headerH, "F");

  // Línea dorada decorativa inferior
  _fill(doc, CLR.accent);
  doc.rect(0, headerH - 1.5, A4_W, 1.5, "F");

  // ── LOGO UNIVERSITARIO MEJORADO ─────────────────────────────────────────
  //   Bounding box: x=14..42, y=6..34  →  centro (28, 20)

  const logoX = 28;
  const logoY = 20;

  doc.setLineWidth(0);

  // Capa 1 — disco dorado exterior (r=14)
  _fill(doc, CLR.logoGold);
  _draw(doc, CLR.logoGold);
  doc.circle(logoX, logoY, 14, "F");

  // Capa 2 — disco azul (r=11), deja anillo dorado visible
  _fill(doc, CLR.primary);
  _draw(doc, CLR.primary);
  doc.circle(logoX, logoY, 11, "F");

  // Capa 3 — disco blanco interior (r=8), como sello
  _fill(doc, CLR.white);
  _draw(doc, CLR.white);
  doc.circle(logoX, logoY, 8, "F");

  // Texto "UB" en azul bold 9pt — centrado en el disco blanco
  _text(doc, CLR.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("UB", logoX, logoY + 1.5, { align: "center" });

  // "UNIVERSIDAD BOLIVIANA" — en anillo azul superior (4pt blanco)
  _text(doc, CLR.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.5);
  doc.text("UNIVERSIDAD BOLIVIANA", logoX, logoY - 9, { align: "center" });

  // "Est. 1832" — en anillo dorado inferior (4pt azul)
  _text(doc, CLR.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.5);
  doc.text("Est. 1832", logoX, logoY + 13, { align: "center" });

  // Estrellas decorativas — puntos dorados a los lados del logo
  _fill(doc, CLR.logoGold);
  _draw(doc, CLR.logoGold);
  // Puntos grandes laterales
  doc.circle(logoX - 15.5, logoY, 1,   "F");
  doc.circle(logoX + 15.5, logoY, 1,   "F");
  // Puntos pequeños en diagonal
  doc.circle(logoX - 13,   logoY - 7.5, 0.6, "F");
  doc.circle(logoX + 13,   logoY - 7.5, 0.6, "F");
  doc.circle(logoX - 13,   logoY + 7.5, 0.6, "F");
  doc.circle(logoX + 13,   logoY + 7.5, 0.6, "F");

  // ── TÍTULO Y SUBTÍTULO — centrado en el espacio disponible (x=42..195) ──
  const titleX = (logoX + 14 + (A4_W - MARGIN)) / 2; // ≈ 118.5 mm

  _text(doc, CLR.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CERTIFICADO ACADÉMICO", titleX, 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Verificado en Blockchain Ethereum", titleX, 31, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. MARCO DECORATIVO DEL CUERPO
  //    Empieza en y=48, altura 219 → termina en y=267 (inicio del footer)
  // ══════════════════════════════════════════════════════════════════════════

  _draw(doc, CLR.primary);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, headerH + 6, A4_W - 2 * MARGIN, 219, "S");

  const cx = MARGIN;
  const cy = headerH + 6; // 48
  const cw = A4_W - 2 * MARGIN; // 180
  const ch = 219;
  const cs = 6;

  _draw(doc, CLR.accent);
  doc.setLineWidth(1);
  doc.line(cx,          cy,      cx + cs,      cy     );  // esquina sup-izq H
  doc.line(cx,          cy,      cx,           cy + cs);  // esquina sup-izq V
  doc.line(cx + cw - cs,cy,      cx + cw,      cy     );  // esquina sup-der H
  doc.line(cx + cw,     cy,      cx + cw,      cy + cs);  // esquina sup-der V
  doc.line(cx,          cy + ch, cx + cs,      cy + ch);  // esquina inf-izq H
  doc.line(cx,          cy + ch - cs, cx,      cy + ch);  // esquina inf-izq V
  doc.line(cx + cw - cs,cy + ch, cx + cw,      cy + ch);  // esquina inf-der H
  doc.line(cx + cw,     cy + ch - cs, cx + cw, cy + ch);  // esquina inf-der V

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TEXTO INTRODUCTORIO
  // ══════════════════════════════════════════════════════════════════════════

  _text(doc, CLR.gray);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.text(`La ${universidad} certifica que:`, CENTER, 60, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. NOMBRE DEL ESTUDIANTE
  // ══════════════════════════════════════════════════════════════════════════

  _text(doc, CLR.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(nombreEstudiante, CENTER, 78, { align: "center" });

  _draw(doc, CLR.accent);
  doc.setLineWidth(0.8);
  const nameWidth  = doc.getTextWidth(nombreEstudiante);
  const underlineX = CENTER - nameWidth / 2;
  doc.line(underlineX, 80.5, underlineX + nameWidth, 80.5);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. SEPARADOR Y TEXTO DE LOGRO
  // ══════════════════════════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════════════════════════
  // 6. NOMBRE DE LA CARRERA
  // ══════════════════════════════════════════════════════════════════════════

  _text(doc, CLR.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const carreraWidth    = doc.getTextWidth(carrera || "");
  const maxCarreraWidth = A4_W - 2 * MARGIN - 20;
  doc.setFontSize(carreraWidth > maxCarreraWidth ? 13 : 16);
  doc.text(carrera || "—", CENTER, 110, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. SEPARADOR ANTES DE TABLA + QR
  // ══════════════════════════════════════════════════════════════════════════

  _draw(doc, CLR.borderLine);
  doc.setLineWidth(0.25);
  doc.line(MARGIN + 10, 120, A4_W - MARGIN - 10, 120);

  // ══════════════════════════════════════════════════════════════════════════
  // 8. TABLA DE DATOS (izquierda) + QR (derecha) — lado a lado
  //    Tabla: labels right-aligned a x=97, valores a x=99
  //    QR:    x=152, y=131, w=38, h=38
  // ══════════════════════════════════════════════════════════════════════════

  // ── QR: construir texto codificado ──────────────────────────────────────
  let qrText =
    `CERTCHAIN - VERIFICACION DE FIRMAS\n` +
    `Certificado: ${codigoCertificado}\n\n` +
    `Estudiante: ${nombreEstudiante}\n\n` +
    `Institucion: Universidad Boliviana\n\n` +
    `Fecha Emision: ${fechaEmision}\n` +
    `FIRMA DE EMISION\n\n` +
    `Emisor: ${emisorWallet}\n\n` +
    `TX: ${_emisorTxHash || "—"}\n\n` +
    `Estado: VALIDA\n` +
    `FIRMA DE RECEPCION\n\n`;

  if (estudianteTxHash) {
    qrText +=
      `TX: ${estudianteTxHash}\n\n` +
      `Fecha: ${fechaFirmaEstudiante || "—"}\n\n` +
      `Estado: VALIDA\n`;
  } else {
    qrText += `Estado: PENDIENTE - El estudiante aun no ha firmado\n`;
  }
  qrText +=
    `Hash SHA-256 del documento:\n\n` +
    `${hashDocumento}\n` +
    `Verificado en Blockchain Ethereum (Hardhat Local / Sepolia)`;

  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width:  200,
    margin: 1,
    color:  { dark: "#1a3c6e", light: "#FFFFFF" },
  });

  // ── QR: leyenda encima ────────────────────────────────────────────────
  const qrX = 152;
  const qrY = 131;
  const qrW = 38;
  const qrH = 38;
  const qrCX = qrX + qrW / 2; // 171

  _text(doc, CLR.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Escanea para",          qrCX, 124, { align: "center" });
  doc.text("verificar autenticidad", qrCX, 129, { align: "center" });

  // ── QR: imagen ────────────────────────────────────────────────────────
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrW, qrH);

  // ── Tabla de datos ────────────────────────────────────────────────────
  const labelRightX = 97;   // labels right-aligned aquí
  const valueLeftX  = 99;   // valores empiezan aquí
  const rowStep     = 9.5;
  let   rowY        = 126;  // primera fila

  const filas = [
    ["Institución:",            universidad],
    ["Código del Certificado:", codigoCertificado || "—"],
    ["Fecha de Emisión:",       fechaEmision || "—"],
    ["Lugar de Emisión:",       "Cochabamba - Bolivia"],
  ];

  doc.setFontSize(9);

  filas.forEach(([label, value]) => {
    _text(doc, CLR.grayLight);
    doc.setFont("helvetica", "normal");
    doc.text(label, labelRightX, rowY, { align: "right" });

    _text(doc, CLR.black);
    doc.setFont("helvetica", "bold");
    doc.text(value, valueLeftX, rowY, { align: "left" });

    rowY += rowStep;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 9. SECCIÓN DE FIRMAS FÍSICAS  (y ≈ 175..205)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Sello decorativo central ──────────────────────────────────────────
  _draw(doc, CLR.logoGold);
  doc.setLineWidth(0.6);
  doc.circle(CENTER, 183, 8, "S");          // solo borde dorado, sin relleno

  _text(doc, CLR.logoGold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("OFICIAL", CENTER, 184.8, { align: "center" });

  // ── Líneas de firma ───────────────────────────────────────────────────
  _draw(doc, CLR.primary);
  doc.setLineWidth(0.4);
  doc.line(30,  192, 90,  192);   // bloque izquierdo (Rector)
  doc.line(120, 192, 180, 192);   // bloque derecho (Director)

  // Bloque izquierdo
  _text(doc, CLR.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Rector", 60, 197, { align: "center" });

  _text(doc, CLR.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Universidad Boliviana", 60, 202, { align: "center" });

  // Bloque derecho
  _text(doc, CLR.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Director del Programa", 150, 197, { align: "center" });

  _text(doc, CLR.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const carreraCorta = (carrera || "").length > 30
    ? (carrera || "").slice(0, 28) + "…"
    : (carrera || "");
  doc.text(carreraCorta, 150, 202, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // 10. FOOTER — fondo gris claro
  // ══════════════════════════════════════════════════════════════════════════

  const footerY = A4_H - 30; // 267

  _fill(doc, CLR.grayBg);
  doc.rect(0, footerY, A4_W, 30, "F");

  _draw(doc, CLR.borderLine);
  doc.setLineWidth(0.3);
  doc.line(0, footerY, A4_W, footerY);

  _fill(doc, CLR.primary);
  doc.rect(0, footerY, 2, 30, "F");

  _text(doc, CLR.grayLight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Hash SHA-256 del certificado:", MARGIN + 3, footerY + 7);

  _text(doc, CLR.black);
  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  doc.text(hashDocumento || "—", MARGIN + 3, footerY + 13);

  _text(doc, CLR.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "Verificación en línea: certchain.app",
    CENTER, footerY + 21, { align: "center" }
  );

  return doc;
}

// ─── Funciones secundarias ───────────────────────────────────────────────────

/**
 * Genera el PDF y lo descarga directamente en el navegador.
 * @param {object} datos - Mismos parámetros que generarCertificadoPDF
 * @returns {Promise<void>}
 */
export async function descargarCertificado(datos) {
  const doc   = await generarCertificadoPDF(datos);
  const codigo = (datos.codigoCertificado || "certificado")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`certificado_${codigo}.pdf`);
}

/**
 * Genera el PDF y lo retorna como Blob.
 * @param {object} datos - Mismos parámetros que generarCertificadoPDF
 * @returns {Promise<Blob>}
 */
export async function obtenerBlobCertificado(datos) {
  const doc = await generarCertificadoPDF(datos);
  return doc.output("blob");
}
