# CertChain — Guía de Demo

Sistema descentralizado de certificación académica sobre Ethereum.
Esta guía cubre la configuración completa del entorno local y seis escenarios de demostración end-to-end.

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| Git | cualquiera | `git --version` |
| MetaMask | extensión en Chrome/Firefox | — |

> MetaMask: instalar desde [metamask.io](https://metamask.io) si no está disponible.

---

## Configuración inicial de MetaMask para red local

### Paso 1 — Agregar la red Hardhat Local

1. Abrir MetaMask → clic en el selector de red (arriba) → **Agregar red** → **Agregar red manualmente**
2. Completar los campos:

   | Campo | Valor |
   |---|---|
   | Nombre de la red | `Hardhat Local` |
   | URL de RPC nueva | `http://127.0.0.1:8545` |
   | ID de cadena | `31337` |
   | Símbolo de moneda | `ETH` |
   | URL del explorador de bloques | *(dejar vacío)* |

3. Guardar → MetaMask cambiará automáticamente a esa red.

### Paso 2 — Importar cuenta OWNER (signers[0])

Esta cuenta despliega el contrato y tiene permisos totales (owner + emisor).

1. MetaMask → ícono de cuenta (arriba derecha) → **Importar cuenta**
2. Tipo: **Clave privada**
3. Pegar la clave:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Dirección resultante: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

### Paso 3 — Importar cuenta EMISOR (signers[1])

Autorizada automáticamente por `deployLocal.js` como segundo emisor.

1. MetaMask → Importar cuenta → Clave privada:
   ```
   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```
2. Dirección resultante: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

### Paso 4 — Importar cuenta ESTUDIANTE (signers[2])

Recibe certificados y puede firmar su recepción.

1. MetaMask → Importar cuenta → Clave privada:
   ```
   0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   ```
2. Dirección resultante: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

> **Advertencia:** estas claves son públicamente conocidas y solo deben usarse
> en la red local de Hardhat. Nunca enviar ETH real a estas direcciones.

---

## Levantar el proyecto

Abrir tres terminales en la raíz del repositorio:

### Terminal 1 — Nodo blockchain local

```bash
cd blockchain
npx hardhat node
```

Salida esperada:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...
```

Mantener esta terminal abierta durante toda la demo.

### Terminal 2 — Despliegue del contrato

```bash
cd blockchain
npx hardhat run scripts/deployLocal.js --network localhost
```

Salida esperada:
```
Contrato desplegado en : 0x5FbDB2315678afecb367f032d93F642f64180aa3
✓ Emisor autorizado    : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
✓ Archivo guardado en  : .../frontend/src/contracts/AcademicCertification.json
```

> Re-ejecutar este comando si se reinicia el nodo (el estado de la blockchain se pierde).

### Terminal 3 — Frontend

```bash
cd frontend
npm run dev
```

Abrir en el navegador: **http://localhost:5173**

---

## Flujo de demo completo

### Escenario 1: Emitir un certificado

**Cuenta:** OWNER o EMISOR en MetaMask

1. Abrir http://localhost:5173 → clic **"Conectar MetaMask"** → aprobar en MetaMask.
   - Navbar muestra la dirección abreviada + badge verde **Conectado** + badge **Emisor** (y **Owner** si corresponde).

2. Preparar un archivo PDF de prueba:
   - Puede ser cualquier PDF existente, o crear uno con texto simple desde un procesador de textos.
   - Este archivo es el "documento original" cuyo hash SHA-256 quedará registrado en blockchain.

3. Ir al tab **📄 Emitir**.

4. Completar el formulario:
   | Campo | Valor de ejemplo |
   |---|---|
   | PDF | *(seleccionar el archivo preparado)* |
   | Código | `CERT-2026-001` |
   | Nombre | `Juan Pérez Mamani` |
   | Carrera | `Ingeniería de Sistemas Informáticos` |
   | Wallet estudiante | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |

5. El campo **Hash SHA-256** se calcula automáticamente al elegir el archivo — anotar o copiar este valor.

6. Clic **"Emitir Certificado"** → MetaMask abre el diálogo de confirmación → **Confirmar**.

7. **Resultado esperado:**
   - Alert verde: "✅ Certificado emitido exitosamente" con el hash de la transacción.
   - Botón "⬇️ Descargar PDF del Certificado" visible.

8. Hacer clic en el botón de descarga → se genera y descarga `certificado_CERT-2026-001.pdf`.
   - Guardar este PDF; se usará en los escenarios siguientes.

---

### Escenario 2: Verificar un certificado válido

**Cuenta:** cualquiera (la verificación es pública, no requiere rol)

1. Tab **🔍 Verificar**.

**Modo A — Por PDF:**

2. Seleccionar el modo **📄 Verificar por PDF**.
3. Subir el PDF **original** (el que se subió al emitir, no el descargado).
4. Clic **"Verificar"**.
5. **Resultado esperado:** card verde con:
   - ✅ **CERTIFICADO VÁLIDO**
   - Nombre: Juan Pérez Mamani
   - Código: CERT-2026-001
   - Badge amarillo "⏳ Pendiente de firma del estudiante"

**Modo B — Por Hash:**

6. Seleccionar el modo **🔑 Verificar por Hash**.
7. Pegar el hash de 66 caracteres copiado en el Escenario 1.
8. Clic **"Verificar"** → mismo resultado verde.

---

### Escenario 3: Consultar historial del estudiante

**Cuenta:** cualquiera

1. Tab **📋 Historial**.
2. Ingresar la wallet del estudiante:
   ```
   0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
   ```
3. Clic **"Consultar historial"**.
4. **Resultado esperado:**
   - "1 certificado encontrado"
   - Card con código `CERT-2026-001`, nombre, fecha y badge **⏳ Sin firma**.
5. Clic en la card para expandir → ver emisor, wallet, hash del documento.

**Variante — firma de recepción (cuenta ESTUDIANTE):**

6. Cambiar MetaMask a la cuenta del Estudiante (`signers[2]`) → clic **"Reconectar"** en la app.
   - Navbar muestra la dirección del estudiante sin badges de rol.
7. En el Historial se sigue viendo el certificado — el hook `useContract` expone `firmarRecepcion(hash)` que puede llamarse desde consola del navegador o extendiendo la UI (trabajo futuro para integrar en la card del historial).

---

### Escenario 4: Revocar un certificado

**Cuenta:** OWNER o EMISOR

1. Cambiar MetaMask de vuelta a EMISOR → reconectar.
2. Tab **🚫 Revocar**.
3. Seleccionar modo **📄 Por PDF** → subir el PDF original.
4. Clic **"Buscar certificado"** → aparece el preview con los datos del certificado.
5. Completar el campo:
   | Campo | Valor |
   |---|---|
   | Motivo | `Error en datos del estudiante - nombre incorrecto` |
6. Clic **"Revocar Certificado"** → el botón cambia a rojo **"⚠️ Confirmar Revocación"**.
7. Clic **"⚠️ Confirmar Revocación"** → MetaMask abre confirmación → **Confirmar**.
8. **Resultado esperado:**
   - Alert verde de éxito con tx hash.
   - El preview del certificado se actualiza mostrando el motivo de revocación.

---

### Escenario 5: Verificar un certificado revocado

**Cuenta:** cualquiera

1. Tab **🔍 Verificar** → subir el mismo PDF original.
2. Clic **"Verificar"**.
3. **Resultado esperado:** card roja con:
   - ❌ **CERTIFICADO REVOCADO**
   - Motivo: "Error en datos del estudiante - nombre incorrecto"
   - Todos los datos originales preservados (la revocación no borra el registro).

---

### Escenario 6: Intentar falsificación — prueba de integridad

Este escenario demuestra la propiedad más importante del sistema.

1. Abrir el PDF original con un editor de texto o PDF.
2. Realizar una modificación mínima: cambiar una letra, añadir un espacio, modificar un píxel.
3. Guardar como un archivo diferente (ej: `certificado_falso.pdf`).
4. Tab **🔍 Verificar** → subir `certificado_falso.pdf`.
5. Clic **"Verificar"**.
6. **Resultado esperado:** card gris con:
   - ⚠️ **CERTIFICADO NO ENCONTRADO**
   - "Este documento no está registrado en la blockchain."

**Explicación:** SHA-256 es una función de hash criptográfico. Cualquier cambio en el archivo,
por mínimo que sea, produce un hash completamente diferente (efecto avalancha).
El contrato busca exactamente el hash del archivo original; si no coincide, no existe.

---

## Arquitectura del sistema — referencia rápida

```
Navegador (React)
  │
  ├─ Web3Context      → gestión de conexión MetaMask / ethers.js
  ├─ useContract      → wrapper de llamadas al contrato (loading/error)
  ├─ hashUtils        → Web Crypto API SHA-256
  └─ pdfGenerator     → jsPDF generación de representación visual
        │
        │  ethers.js v6 (BrowserProvider)
        ▼
  MetaMask Extension
        │
        │  JSON-RPC http://127.0.0.1:8545
        ▼
  Hardhat Node (EVM local)
        │
        ▼
  AcademicCertification.sol
  ├─ mapping(bytes32 → Certificate)
  ├─ mapping(address → bytes32[])
  └─ mapping(address → bool) emisoresAutorizados
```

---

## Preguntas teóricas — respuestas orientativas

### 1. ¿Por qué se registra el hash del documento y no el documento completo?

Almacenar datos directamente en la blockchain es extremadamente costoso en gas,
ya que cada byte ocupa espacio permanente en todos los nodos de la red.
El hash SHA-256 (32 bytes fijos) actúa como "huella digital" del documento:
es computacionalmente imposible encontrar dos archivos con el mismo hash
(resistencia a colisiones), por lo que registrar el hash garantiza la misma
integridad que registrar el documento completo, a una fracción del costo.
El documento original puede almacenarse en sistemas externos (IPFS, servidor)
mientras la prueba de integridad permanece en la blockchain.

---

### 2. ¿Qué garantiza la inmutabilidad del certificado una vez emitido?

Una vez que la transacción `emitirCertificado` es minada y confirmada en la
blockchain, el estado del contrato queda grabado en todos los nodos de la red.
Modificar ese registro requeriría reescribir todos los bloques posteriores
y controlar más del 50% del poder de cómputo de la red (ataque del 51%),
lo que en Ethereum es económicamente inviable.
Adicionalmente, el contrato rechaza cualquier intento de emitir un certificado
con un hash ya registrado (`require(certificados[hash].fechaEmision == 0)`),
garantizando unicidad.

---

### 3. ¿Cuál es la diferencia entre una función `view` y una transacción en Solidity?

Una función `view` solo lee el estado de la blockchain sin modificarlo.
No requiere firma, no consume gas del usuario y se ejecuta localmente en el nodo.
Ejemplos: `verificarCertificado`, `obtenerCertificadosDeEstudiante`.

Una transacción modifica el estado (escribe en el storage del contrato),
debe ser firmada por una cuenta con clave privada, consume gas y es minada
en un bloque. Ejemplos: `emitirCertificado`, `revocarCertificado`.

El gas es el mecanismo económico que impide que actores malintencionados
ejecuten operaciones costosas de forma gratuita.

---

### 4. ¿Por qué se usa el patrón de roles (owner/emisor) en lugar de permitir que cualquiera emita?

Un sistema de certificación sin control de acceso permitiría que cualquier
dirección Ethereum emita certificados arbitrarios en nombre de la institución,
destruyendo la confianza en el sistema.
El patrón de roles establece una jerarquía: el owner (universidad) autoriza
a emisores (secretaría académica, decanos), quienes a su vez pueden emitir
certificados. Los modifiers `onlyOwner` y `onlyEmisor` verifican estos permisos
en el EVM antes de ejecutar la lógica del negocio, haciendo imposible saltarlos
sin la clave privada correspondiente.

---

### 5. ¿Qué ventajas aporta registrar los certificados en blockchain frente a una base de datos tradicional?

| Aspecto | Base de datos centralizada | Blockchain |
|---|---|---|
| **Confianza** | Requiere confiar en el administrador | Sin intermediario; el código es la ley |
| **Disponibilidad** | Depende del servidor | Descentralizado; sin punto único de fallo |
| **Verificación** | Solo el emisor puede confirmar | Cualquier persona puede verificar |
| **Modificación** | El admin puede alterar registros | Inmutable una vez confirmado |
| **Auditoría** | Logs internos, potencialmente manipulables | Historial público y transparente |
| **Costo operativo** | Bajo (servidor propio) | Gas por transacción (costo variable) |

La blockchain sacrifica eficiencia y costo por garantías de integridad,
transparencia y descentralización que una base de datos tradicional no puede
ofrecer sin depender de la honestidad de un tercero.

---

## Trabajo futuro / mejoras identificadas

- **Firma de recepción en UI:** integrar el botón `firmarRecepcion` directamente
  en la card de historial cuando la cuenta conectada coincide con `estudianteWallet`.
- **Autorizar/revocar emisores en UI:** panel de administración para la cuenta owner.
- **Almacenamiento del PDF en IPFS:** guardar el documento original en IPFS y
  registrar su CID junto al hash para recuperación futura.
- **Notificaciones on-chain:** escuchar eventos `CertificadoEmitido` con `provider.on`
  para actualizar la UI en tiempo real sin polling.
- **Code splitting:** cargar jsPDF con `import()` dinámico para reducir el bundle
  inicial de 476 kB.
- **Despliegue en Sepolia:** ver `SEPOLIA.md`.
