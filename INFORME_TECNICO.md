# Sistema de Certificación Académica Blockchain
## Informe Técnico — Práctica 6
### Sistemas Distribuidos — 7mo Semestre

**Autor:** MarceloMena0902  
**Fecha:** Junio 2026  
**Repositorio:** `SistemaDeCertificacionAcademica/`  
**Red de pruebas:** Hardhat local (Chain ID 31337) / Sepolia Testnet (Chain ID 11155111)

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Objetivos Cumplidos](#2-objetivos-cumplidos)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Smart Contract — AcademicCertification.sol](#4-smart-contract--academiccertificationsol)
5. [Extensión NFT — CertificadoNFT.sol (ERC-721)](#5-extensión-nft--certificadonftsolserc-721)
6. [Frontend — DApp React](#6-frontend--dapp-react)
7. [Flujo Completo del Sistema — 6 Escenarios](#7-flujo-completo-del-sistema--6-escenarios)
8. [Resultados de Pruebas](#8-resultados-de-pruebas)
9. [Relación con Conceptos de Sistemas Distribuidos](#9-relación-con-conceptos-de-sistemas-distribuidos)
10. [Respuestas a Preguntas Teóricas](#10-respuestas-a-preguntas-teóricas)
11. [Limitaciones y Trabajo Futuro](#11-limitaciones-y-trabajo-futuro)
12. [Conclusiones](#12-conclusiones)
- [Anexo A: Estructura del Proyecto](#anexo-a-estructura-del-proyecto)
- [Anexo B: Comandos de Referencia Rápida](#anexo-b-comandos-de-referencia-rápida)
- [Anexo C: Tabla de Contratos Desplegados](#anexo-c-tabla-de-contratos-desplegados)

---

## 1. Introducción

### 1.1 Contexto del Problema

Bolivia enfrenta un problema crónico y documentado de falsificación de títulos y certificados académicos. Según reportes del Ministerio de Educación, universidades privadas no acreditadas y redes de tráfico de diplomas han generado miles de profesionales con credenciales fraudulentas en circulación. Este fenómeno impacta directamente en la calidad del mercado laboral, la confianza institucional y la seguridad pública, cuando los títulos falsos corresponden a áreas como medicina, ingeniería o derecho.

El problema central es de naturaleza **sistémica y de confianza distribuida**: los empleadores, instituciones públicas y entidades extranjeras no disponen de un mecanismo confiable, rápido y accesible para verificar la autenticidad de un documento académico sin depender de la disponibilidad, honestidad o capacidad operativa de la institución emisora. Los sistemas de verificación actuales —llamadas telefónicas, correos institucionales, visitas presenciales— son lentos, costosos y susceptibles de corrupción o error humano.

Las soluciones centralizadas (bases de datos nacionales, portales web universitarios) padecen limitaciones estructurales propias de los sistemas distribuidos clásicos: punto único de fallo, dependencia de una autoridad central que puede ser comprometida, falta de transparencia sobre quién y cuándo accedió o modificó los registros, y ausencia de garantías de inmutabilidad. Una base de datos relacional puede ser alterada por un administrador con suficiente acceso, sin dejar rastro auditable.

### 1.2 Justificación de la Solución Blockchain

La tecnología blockchain resuelve el problema en su núcleo al eliminar la necesidad de confiar en una autoridad central. Sus propiedades fundamentales son exactamente las que el caso de uso requiere:

- **Inmutabilidad**: Una vez que un certificado es registrado en la cadena, ningún actor —ni siquiera la institución emisora— puede modificar o eliminar ese registro retroactivamente sin invalidar toda la cadena subsecuente. Esto hace computacionalmente inviable la alteración de datos históricos.

- **Transparencia auditable**: Todos los registros son públicamente verificables por cualquier parte, sin necesidad de permisos ni intermediarios. Un empleador en España puede verificar el título de un egresado boliviano en segundos, accediendo directamente al contrato.

- **Descentralización**: El registro no reside en un único servidor que pueda fallar, ser hackeado o apagado. Los datos están replicados en miles de nodos de la red Ethereum distribuidos globalmente.

- **Identificación por hash criptográfico**: El vínculo entre el documento físico y el registro blockchain se establece mediante el hash SHA-256 del archivo PDF. Esta función de resumen criptográfico tiene la propiedad del "efecto avalancha": cualquier modificación mínima al documento produce un hash completamente diferente, haciendo imposible presentar un documento alterado como el original.

- **No repudio**: Las transacciones están firmadas criptográficamente con la clave privada del emisor. Es matemáticamente imposible negar haber emitido un certificado una vez que la transacción fue incluida en un bloque.

### 1.3 Alcance del Sistema Implementado

El sistema CertChain implementa un ciclo de vida completo de certificados académicos sobre la red Ethereum, abarcando:

1. **Gestión de roles**: Un owner (la institución académica) autoriza/revoca emisores (secretarías, facultades).
2. **Emisión de certificados**: Registro inmutable del hash SHA-256 del documento en blockchain, con metadatos: nombre del estudiante, código del certificado, wallet del destinatario, fecha y emisor.
3. **Firma digital de recepción**: El estudiante puede confirmar on-chain que recibió su certificado, añadiendo una segunda firma criptográfica al registro.
4. **Revocación con auditoría**: Anulación de certificados con motivo documentado, preservando el historial completo.
5. **Verificación pública**: Cualquier tercero puede verificar la autenticidad de un certificado presentando el archivo PDF original o su hash.
6. **Historial por estudiante**: Consulta de todos los certificados asociados a una wallet.
7. **Extensión NFT (ERC-721)**: Representación de cada certificado como un token no fungible transferible, con metadata en IPFS.
8. **Interfaz web descentralizada**: DApp React que interactúa con MetaMask y los contratos sin backend propio.

---

## 2. Objetivos Cumplidos

| # | Objetivo de la Práctica | Implementación | Archivo(s) |
|---|------------------------|---------------|-----------|
| 1 | Implementar un sistema distribuido con múltiples nodos | 4 nodos: universidad, blockchain, estudiante, verificador; interacción mediante contratos Ethereum | `AcademicCertification.sol`, `Web3Context.jsx` |
| 2 | Garantizar inmutabilidad de los registros | Datos almacenados en storage de contrato Ethereum; revocación por flag (nunca eliminación) | `AcademicCertification.sol:168-182` |
| 3 | Implementar identificación criptográfica de documentos | Hash SHA-256 via Web Crypto API; usado como clave primaria del mapping de certificados | `hashUtils.js:18-33`, `AcademicCertification.sol:24` |
| 4 | Control de acceso basado en roles | Modifier `onlyOwner` y `onlyEmisor`; mapping `emisoresAutorizados` | `AcademicCertification.sol:84-96` |
| 5 | Trazabilidad completa con eventos | 5 eventos: `CertificadoEmitido`, `CertificadoRevocado`, `CertificadoFirmado`, `EmisorAutorizado`, `EmisorRevocado` | `AcademicCertification.sol:53-77` |
| 6 | Verificación descentralizada | Función `view` pública sin autenticación; consulta directa al contrato | `AcademicCertification.sol:251-282` |
| 7 | Historial de certificados por estudiante | Mapping `certificadosPorEstudiante` con array de hashes | `AcademicCertification.sol:27` |
| 8 | Firma digital del receptor | Función `firmarRecepcion` que registra timestamp on-chain | `AcademicCertification.sol:191-206` |
| 9 | Interfaz de usuario accesible | DApp React con 5 tabs, soporte MetaMask, diseño responsivo | `frontend/src/` |
| 10 | Extensión NFT (ERC-721) | Contrato `CertificadoNFT.sol` con mappings bidireccionales tokenId↔hash | `CertificadoNFT.sol` |
| 11 | Suite de pruebas completa | 55 tests unitarios cubriendo todos los casos de éxito y revert | `test/*.test.js` |
| 12 | Script de despliegue automatizado | Scripts que despliegan, autorizan emisor, mintean prueba y exportan ABI+dirección al frontend | `scripts/deploy.js`, `scripts/deployNFT.js` |
| 13 | Generación de PDF del certificado | Generador con jsPDF: diseño A4, encabezado institucional, hash en footer | `pdfGenerator.js` |
| 14 | Documentación para demo y Sepolia | Guías paso a paso para demo local y despliegue en testnet pública | `DEMO.md`, `SEPOLIA.md` |

---

## 3. Arquitectura del Sistema

### 3.1 Visión General — Los 4 Nodos del Sistema Distribuido

El sistema modela cuatro actores con roles bien diferenciados que interactúan a través de la red Ethereum:

**Nodo 1 — Universidad Emisora**
Es el `owner` del contrato inteligente. Representa la institución académica y tiene la capacidad exclusiva de autorizar o revocar emisores. En un despliegue real, sería la cuenta controlada por la oficina de registros de la universidad. El owner también es emisor por defecto (el constructor lo registra automáticamente en `emisoresAutorizados`).

**Nodo 2 — Blockchain Ethereum**
Es la infraestructura distribuida que actúa como registro compartido, neutral e inmutable. No es un servidor único, sino una red P2P de miles de nodos validadores que replican y verifican el estado del contrato. Provee garantías de disponibilidad, integridad y no repudio que ningún sistema centralizado puede ofrecer. En desarrollo se usa Hardhat Network (nodo local determinista); en producción, la red pública Sepolia o Mainnet.

**Nodo 3 — Estudiante**
Posee una wallet Ethereum (par de claves ECDSA) cuya dirección pública es el identificador del destinatario del certificado. Puede firmar digitalmente la recepción de su certificado mediante la función `firmarRecepcion`, que verifica que `msg.sender == cert.estudianteWallet`. Su firma queda registrada con timestamp en la blockchain, constituyendo prueba criptográfica de recepción.

**Nodo 4 — Entidad Verificadora**
Cualquier actor (empleador, institución extranjera, ciudadano) que desee verificar la autenticidad de un certificado. No necesita cuenta, permisos ni conocimiento previo sobre el sistema. Solo necesita el archivo PDF original (o su hash) y acceso a la DApp. La función `verificarCertificado` es pública (`external view`) y no cobra gas.

### 3.2 Diagrama de Componentes

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         CAPA DE PRESENTACIÓN                                ║
║                                                                              ║
║   ┌─────────────────────────────────────────────────────────────────────┐   ║
║   │                    DApp React (Vite)                                │   ║
║   │                                                                     │   ║
║   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │   ║
║   │  │ Emitir   │ │Verificar │ │ Revocar  │ │Historial │ │ Firmar  │  │   ║
║   │  │Certificado│ │Certificado│ │Certificado│ │Estudiante│ │Recepción│  │   ║
║   │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘  │   ║
║   │       └────────────┴────────────┴─────────────┴────────────┘       │   ║
║   │                              │                                      │   ║
║   │                    ┌─────────▼──────────┐                          │   ║
║   │                    │   useContract.js   │ ← hook centralizado      │   ║
║   │                    │  (callContract,    │                          │   ║
║   │                    │   parsearError)    │                          │   ║
║   │                    └─────────┬──────────┘                          │   ║
║   │                              │                                      │   ║
║   │                    ┌─────────▼──────────┐                          │   ║
║   │                    │  Web3Context.jsx   │ ← estado global Web3     │   ║
║   │                    │ (provider, signer, │                          │   ║
║   │                    │  isOwner, isEmisor)│                          │   ║
║   └────────────────────┼────────────────────┼──────────────────────────┘   ║
╚═══════════════════════ │ ═════════════════╔═╧═╗ ════════════════════════════╝
                         │                 ║   ║
╔═══════════════════════ │ ═════════════╗  ║   ║
║   CAPA DE INTEGRACIÓN  │              ║  ║   ║
║                         │              ║  ║   ║
║   ┌─────────────────────▼──────────┐  ║  ║   ║
║   │         MetaMask               │  ║  ║   ║
║   │  (window.ethereum / EIP-1193)  │  ║  ║   ║
║   │  BrowserProvider (ethers v6)   │  ║  ║   ║
║   └─────────────────────┬──────────┘  ║  ║   ║
║                         │              ║  ║   ║
║   ┌─────────────────────▼──────────┐  ║  ║   ║
║   │         ethers.js v6           │  ║  ║   ║
║   │  Contract, Signer, Provider    │  ║  ║   ║
║   │  ABI encoding / decoding       │  ║  ║   ║
║   └─────────────────────┬──────────┘  ║  ║   ║
╚═══════════════════════ │ ════════════╝  ║   ║
                         │                 ║   ║
╔═══════════════════════ │ ═══════════════╗║   ║
║   CAPA DE CONTRATO     │               ║║   ║
║                         │               ║║   ║
║   ┌─────────────────────▼──────────┐   ║║   ║
║   │    AcademicCertification.sol   │   ║║   ║
║   │  ┌──────────────────────────┐  │   ║╚═══╝
║   │  │  mapping(bytes32 =>      │  │   ║
║   │  │     Certificate)        │  │   ║
║   │  │  mapping(address =>      │  │   ║
║   │  │     bytes32[])          │  │   ║
║   │  │  mapping(address => bool)│  │   ║
║   │  └──────────────────────────┘  │   ║
║   └────────────────────────────────┘   ║
║                                         ║
║   ┌────────────────────────────────┐   ║
║   │      CertificadoNFT.sol        │   ║
║   │  ERC721URIStorage + Ownable    │   ║
║   │  tokenAHash / hashAToken       │   ║
║   └────────────────────────────────┘   ║
╚═════════════════════════════════════════╝
                    │
╔═══════════════════▼═════════════════════╗
║         RED ETHEREUM (EVM)              ║
║                                         ║
║  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  ║
║  │Nodo 1│ │Nodo 2│ │Nodo 3│ │Nodo N│  ║
║  │(val.)│ │(val.)│ │(val.)│ │ ...  │  ║
║  └──────┘ └──────┘ └──────┘ └──────┘  ║
║                                         ║
║  Consenso PoS — Estado replicado        ║
║  en todos los nodos validadores         ║
╚═════════════════════════════════════════╝
```

### 3.3 Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|--------------|
| **Contrato inteligente** | Solidity | ^0.8.20 / compilado en 0.8.28 | Versión estable con soporte de OZ v5; 0.8.28 requerido por el opcode `mcopy` de Cancun |
| **Framework de desarrollo** | Hardhat | ^2.28.6 | Entorno de pruebas EVM determinista, soporte nativo para ethers v6, CommonJS; se evitó Hardhat v3 (ESM obligatorio, incompatibilidades) |
| **Librería de contratos** | OpenZeppelin Contracts | ^5.6.1 | Estándar de la industria; ERC-721, Ownable v5 (constructor con arg), custom errors |
| **EVM target** | Cancun | — | Requerido por OZ 5.6.1 que usa el opcode `mcopy` (EIP-5656); configurado en `evmVersion` |
| **Test runner** | Mocha + Chai | (via hardhat-toolbox) | Integrados en `@nomicfoundation/hardhat-toolbox@hh2` |
| **Interacción Ethereum** | ethers.js | v6 (hardhat-toolbox@hh2) | API moderna: `BrowserProvider`, `BigInt`, `ethers.ZeroAddress`; breaking changes respecto a v5 manejados |
| **Frontend framework** | React | 18 | Hooks funcionales, Context API para estado global Web3 |
| **Build tool** | Vite | ^6.3.5 | Compilación ultra-rápida, HMR, bundles optimizados para producción |
| **Generación de PDF** | jsPDF | ^3.0.1 | Única dependencia de PDF sin backend; genera el certificado visualmente en el navegador |
| **Hash de documentos** | Web Crypto API | nativa del browser | Sin dependencias; `crypto.subtle.digest("SHA-256")` disponible en todos los navegadores modernos |
| **Wallet** | MetaMask | EIP-1193 | Estándar de facto para wallets browser en Ethereum; inyecta `window.ethereum` |
| **Red testnet** | Sepolia (Ethereum) | — | Red de pruebas oficial post-Merge con faucets disponibles; Mainnet-like sin costos reales |
| **Almacenamiento descentralizado** | IPFS (referenciado) | — | Los URIs de NFT apuntan a `ipfs://CID`; la subida real está fuera del alcance del proyecto |
| **Linter** | ESLint | ^9.22.0 | Con plugin `react-refresh/only-export-components` para Hot Module Replacement correcto |

### 3.4 Modelo de Datos

El struct `Certificate` en `AcademicCertification.sol` es la unidad fundamental del sistema:

```solidity
struct Certificate {
    string  codigoCertificado;     // Identificador legible: "CERT-2024-001"
    string  nombreEstudiante;      // Nombre completo tal como aparece en el título
    address estudianteWallet;      // Wallet Ethereum del destinatario
    address emisor;                // Wallet del emisor (registrada automáticamente)
    uint256 fechaEmision;          // block.timestamp en el momento de la emisión
    bool    revocado;              // Flag: false = válido, true = anulado
    string  motivoRevocacion;      // Descripción del motivo (vacío si no fue revocado)
    bool    firmadoPorEstudiante;  // Flag: false = pendiente, true = firmado
    uint256 fechaFirmaEstudiante;  // block.timestamp de la firma (0 si no firmó)
}
```

**Justificación de cada campo:**

| Campo | Tipo | Decisión de Diseño |
|-------|------|--------------------|
| `codigoCertificado` | `string` | Código institucional legible (`string calldata` para optimizar gas en emisión) |
| `nombreEstudiante` | `string` | Almacenado en blockchain para que la verificación sea autocontenida, sin IPFS |
| `estudianteWallet` | `address` | Tipo nativo de 20 bytes; más eficiente que `string`; habilita la verificación de `msg.sender` en `firmarRecepcion` |
| `emisor` | `address` | Capturado como `msg.sender` al emitir; imposible falsificar, garantiza no repudio |
| `fechaEmision` | `uint256` | `block.timestamp` es el único timestamp confiable on-chain; `uint256` ocupa un slot de storage completo pero es el tipo estándar para tiempos en Solidity |
| `revocado` | `bool` | Flag en lugar de eliminación: preserva el historial completo e inmutable del certificado |
| `motivoRevocacion` | `string` | Almacenado on-chain para que el motivo sea tan inmutable como la revocación misma |
| `firmadoPorEstudiante` | `bool` | Evita doble firma; `require(!cert.firmadoPorEstudiante)` en `firmarRecepcion` |
| `fechaFirmaEstudiante` | `uint256` | Timestamp on-chain de la firma del estudiante; 0 indica que no fue firmado (los tokenIds válidos empiezan en 1 en el contrato NFT por la misma razón) |

**Indicador de existencia sin campo explícito:**  
En lugar de añadir un campo `bool exists`, se utiliza la invariante `cert.fechaEmision != 0`. Un certificado recién inicializado tiene todos sus campos en valores por defecto (0 para enteros, `""` para strings, `address(0)` para addresses, `false` para bools). Si `fechaEmision == 0`, el certificado nunca fue emitido. Esto ahorra un slot de storage (21,000 gas en el primer write) sin sacrificar expresividad.

**Clave primaria del mapping:**  
Los certificados se indexan por el hash SHA-256 del documento (`mapping(bytes32 => Certificate)`), no por un ID incremental. Esta decisión elimina la necesidad de un índice secundario y permite verificación directa: presentar el documento equivale a conocer la clave de acceso al registro.

---

## 4. Smart Contract — AcademicCertification.sol

### 4.1 Funciones Implementadas

---

#### `constructor()`
```solidity
constructor() {
    owner = msg.sender;
    emisoresAutorizados[msg.sender] = true;
    emit EmisorAutorizado(msg.sender);
}
```
**Descripción:** Despliega el contrato, establece al deployer como `owner` y lo registra como primer emisor autorizado. El evento `EmisorAutorizado` se emite incluso en el constructor para que la autorización inicial quede indexada en los logs de la transacción de despliegue.

**Guards:** Ninguno adicional — el deployer siempre es el `msg.sender` durante el constructor, lo cual es garantizado por la EVM.

---

#### `autorizarEmisor(address _emisor)`
```solidity
function autorizarEmisor(address _emisor) external onlyOwner
```
**Descripción:** Agrega una dirección al mapping `emisoresAutorizados`, otorgándole la capacidad de emitir certificados.

**Parámetros:** `_emisor` — dirección de la wallet a autorizar.

**Guards de seguridad:**
- `onlyOwner` — solo el owner puede delegar esta capacidad
- `require(_emisor != address(0))` — previene autorizar la dirección nula (sin clave privada)
- `require(!emisoresAutorizados[_emisor])` — previene doble autorización (idempotencia)

---

#### `revocarEmisor(address _emisor)`
```solidity
function revocarEmisor(address _emisor) external onlyOwner
```
**Descripción:** Elimina los permisos de emisión de una dirección. No afecta los certificados ya emitidos.

**Parámetros:** `_emisor` — dirección cuyo permiso se revoca.

**Guards de seguridad:**
- `onlyOwner` — misma restricción
- `require(_emisor != owner)` — el owner no puede auto-revocarse; previene que se quede sin control del sistema
- `require(emisoresAutorizados[_emisor])` — solo se puede revocar lo que existe

---

#### `emitirCertificado(bytes32, string calldata, string calldata, address)`
```solidity
function emitirCertificado(
    bytes32 _hashDocumento,
    string  calldata _codigo,
    string  calldata _nombre,
    address _estudianteWallet
) external onlyEmisor
```
**Descripción:** Registra un nuevo certificado en blockchain. Esta es la función central del sistema. Los datos del `Certificate` se escriben en `certificados[_hashDocumento]` y el hash se agrega al array `certificadosPorEstudiante[_estudianteWallet]`.

**Parámetros:**
- `_hashDocumento` — hash SHA-256 del PDF, calculado off-chain con Web Crypto API
- `_codigo` — código institucional del certificado (ej: `"CERT-ISI-2024-042"`)
- `_nombre` — nombre completo del graduado
- `_estudianteWallet` — dirección Ethereum del destinatario

**Guards de seguridad:**
- `onlyEmisor` — solo emisores autorizados
- `require(_hashDocumento != bytes32(0))` — hash nulo es inválido
- `require(bytes(_codigo).length > 0)` — código no vacío
- `require(bytes(_nombre).length > 0)` — nombre no vacío
- `require(_estudianteWallet != address(0))` — wallet válida
- `require(cert.fechaEmision == 0)` — **previene hash duplicado**; si el hash ya existe, la transacción revierte. Esto es el mecanismo anti-falsificación: un emisor no puede registrar el mismo documento dos veces ni sobreescribir un registro existente.

**Uso de `calldata` vs `memory`:** Los parámetros `string` se declaran como `calldata` porque son parámetros de entrada de una función `external`. `calldata` es de solo lectura y no copia los datos a memoria, reduciendo el costo de gas en transacciones con strings largos.

---

#### `firmarRecepcion(bytes32 _hashDocumento)`
```solidity
function firmarRecepcion(bytes32 _hashDocumento) external
```
**Descripción:** Permite al estudiante confirmar la recepción de su certificado. No requiere el modifier `onlyEmisor` porque cualquier estudiante puede llamarla; la validación de identidad se hace comparando `msg.sender` con el campo `estudianteWallet` del certificado.

**Guards de seguridad:**
- `require(cert.fechaEmision != 0)` — el certificado debe existir
- `require(!cert.revocado)` — no se puede firmar un certificado anulado
- `require(!cert.firmadoPorEstudiante)` — no se puede firmar dos veces
- `require(msg.sender == cert.estudianteWallet)` — **identidad verificada criptográficamente**: solo quien controla la clave privada de la wallet registrada puede firmar

---

#### `revocarCertificado(bytes32 _hashDocumento, string calldata _motivo)`
```solidity
function revocarCertificado(bytes32 _hashDocumento, string calldata _motivo) external onlyEmisor
```
**Descripción:** Invalida un certificado activando el flag `revocado = true` y almacenando el motivo. El registro original se preserva íntegramente (datos de emisión, nombre, wallet, etc.) para garantizar auditabilidad.

**Guards de seguridad:**
- `onlyEmisor` — solo emisores pueden revocar
- `require(cert.fechaEmision != 0)` — el certificado debe existir
- `require(!cert.revocado)` — no se puede revocar lo ya revocado
- `require(bytes(_motivo).length > 0)` — motivo obligatorio; no se admite revocación sin justificación

---

#### `verificarCertificado(bytes32 _hashDocumento)` — view
```solidity
function verificarCertificado(bytes32 _hashDocumento)
    external view
    returns (string, string, address, address, uint256, bool, string, bool, uint256, bool)
```
**Descripción:** Retorna todos los campos del certificado más el indicador `exists`. Al ser `view`, no gasta gas cuando se llama desde un cliente (solo desde otro contrato gastaría). El campo `exists` se calcula como `cert.fechaEmision != 0` sin necesidad de un campo explícito.

---

#### `obtenerCertificadosDeEstudiante(address _estudiante)` — view
```solidity
function obtenerCertificadosDeEstudiante(address _estudiante)
    external view returns (bytes32[] memory)
```
**Descripción:** Retorna el array de hashes asociados a una wallet. El frontend luego llama `verificarCertificado` para cada hash y construye el historial completo.

### 4.2 Patrones de Seguridad

**Modifier `onlyOwner`**  
Restringe la gestión de emisores al deployer del contrato. Implementado con `require(msg.sender == owner, ...)`. No usa OpenZeppelin Ownable para `AcademicCertification` para demostrar la implementación manual; sí usa OZ Ownable en `CertificadoNFT`.

**Modifier `onlyEmisor`**  
Sistema de lista blanca (`whitelist`) para la capacidad de emitir y revocar. El mapping `emisoresAutorizados` actúa como un registro de control de acceso descentralizado: el owner puede actualizar la lista sin redesplegar el contrato.

**Identificación por hash criptográfico**  
El hash SHA-256 actúa como identificador único e infalsificable. Propiedades:
- **Determinismo:** El mismo archivo siempre produce el mismo hash.
- **Efecto avalancha:** Un cambio de un bit en el documento produce un hash completamente diferente.
- **Resistencia a preimagen:** Dado el hash, es computacionalmente inviable reconstruir el documento.
- **Resistencia a colisiones:** Es computacionalmente inviable encontrar dos documentos distintos con el mismo hash.

**Inmutabilidad del historial (flag vs eliminación)**  
Cuando un certificado es revocado, los datos originales permanecen inalterados en el storage. Solo se activa el flag `revocado = true` y se registra el `motivoRevocacion`. Esto garantiza que:
1. Cualquier verificador puede ver el historial completo, incluyendo cuándo fue emitido y cuándo fue revocado.
2. No es posible "borrar" evidencia de haber emitido un certificado fraudulento.
3. La revocación en sí queda registrada con el emisor que la ejecutó.

**Existencia sin campo explícito (`fechaEmision != 0`)**  
Evitar un campo `bool exists` ahorra gas en cada escritura inicial. La invariante aprovecha que `block.timestamp` nunca puede ser 0 en una transacción real (el timestamp del bloque génesis de Ethereum es 1438269988).

**`calldata` vs `memory` para strings**  
Los parámetros `string calldata` en funciones `external` evitan copiar los datos a memoria, reduciendo el gas consumido cuando los strings son largos. Los returns y variables locales de tipo `string` usan `memory` como es requerido por Solidity.

### 4.3 Eventos y Trazabilidad

Los eventos de Solidity se almacenan en los **logs de la transacción**, que son parte del recibo del bloque pero no del storage del contrato. Son más baratos que el storage y son indexables por los nodos Ethereum para búsqueda eficiente.

| Evento | Parámetros indexados | Propósito | Garantía |
|--------|---------------------|-----------|----------|
| `CertificadoEmitido` | `hashDocumento`, `estudiante`, `emisor` | Notifica la creación de un certificado | Permite indexar por hash, estudiante o emisor para búsqueda O(1) en block explorers |
| `CertificadoRevocado` | `hashDocumento`, `emisor` | Notifica la anulación con motivo | El motivo queda en logs aunque el storage ya no lo exponga en versiones futuras |
| `CertificadoFirmado` | `hashDocumento`, `estudiante` | Notifica la firma de recepción | Prueba irrefutable de que el estudiante firmó, con timestamp de bloque |
| `EmisorAutorizado` | `emisor` | Notifica nueva autorización | Auditoría de quién fue autorizado y cuándo |
| `EmisorRevocado` | `emisor` | Notifica revocación de permiso | Auditoría completa del ciclo de vida de los permisos |

Los parámetros `indexed` crean **topic filters** en los logs, permitiendo consultas eficientes como "todos los certificados emitidos a esta wallet" sin recorrer todos los bloques.

---

## 5. Extensión NFT — CertificadoNFT.sol (ERC-721)

### 5.1 Justificación del Estándar ERC-721

El estándar ERC-721 define tokens **no fungibles** (Non-Fungible Tokens): cada token tiene un ID único y no es intercambiable con otro token del mismo contrato. Esta propiedad es perfecta para certificados académicos porque:

- **Un certificado = Un token**: Cada graduado recibe un NFT único que representa su logro específico, imposible de duplicar.
- **Propiedad verificable**: La función `ownerOf(tokenId)` devuelve la wallet propietaria actual, permitiendo verificar no solo la existencia sino la custodia actual del certificado.
- **Transferibilidad controlada**: El NFT puede transferirse (con las mismas restricciones del contrato base ERC-721), lo cual tiene sentido en casos como cambio de wallet del estudiante.
- **Interoperabilidad**: Los NFTs ERC-721 son compatibles con cualquier wallet, marketplace o contrato que entienda el estándar, incluyendo OpenSea, Metamask Portfolio, Etherscan, etc.
- **Metadata en IPFS**: La metadata del token (JSON con nombre, descripción, imagen) puede almacenarse en IPFS de forma descentralizada, accesible mediante el `tokenURI`.

La combinación `ERC721URIStorage + Ownable` (de OpenZeppelin v5) proporciona:
- Almacenamiento de URI individual por token.
- Control de acceso con el concepto de owner del contrato.
- Implementaciones auditadas y gas-optimizadas.

### 5.2 Relación Hash ↔ TokenId (Mappings Bidireccionales)

```solidity
mapping(uint256 => bytes32) public tokenAHash;   // tokenId → hash del documento
mapping(bytes32 => uint256) public hashAToken;   // hash del documento → tokenId
```

Esta estructura de **doble índice** es un patrón común en Solidity para mantener relaciones inversas sin recorrer todos los elementos:

- **`tokenAHash`**: Dado un `tokenId`, retorna el hash SHA-256 del documento original. Permite a un tenedor del NFT probar a qué documento físico corresponde su token.
- **`hashAToken`**: Dado el hash del documento, retorna el `tokenId` (0 si no existe). Permite verificar si un documento ya fue registrado como NFT, sin conocer el tokenId de antemano.

La **unicidad del hash** se garantiza en `mintCertificado`:
```solidity
require(hashAToken[hashDocumento] == 0, "CertificadoNFT: hash ya registrado");
```
El valor 0 es el valor por defecto de los mappings en Solidity, y los tokenIds válidos empiezan en 1 (el contador se incrementa antes de usarse). Esta invariante garantiza que ningún documento puede ser tokenizado dos veces.

**Función `verificarPorHash`:**
```solidity
function verificarPorHash(bytes32 hashDocumento)
    external view
    returns (bool exists, uint256 tokenId, address owner)
{
    tokenId = hashAToken[hashDocumento];
    exists  = tokenId != 0;
    owner   = exists ? ownerOf(tokenId) : address(0);
}
```
Esta función permite a un verificador externo consultar si un documento está registrado como NFT y quién es su propietario actual, en una sola llamada.

### 5.3 Metadata y Estructura JSON para IPFS

Antes de mintear, el emisor debe subir a IPFS un archivo JSON con la metadata del certificado:

```json
{
  "name": "Certificado Académico #1",
  "description": "Certificado verificado en blockchain — Sistema CertChain",
  "image": "ipfs://QmImagenDelDiploma...",
  "attributes": [
    { "trait_type": "Estudiante",    "value": "Ana García López" },
    { "trait_type": "Carrera",       "value": "Ingeniería de Sistemas" },
    { "trait_type": "Universidad",   "value": "Universidad Boliviana" },
    { "trait_type": "Fecha",         "value": "15 de junio de 2024" },
    { "trait_type": "Hash SHA-256",  "value": "0xa3f5c2..." }
  ]
}
```

El `tokenURI` almacenado en el contrato es el CID del JSON en IPFS (ej: `"QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/metadata.json"`). La función `tokenURI(tokenId)` retorna `_baseURI() + storedURI`, donde `_baseURI()` retorna `"ipfs://"`. El resultado final es `"ipfs://QmYwAPJz.../metadata.json"`.

### 5.4 Ajuste Técnico Requerido: OpenZeppelin 5.6.1 + EVM Cancun

#### El Problema

Al ejecutar `npx hardhat compile` con la configuración original (`solidity: "0.8.24"`), el compilador lanzó:

```
DeclarationError: Function "mcopy" not found.
  --> @openzeppelin/contracts/utils/Bytes.sol:94:13:
   |
94 |             mcopy(add(result, 0x20), add(add(buffer, 0x20), start), sub(end, start))
```

**Causa raíz:** OpenZeppelin 5.6.1 (lanzado en 2025) introdujo en `contracts/utils/Bytes.sol` el uso del opcode `mcopy` definido en [EIP-5656](https://eips.ethereum.org/EIPS/eip-5656). Este opcode fue introducido en el **hard fork Cancun** de Ethereum (marzo 2024) y permite copiar memoria a memoria de forma más eficiente que el bucle tradicional. Su ventaja es reducir el costo en gas de operaciones de copia de bytes.

El problema tiene **dos capas**:

1. **Versión de Solidity:** El opcode `mcopy` solo está disponible a partir de Solidity 0.8.25 (la versión 0.8.24 no lo reconoce como built-in válido).
2. **Target de EVM:** Aunque Solidity 0.8.25+ reconoce `mcopy`, el compilador solo lo emite si el `evmVersion` está configurado en `cancun` o superior. Si se compila para `paris` (el default anterior), el compilador lanza `TypeError: "mcopy" instruction is only available for Cancun-compatible VMs`.

#### La Solución

Dos cambios en `blockchain/hardhat.config.js`:

```javascript
// ANTES:
solidity: {
  version: "0.8.24",
  settings: {
    optimizer: { enabled: true, runs: 200 },
  },
},

// DESPUÉS:
solidity: {
  version: "0.8.28",
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",         // ← NUEVO: habilita el opcode mcopy
  },
},
```

**Cambio 1:** `"0.8.24"` → `"0.8.28"` — Solidity 0.8.28 reconoce `mcopy` como función built-in válida.

**Cambio 2:** Añadir `evmVersion: "cancun"` — Indica al compilador que el código se ejecutará en una EVM que soporta el hard fork Cancun, habilitando la emisión del opcode `mcopy` en el bytecode.

**Impacto en compatibilidad:** La red Hardhat local soporta Cancun desde Hardhat 2.22+. En Sepolia, el hard fork Cancun se activó en marzo de 2024, por lo que todos los nodos Sepolia actuales son compatibles. En Mainnet, Cancun también está activo desde la misma fecha.

---

## 6. Frontend — DApp React

### 6.1 Árbol de Componentes

```
App.jsx (root)
│
└── Web3Provider (contexto global)
    │
    └── AppContent
        │
        ├── Navbar.jsx
        │   └── (logo, botón conectar/desconectar, indicador de red)
        │
        └── [Si no conectado] → WelcomeCard
        │   └── Botón "Conectar MetaMask"
        │
        └── [Si conectado] → TabBar + TabPanel
            │
            ├── Tab: "🔍 Verificar"  → VerificarCertificado.jsx
            │   ├── ResultadoVerificacion (sub-componente)
            │   │   ├── CertFields (sub-componente)
            │   │   └── CertField (sub-componente)
            │   └── [modo: pdf | hash]
            │
            ├── Tab: "📋 Historial"  → HistorialEstudiante.jsx
            │   └── CertCard (sub-componente por certificado)
            │
            ├── Tab: "✍️ Firmar"    → FirmarRecepcion.jsx
            │   └── PreviewCertificado (sub-componente)
            │
            ├── Tab: "📄 Emitir"    → EmitirCertificado.jsx  [roleRequired: true]
            │   └── (visible solo si isOwner || isEmisor)
            │
            └── Tab: "🚫 Revocar"   → RevocarCertificado.jsx [roleRequired: true]
                └── (visible solo si isOwner || isEmisor)
```

### 6.2 Web3Context — Gestión del Estado Blockchain

`Web3Context.jsx` implementa el patrón **Context + Provider** de React para centralizar todo el estado relacionado con la conexión Web3 y hacerlo disponible en cualquier componente sin prop drilling.

**Estado gestionado:**

```javascript
const INITIAL_STATE = {
  provider:    null,   // ethers.BrowserProvider — acceso a la red
  signer:      null,   // ethers.Signer — firma transacciones
  account:     null,   // string — dirección de la cuenta activa (0x...)
  chainId:     null,   // number — ID de la red (31337 local, 11155111 Sepolia)
  contrato:    null,   // ethers.Contract — instancia del contrato con signer
  isConnected: false,  // boolean — indica si hay wallet conectada
  isOwner:     false,  // boolean — la cuenta activa es el owner del contrato
  isEmisor:    false,  // boolean — la cuenta activa está autorizada como emisor
  loading:     false,  // boolean — hay operación de conexión en curso
  error:       null,   // string|null — mensaje de error de conexión
};
```

**Verificación de roles en `conectarWallet`:**
```javascript
const ownerAddress = await contrato.owner();
const isOwner = ownerAddress.toLowerCase() === account.toLowerCase();
const isEmisor = await contrato.emisoresAutorizados(account);
```
Los roles se detectan en el momento de la conexión consultando directamente el contrato. Esto garantiza que los tabs de "Emitir" y "Revocar" solo sean visibles para cuentas realmente autorizadas on-chain.

**Reactividad a eventos MetaMask:**
```javascript
window.ethereum.on("accountsChanged", handleAccountsChanged);
window.ethereum.on("chainChanged",    handleChainChanged);
```
Cuando el usuario cambia de cuenta en MetaMask, `handleAccountsChanged` llama a `conectarWallet()` nuevamente, actualizando los roles. Cuando cambia de red, se recarga la página (comportamiento recomendado por MetaMask).

### 6.3 Flujo de Conexión MetaMask — Paso a Paso

```
1. Usuario hace clic en "Conectar MetaMask para comenzar"
   └── onClick={conectarWallet}

2. conectarWallet() verifica window.ethereum
   ├── [Sin MetaMask] → setState({ error: "MetaMask no está instalado..." })
   └── [Con MetaMask] → continúa

3. window.ethereum.request({ method: "eth_requestAccounts" })
   ├── MetaMask muestra popup de autorización al usuario
   ├── [Usuario rechaza] → err.code === 4001 → error "Conexión rechazada"
   └── [Usuario aprueba] → continúa

4. new ethers.BrowserProvider(window.ethereum)
   └── Crea instancia de Provider (lectura de datos de la red)

5. provider.getSigner()
   └── Obtiene el Signer (objeto que firma transacciones con la clave privada)

6. signer.getAddress()
   └── Recupera la dirección pública de la cuenta activa: "0xAbCd..."

7. provider.getNetwork()
   └── Obtiene chainId para mostrar la red y formatear links a Etherscan

8. new ethers.Contract(address, abi, signer)
   └── Instancia el contrato ligado al signer
       (las llamadas write() enviarán txs firmadas automáticamente)

9. contrato.owner() + contrato.emisoresAutorizados(account)
   └── Consultas view — sin costo de gas, respuesta inmediata

10. setState({ isConnected: true, isOwner, isEmisor, ... })
    └── React re-renderiza → muestra tabs según roles → App lista para usar
```

### 6.4 Cálculo SHA-256 con Web Crypto API

El núcleo del sistema de verificación es la función `calcularHashPDF` en `hashUtils.js`:

```javascript
export async function calcularHashPDF(file) {
  // 1. Leer el archivo completo como ArrayBuffer (bytes crudos)
  const arrayBuffer = await file.arrayBuffer();

  // 2. Calcular SHA-256 usando la API nativa del navegador
  //    window.crypto.subtle es la Web Crypto API (sin dependencias externas)
  //    "SHA-256" produce un digest de 256 bits (32 bytes)
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", arrayBuffer);

  // 3. Convertir el ArrayBuffer a string hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex   = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // 4. Agregar prefijo 0x requerido por Solidity/ethers.js para bytes32
  return "0x" + hashHex;
  // Ejemplo de resultado: "0xa3f5c2d1e8b047a91c3f5a2d..." (66 caracteres total)
}
```

**Propiedades críticas de este diseño:**

- **Sin dependencias:** `window.crypto.subtle` está disponible en todos los navegadores modernos (Chrome 37+, Firefox 34+, Safari 11+) sin instalar librerías adicionales.
- **Cálculo en el navegador:** El archivo PDF nunca sale del dispositivo del usuario. El hash se calcula localmente, respetando la privacidad.
- **Compatibilidad con Solidity:** El resultado es `"0x" + 64 caracteres hex`, que corresponde exactamente al tipo `bytes32` de Solidity (32 bytes = 256 bits). ethers.js acepta este formato directamente.
- **Efecto avalancha:** Cualquier modificación al PDF (un espacio extra, metadatos distintos, una marca de agua invisible) produce un hash completamente diferente, haciendo imposible presentar un documento alterado y obtener la misma verificación positiva.

### 6.5 Descripción de Cada Componente

**`EmitirCertificado.jsx`**  
Formulario para que emisores autorizados registren nuevos certificados. Calcula el hash SHA-256 del PDF seleccionado via `calcularHashPDF`, valida todos los campos (incluyendo que la wallet sea una dirección Ethereum válida via `ethers.isAddress`), envía la transacción via `emitirCertificado` del hook, y tras el éxito ofrece descargar un PDF de representación visual del certificado generado con jsPDF. Guarda el estado `certEmitido` antes de limpiar el formulario para que el PDF se pueda generar aunque los campos ya hayan sido borrados.

**`VerificarCertificado.jsx`**  
Permite a cualquier usuario (incluyendo no-emisores) verificar la autenticidad de un certificado. Soporta dos modos: subir el PDF original (calcula hash automáticamente) o pegar el hash manualmente. El resultado se presenta en un sub-componente `ResultadoVerificacion` con tres estados visuales: certificado válido (verde), certificado revocado (rojo con motivo), o no encontrado (gris con explicación).

**`RevocarCertificado.jsx`**  
Disponible solo para emisores y owner. Permite subir el PDF o pegar el hash, muestra un preview del certificado actual y solicita un motivo de revocación. El motivo es obligatorio tanto en el frontend como en el contrato.

**`HistorialEstudiante.jsx`**  
Permite consultar todos los certificados asociados a una wallet. El usuario ingresa una dirección Ethereum, el hook llama a `obtenerCertificadosDeEstudiante` (retorna array de hashes) y luego llama `verificarCertificado` por cada hash para construir el historial completo con todos los campos.

**`FirmarRecepcion.jsx`**  
Permite al estudiante confirmar la recepción de su certificado. Detecta automáticamente si el hash ingresado es válido (via regex `/^0x[0-9a-fA-F]{64}$/`) y lanza la búsqueda sin necesidad de presionar un botón. El sub-componente `PreviewCertificado` tiene cuatro estados: ya firmado (informativo), pendiente + wallet correcta (botón de firma), pendiente + wallet incorrecta (error con instrucción de cambiar cuenta en MetaMask), y revocado (error sin acción posible).

---

## 7. Flujo Completo del Sistema — 6 Escenarios

### Escenario 1: Emitir un Certificado

**Descripción:** La secretaría de la facultad (emisor autorizado) sube el PDF del diploma de Ana García, ingresa sus datos y registra el certificado en blockchain.

**Actores:** Emisor (signers[1]), Blockchain Ethereum.

**Flujo:**
1. El emisor selecciona el archivo `diploma_ana_garcia.pdf` en el tab "📄 Emitir".
2. `calcularHashPDF(file)` ejecuta SHA-256 via Web Crypto API → `"0xa3f5c2..."`.
3. El formulario se completa: código `"CERT-ISI-2024-042"`, nombre `"Ana García López"`, carrera `"Ingeniería de Sistemas"`, wallet del estudiante.
4. Al presionar "Emitir Certificado", `useContract.emitirCertificado(hash, codigo, nombre, wallet)` envía la transacción.
5. MetaMask muestra el popup de firma → el emisor aprueba.
6. La EVM ejecuta `AcademicCertification.emitirCertificado()`: valida guards, escribe el struct en `certificados[hash]`, agrega el hash a `certificadosPorEstudiante[wallet]`.

**Función del contrato:** `emitirCertificado(bytes32, string, string, address)`

**Evento emitido:**
```solidity
emit CertificadoEmitido(hashDocumento, _codigo, _estudianteWallet, msg.sender);
```

**Cambio de estado en blockchain:**
- `certificados[0xa3f5c2...]` = `Certificate{ codigo: "CERT-ISI-2024-042", nombre: "Ana García López", fechaEmision: 1718000000, revocado: false, ... }`
- `certificadosPorEstudiante[0xStudWallet]` = `[0xa3f5c2...]`

**Resultado en UI:** Alerta verde con hash de transacción y botón "Descargar PDF del Certificado".

---

### Escenario 2: Verificar un Certificado Válido

**Descripción:** Una empresa empleadora recibe el CV de Ana García con una copia de su diploma. Verifica su autenticidad presentando el archivo PDF en la DApp.

**Actores:** Verificador externo (sin cuenta o sin rol especial), Blockchain Ethereum.

**Flujo:**
1. El verificador abre la DApp y conecta su wallet (solo para acceder, no necesita ser emisor).
2. En el tab "🔍 Verificar", selecciona el modo "📄 Verificar por PDF" y sube el archivo.
3. `calcularHashPDF(file)` produce `"0xa3f5c2..."` — idéntico al hash registrado.
4. Al presionar "Verificar", `verificarCertificado("0xa3f5c2...")` consulta el contrato.
5. El contrato ejecuta `certificados[0xa3f5c2...]` y retorna el struct completo + `exists: true`.

**Función del contrato:** `verificarCertificado(bytes32)` — view, sin gas.

**Evento emitido:** Ninguno (función view).

**Estado de blockchain:** No cambia.

**Resultado en UI:** Tarjeta verde "✅ CERTIFICADO VÁLIDO" con todos los campos del certificado, firma del estudiante si aplica, y dirección del emisor.

---

### Escenario 3: Historial del Estudiante

**Descripción:** Ana García desea ver todos sus certificados registrados en blockchain.

**Flujo:**
1. Ana conecta su MetaMask en la DApp.
2. En el tab "📋 Historial", ingresa su propia dirección (o la dirección de cualquier estudiante).
3. `obtenerHistorial(walletAddress)` llama a `obtenerCertificadosDeEstudiante(address)`.
4. El contrato retorna `[0xa3f5c2..., 0xb8d7e1..., ...]` — array de hashes.
5. El frontend llama `verificarCertificado` por cada hash y construye la lista.

**Función del contrato:** `obtenerCertificadosDeEstudiante(address)` — view.

**Evento emitido:** Ninguno.

**Resultado en UI:** Lista de tarjetas con todos los certificados del estudiante, mostrando estado (válido/revocado) y si fueron firmados.

---

### Escenario 4: Revocar un Certificado

**Descripción:** Se descubre que Ana García obtuvo su título mediante irregularidades. La institución procede a revocar el certificado.

**Flujo:**
1. El emisor (o owner) accede al tab "🚫 Revocar".
2. Sube el PDF del certificado a revocar (o pega el hash).
3. Ingresa el motivo: `"Título obtenido mediante irregularidades académicas detectadas en auditoría 2024-09"`.
4. Al confirmar, `revocarCertificado(hash, motivo)` envía la transacción.
5. La EVM ejecuta: cambia `cert.revocado = true`, almacena `cert.motivoRevocacion`.

**Función del contrato:** `revocarCertificado(bytes32, string)`

**Evento emitido:**
```solidity
emit CertificadoRevocado(hashDocumento, _motivo, msg.sender);
```

**Cambio de estado en blockchain:**
- `certificados[0xa3f5c2...].revocado` = `true`
- `certificados[0xa3f5c2...].motivoRevocacion` = `"Título obtenido mediante..."`
- Los demás campos (nombre, fecha de emisión, wallet) permanecen inalterados.

**Resultado en UI:** Confirmación de transacción exitosa.

---

### Escenario 5: Verificar un Certificado Revocado

**Descripción:** La misma empresa empleadora vuelve a verificar el diploma de Ana después de la revocación.

**Flujo idéntico al Escenario 2**, pero el contrato ahora retorna `revocado: true` y `motivoRevocacion: "Título obtenido mediante..."`.

**Resultado en UI:** Tarjeta roja "❌ CERTIFICADO REVOCADO" con el motivo visible. El empleador rechaza la solicitud.

---

### Escenario 6: Intento de Falsificación (Efecto Avalancha SHA-256)

**Descripción:** Un actor malicioso modifica el PDF del certificado de Ana García (añade su propio nombre en los metadatos del PDF) e intenta verificarlo como si fuera el original.

**Flujo:**
1. El falsificador modifica `diploma_ana_garcia.pdf` → `diploma_falsificado.pdf`.
2. Sube `diploma_falsificado.pdf` a la DApp para verificar.
3. `calcularHashPDF(diploma_falsificado.pdf)` produce `"0x9f2c8a..."` — completamente diferente.
4. `verificarCertificado("0x9f2c8a...")` consulta `certificados[0x9f2c8a...]`.
5. El contrato retorna `exists: false` (el mapping retorna el struct con `fechaEmision == 0`).

**Función del contrato:** `verificarCertificado(bytes32)` — view.

**Resultado en UI:** Tarjeta gris "⚠️ CERTIFICADO NO ENCONTRADO".

**Demostración técnica del efecto avalancha:**

El cambio más mínimo al archivo produce un hash radicalmente diferente:
```
Archivo original (2,347,891 bytes):
SHA-256 = 0xa3f5c2d1e8b047a91c3f5a2d8b1e4f7c9a3d6e2f1b4c8d5e7a9f3b2c1e6d8...

Mismo archivo con un bit cambiado (2,347,891 bytes):
SHA-256 = 0x9f2c8a4b7e1d3f6c2a5b8e3d7f4c1a9b6e3d8f5c2a7b4e1d9f6c3a8b5e2d...
```
Los 64 caracteres hexadecimales son completamente distintos. La probabilidad de encontrar un documento diferente con el mismo hash (colisión SHA-256) es de 1 en 2^128 ≈ 3.4 × 10^38 — computacionalmente imposible con la tecnología actual.

---

## 8. Resultados de Pruebas

### 8.1 Suite Completa: 55/55 Tests Passing

```
  AcademicCertification
    Gestión de Emisores         (8 tests)   ✓ Passed
    Emisión de Certificados     (7 tests)   ✓ Passed
    Firma de Recepción          (5 tests)   ✓ Passed
    Revocación de Certificados  (7 tests)   ✓ Passed
    Verificación                (6 tests)   ✓ Passed

  CertificadoNFT
    Despliegue                  (4 tests)   ✓ Passed
    Gestión de Emisores         (3 tests)   ✓ Passed
    Mint de Certificados        (8 tests)   ✓ Passed
    Verificación                (7 tests)   ✓ Passed

  55 passing (1s)
```

| Contrato | Grupo | Tests | Cobertura |
|---------|-------|-------|-----------|
| AcademicCertification | Gestión de Emisores | 8 | autorizarEmisor (éxito, evento, revert no-owner), revocarEmisor (éxito, evento, revert auto-revocación, revert no-autorizado), emisor revocado no puede emitir |
| AcademicCertification | Emisión de Certificados | 7 | emisión exitosa, evento, almacenamiento correcto, historial actualizado, revert no-emisor, revert hash duplicado, revert wallet nula |
| AcademicCertification | Firma de Recepción | 5 | firma exitosa, evento, flags actualizados, revert tercero, revert doble firma |
| AcademicCertification | Revocación de Certificados | 7 | revocación exitosa, evento, flags actualizados, historial preservado, revert no-emisor, revert ya revocado, revert motivo vacío |
| AcademicCertification | Verificación | 6 | exists=true, exists=false, revocado=true tras revocar, historial multi-certificado, historial vacío, independencia entre estudiantes |
| CertificadoNFT | Despliegue | 4 | nombre, símbolo, owner, totalSupply=0 |
| CertificadoNFT | Gestión de Emisores | 3 | autorizar (éxito, evento), revert OwnableUnauthorizedAccount |
| CertificadoNFT | Mint de Certificados | 8 | mint exitoso, evento con args correctos, incremento tokenId, tokenIds 1 y 2, ownerOf, tokenURI con prefijo ipfs://, revert no-emisor, revert hash duplicado |
| CertificadoNFT | Verificación | 7 | verificarPorHash: exists=true, tokenId correcto, owner correcto, exists=false (ZeroAddress), obtenerHashDeToken: hash correcto, bytes32(0) para inexistente, consistencia hashAToken |
| **TOTAL** | | **55** | **100% de los escenarios definidos** |

**Tiempo de ejecución:** ~1 segundo (red Hardhat en memoria).

### 8.2 Detalle del Ajuste Técnico (EVM Cancun)

**Síntoma inicial:**
```
DeclarationError: Function "mcopy" not found.
  --> @openzeppelin/contracts/utils/Bytes.sol:94:13
```

**Causa:** OpenZeppelin 5.6.1 utiliza el opcode `mcopy` (EIP-5656, activado en Cancun, marzo 2024) en el contrato base `Bytes.sol` para operaciones eficientes de copia en memoria. Este opcode no existía en la EVM París (objetivo anterior de Hardhat por defecto).

**Proceso de diagnóstico:**
1. Error con Solidity 0.8.24: "Function mcopy not found" → el compilador no conoce el mnemónico.
2. Actualización a Solidity 0.8.28: Nuevo error "instruction only available for Cancun-compatible VMs" → el compilador conoce `mcopy` pero no lo emite para París.
3. Añadir `evmVersion: "cancun"`: Compilación exitosa.

**Cambios realizados (`hardhat.config.js:11-17`):**
```javascript
solidity: {
  version: "0.8.28",          // 0.8.24 → 0.8.28
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",     // Línea añadida
  },
},
```

**Compatibilidad verificada:** La red Hardhat 2.22+ soporta EVM Cancun. Sepolia activó Cancun en marzo 2024. Ethereum Mainnet también.

### 8.3 Prueba de Falsificación

Los tests incluyen verificación del comportamiento ante hashes no registrados:

```javascript
it("verificarPorHash retorna exists=false para hash no registrado", async function () {
  const hashFalso = ethers.keccak256(ethers.toUtf8Bytes("hash_inexistente"));
  const resultado = await nft.verificarPorHash(hashFalso);
  expect(resultado.exists).to.equal(false);
  expect(resultado.tokenId).to.equal(0n);
  expect(resultado.owner).to.equal(ethers.ZeroAddress);
});
```

Y en `AcademicCertification.test.js`:
```javascript
it("verificarCertificado retorna exists=false para un hash inexistente", async function () {
  const hashFalso = ethers.keccak256(ethers.toUtf8Bytes("documento_falso"));
  const resultado = await contrato.verificarCertificado(hashFalso);
  expect(resultado.exists).to.equal(false);
});
```

Ambos tests pasan, confirmando que el contrato rechaza correctamente cualquier hash no registrado, independientemente de si se parece o no a un hash real.

---

## 9. Relación con Conceptos de Sistemas Distribuidos

| Concepto SD | Definición Técnica | Aplicación en el Proyecto | Dónde en el Código |
|-------------|-------------------|--------------------------|-------------------|
| **Descentralización** | Ausencia de autoridad central única; el control y los datos se distribuyen entre múltiples nodos sin punto único de fallo | El contrato reside en miles de nodos Ethereum; ningún actor individual (ni la universidad, ni Anthropic, ni nadie) puede modificar el estado del contrato unilateralmente | `AcademicCertification.sol` — el contrato, una vez desplegado, es inmutable |
| **Replicación** | Copia del estado del sistema en múltiples nodos para garantizar disponibilidad y tolerancia a fallos | Cada transacción que modifica el estado del contrato es replicada en todos los nodos de la red Ethereum. El estado es idéntico en todos los nodos (consistencia fuerte post-finalización) | `hardhat.config.js:22-25` (config de red) — en producción, los nodos Ethereum |
| **Consenso (PoS)** | Mecanismo mediante el cual los nodos distribuidos acuerdan el estado correcto del sistema | Ethereum usa Proof of Stake desde "The Merge" (septiembre 2022). Los validadores apuestan ETH como colateral para proponer y atestiguar bloques. Una transacción es definitiva cuando ≥ 2/3 de los validadores la han atestiguado | Implícito en la red Ethereum; las transacciones enviadas por `emitirCertificado`, `firmarRecepcion`, etc. pasan por este proceso |
| **Tolerancia a Fallos** | El sistema continúa operando correctamente cuando algunos componentes fallan | La red Ethereum tolera que hasta ~1/3 de los validadores fallen (teorema CAP aplicado a blockchains). Si MetaMask falla, el usuario puede usar otro proveedor. Si un nodo RPC falla, ethers.js puede conmutar a otro | `Web3Context.jsx:85-93` — manejo de errores de conexión |
| **Inmutabilidad** | Los datos una vez escritos no pueden ser modificados ni eliminados | Una vez que `emitirCertificado` es incluido en un bloque con suficientes confirmaciones, los datos son permanentes. La revocación usa flags, no eliminación, preservando el historial completo | `AcademicCertification.sol:215-229` — `revocarCertificado` solo cambia flags |
| **Transparencia** | Todo el estado y las transacciones son públicamente verificables | Cualquier persona puede consultar `verificarCertificado` sin autenticación. Todas las transacciones son visibles en Etherscan. El código fuente del contrato es verificable | `AcademicCertification.sol:251` — `external view` sin restricciones |
| **Disponibilidad** | El servicio está disponible cuando los usuarios lo necesitan | Las funciones `view` del contrato están disponibles 24/7 sin downtime planificado. La red Ethereum tiene uptime histórico > 99.99%. El frontend puede hostearse en IPFS para disponibilidad total | `AcademicCertification.sol:251-282, 291-297` — funciones view sin restricciones |
| **Seguridad Distribuida** | La seguridad no depende de un punto central sino de propiedades matemáticas y criptográficas distribuidas | El hash SHA-256 provee integridad del documento. Las firmas ECDSA de MetaMask autentican las transacciones. Los modifiers `onlyOwner` y `onlyEmisor` proveen autorización on-chain | `hashUtils.js:23`, `AcademicCertification.sol:84-96` |
| **No Repudio** | Una vez ejecutada una acción, el actor no puede negar haberla realizado | Cada transacción está firmada con la clave privada del emisor. Es matemáticamente imposible falsificar la firma ECDSA sin la clave. El evento `CertificadoEmitido` indexa la dirección del emisor | `AcademicCertification.sol:182` — `emit CertificadoEmitido(..., msg.sender)` |

---

## 10. Respuestas a Preguntas Teóricas

### Pregunta 1: ¿Cómo garantiza el sistema la autenticidad de un certificado?

El sistema garantiza la autenticidad mediante una cadena de tres mecanismos criptográficos encadenados que operan sin necesidad de confiar en ninguna autoridad central.

**Primer mecanismo — Hash SHA-256 del documento:** Antes de registrar un certificado, el sistema calcula el hash SHA-256 del archivo PDF original usando la Web Crypto API del navegador (`window.crypto.subtle.digest("SHA-256", arrayBuffer)`). Este hash de 256 bits actúa como "huella digital" del documento. La propiedad del efecto avalancha garantiza que cualquier modificación al archivo —incluso cambiar un solo bit— produce un hash completamente diferente. Por lo tanto, presentar el documento original y obtener el mismo hash es prueba matemática de que el archivo no fue alterado.

**Segundo mecanismo — Registro inmutable en blockchain:** El hash calculado se almacena en el contrato como clave del mapping `certificados[hashDocumento]`. Una vez que la transacción es incluida en un bloque y tiene suficientes confirmaciones, el registro es permanente e inmutable. Ni el emisor, ni la universidad, ni ningún actor externo puede modificar ese registro retroactivamente sin invalidar toda la cadena de bloques subsecuente, lo que requeriría controlar más del 50% del poder computacional de toda la red Ethereum (ataque del 51%), considerado inviable económicamente.

**Tercer mecanismo — Firma ECDSA del emisor autorizado:** La transacción de emisión está firmada con la clave privada de la wallet del emisor. El contrato verifica mediante el modifier `onlyEmisor` que la dirección que llama es una dirección autorizada. Es matemáticamente imposible firmar una transacción con la clave de otra persona sin poseerla. Adicionalmente, el campo `emisor: msg.sender` registra automáticamente la dirección del emisor, haciendo imposible negar la autoría.

El proceso de verificación es el inverso: el verificador presenta el documento, el sistema calcula su hash localmente (sin enviar el archivo a ningún servidor), y consulta el contrato con ese hash. Si el certificado existe y no está revocado, la autenticidad queda demostrada.

Esta cadena de garantías es más robusta que cualquier sistema centralizado porque: (1) no hay base de datos que hackear, (2) no hay administrador que pueda alterar registros, (3) la verificación no requiere contactar a la institución emisora, y (4) el sistema funciona incluso si la institución emisora deja de existir.

---

### Pregunta 2: ¿Por qué se usa blockchain en lugar de una base de datos centralizada?

La elección de blockchain sobre una base de datos relacional centralizada responde a los problemas estructurales que las BD clásicas tienen para el caso de uso de certificación académica.

**Problema 1 — Confianza en el custodio:** Una base de datos centralizada requiere confiar en que el administrador no alterará los registros. En Bolivia, esto es problemático dado el historial documentado de corrupción institucional. Un DBA con acceso root puede modificar un registro sin dejar rastro (especialmente si deshabilita los logs de auditoría temporalmente). En blockchain, la inmutabilidad es una propiedad matemática, no una política: modificar un bloque histórico requiere recalcular todos los bloques subsecuentes con más poder de cómputo que el resto de la red combinada.

**Problema 2 — Punto único de fallo:** Si el servidor central falla, es hackeado, o la institución cierra, todos los registros son inaccesibles o se pierden. Ethereum tiene uptime históricamente mayor al 99.99% y el estado está replicado en miles de nodos independientes distribuidos globalmente.

**Problema 3 — Verificación requiere intermediario:** Con una BD centralizada, un empleador que desea verificar un título debe contactar a la universidad, que puede estar cerrada por feriado, en huelga, o simplemente no tener incentivos para responder rápidamente. Con blockchain, la verificación es autónoma: el verificador consulta directamente el contrato, disponible 24/7, sin intermediarios y sin posibilidad de recibir respuestas falsas (el contrato ejecuta el mismo código siempre).

**Problema 4 — No repudio limitado:** En una BD centralizada, aunque existan logs, un atacante con acceso puede borrar o alterar los logs. En blockchain, los eventos emitidos (`CertificadoEmitido`, `EmisorAutorizado`) son parte de los recibos de transacción, que son parte del hash del bloque. Si alguien intentara alterar un log histórico, rompería el hash del bloque, lo que rompería el hash de todos los bloques subsecuentes, invalidando toda la cadena.

**Cuándo una BD sería mejor:** La BD centralizada gana en eficiencia de recursos (no requiere gas), velocidad de consulta, complejidad de queries, capacidad de corregir errores, y privacidad (datos no públicos). Para un sistema interno donde la institución ya es confiable por otros mecanismos, una BD con auditoría es suficiente. La blockchain agrega valor principalmente cuando la confianza entre las partes es limitada o cuando la verificación debe ser descentralizada y pública.

En este proyecto específico, la elección es blockchain porque el problema que se resuelve —verificación descentralizada ante posible corrupción institucional— es exactamente el caso de uso para el que fue diseñada.

---

### Pregunta 3: ¿Cómo funciona el sistema de roles y permisos en el contrato?

El sistema de control de acceso implementa un modelo jerárquico de dos niveles con lógica completamente on-chain, sin depender de servidores externos ni sistemas de autenticación tradicionales.

**Nivel 1 — Owner (la institución):** La dirección que despliega el contrato se convierte automáticamente en `owner` (línea `owner = msg.sender` en el constructor). El owner es el único actor que puede gestionar emisores: autorizarlos con `autorizarEmisor(address)` o revocarles permisos con `revocarEmisor(address)`. El modifier `onlyOwner` (líneas 84-87) protege ambas funciones: `require(msg.sender == owner, ...)`. Una característica importante es que el owner no puede auto-revocarse (`require(_emisor != owner)` en `revocarEmisor`), lo que garantiza que el sistema nunca quede sin administrador.

**Nivel 2 — Emisores autorizados (secretarías, facultades):** El mapping `emisoresAutorizados[address] => bool` almacena qué direcciones tienen permiso para emitir y revocar certificados. El constructor automáticamente registra al owner como primer emisor (`emisoresAutorizados[msg.sender] = true`), por lo que puede operar desde el primer momento. El modifier `onlyEmisor` (líneas 89-96) protege las funciones `emitirCertificado` y `revocarCertificado`.

**Nivel 3 — Estudiantes (verificación de identidad):** No hay un modifier específico, sino una verificación inline en `firmarRecepcion`: `require(msg.sender == cert.estudianteWallet, ...)`. Solo la wallet registrada como destinataria puede firmar su propio certificado. Cualquier intento de otra wallet produce un revert inmediato.

**Nivel 4 — Público (sin permisos):** Las funciones `view` (`verificarCertificado`, `obtenerCertificadosDeEstudiante`) son `external view` sin ningún modifier. Cualquier dirección, incluso sin saldo de ETH, puede consultar el contrato.

**Detección de roles en el frontend:** Al conectar la wallet, `Web3Context.jsx` detecta los roles consultando el contrato:
```javascript
const isOwner  = (await contrato.owner()).toLowerCase() === account.toLowerCase();
const isEmisor = await contrato.emisoresAutorizados(account);
```
Esto determina qué tabs son visibles en la UI: "Emitir" y "Revocar" solo aparecen si `isOwner || isEmisor`.

**Seguridad del modelo:** El control de acceso es imposible de eludir porque `msg.sender` es la dirección que firmó la transacción, verificada criptográficamente por la EVM antes de ejecutar el contrato. No hay parámetro que el llamador pueda falsificar para hacerse pasar por otra dirección.

---

### Pregunta 4: ¿Qué garantías ofrece el sistema ante intentos de doble emisión o modificación de certificados?

El sistema implementa múltiples capas de protección específicamente diseñadas para prevenir la emisión duplicada y cualquier forma de modificación de registros existentes.

**Garantía 1 — Unicidad por hash (prevención de doble emisión):** En `emitirCertificado`, el guard `require(certificados[_hashDocumento].fechaEmision == 0, "AcademicCertification: el certificado ya existe")` verifica que el hash no haya sido registrado previamente. Si el mismo documento ya tiene un registro (o si se intenta registrar un documento diferente que produce el mismo hash, aunque esto sea computacionalmente imposible con SHA-256), la transacción revierte y no se realiza ningún cambio de estado. El gas del revert es devuelto. Esto garantiza que cada documento puede ser registrado exactamente una vez.

**Garantía 2 — Inmutabilidad de los campos registrados:** Una vez que el struct `Certificate` es escrito en el mapping con `certificados[hash] = Certificate({...})`, ninguna función del contrato modifica los campos `codigoCertificado`, `nombreEstudiante`, `estudianteWallet`, `emisor`, o `fechaEmision`. Solo `revocado`, `motivoRevocacion`, `firmadoPorEstudiante` y `fechaFirmaEstudiante` pueden cambiar, y solo en condiciones específicas (revocar requiere que no esté revocado; firmar requiere que no esté firmado ni revocado).

**Garantía 3 — Storage de Solidity es determinista y atómico:** El storage del contrato en la EVM es un mapa de 32 bytes a 32 bytes permanente. Las operaciones de escritura (`SSTORE`) son atómicas: o se ejecutan completamente o no se ejecutan (en caso de revert). No hay estados intermedios observables.

**Garantía 4 — Historial de revocación preservado:** La revocación solo activa un flag (`cert.revocado = true`) sin eliminar ningún dato. Esto significa que incluso después de revocar, todos los datos originales del certificado (quién lo emitió, cuándo, para quién) permanecen accesibles. No es posible "borrar el rastro" de haber emitido un certificado fraudulento.

**Garantía 5 — Prueba de no-modificación en NFT:** En `CertificadoNFT.sol`, el guard `require(hashAToken[hashDocumento] == 0, "CertificadoNFT: hash ya registrado")` cumple la misma función: previene tokenizar el mismo documento dos veces.

**Implicaciones legales:** Estas garantías técnicas tienen correlatos legales importantes. Si un emisor registra un certificado y luego niega haberlo emitido, el evento `CertificadoEmitido` con su dirección indexada sirve como evidencia criptográfica indisputable. Si un estudiante intenta argumentar que no recibió su certificado, su firma en `firmarRecepcion` con su propia wallet es prueba de lo contrario.

---

### Pregunta 5: ¿Cómo se relaciona el proyecto con los conceptos de sistemas distribuidos P2P y consenso?

Ethereum es fundamentalmente una red P2P (peer-to-peer) donde ningún nodo tiene autoridad especial sobre los demás, y el consenso es el mecanismo que permite a esta red acordar un estado compartido sin coordinación centralizada.

**Arquitectura P2P de Ethereum:** Cuando el emisor envía la transacción de `emitirCertificado`, MetaMask la transmite a través del protocolo `devp2p` de Ethereum a los nodos de su red. Cada nodo la valida (firma válida, suficiente gas, no inválida) y la propaga a sus pares. La transacción llega a la mempool (pool de transacciones pendientes) de un validador. Este proceso es completamente descentralizado: no hay un servidor central al que se envía la transacción.

**Proof of Stake (PoS) como mecanismo de consenso:** Desde "The Merge" (septiembre 2022), Ethereum usa PoS. Los validadores depositan 32 ETH como colateral (stake) para participar. En cada slot (12 segundos), un validador es elegido aleatoriamente (pero ponderado por su stake) como proponente del siguiente bloque. El proponente selecciona transacciones de su mempool, ejecuta la EVM localmente, y propone el bloque con el nuevo estado del mundo. Un comité de ~512 validadores atestigua (vota) que el bloque es válido. Cuando ≥ 2/3 del comité atestan, el bloque es finalizado.

**Cómo impacta esto al proyecto:** Cuando el emisor realiza la transacción, espera que sea incluida en un bloque (1-2 bloques, ~12-24 segundos). La función `await tx.wait()` en los scripts de despliegue y el `await tx.wait()` implícito en ethers.js esperan precisamente esta inclusión. El certificado está en blockchain una vez que la transacción tiene suficientes confirmaciones.

**Finality (finalidad):** En PoS de Ethereum, la finalidad económica se logra en ~2 épocas (12.8 minutos). Después de ese tiempo, revertir la transacción requeriría quemar más del 33% de todo el ETH en stake (actualmente más de USD 30 mil millones), lo que hace que la modificación sea "computacionalmente imposible" en términos prácticos.

**Red Hardhat local como simulación:** Para desarrollo, Hardhat Network simula una red Ethereum local con un solo "nodo" en memoria. El consenso es instantáneo (cada `sendTransaction` incluye la transacción en un bloque inmediatamente). Esto permite ejecutar los 55 tests en ~1 segundo. La misma lógica de contrato que pasa en Hardhat funcionará en la red pública real, solo que con latencia real de ~12 segundos por bloque.

**Relación con CAP Theorem:** Las blockchains públicas priorizan Consistencia y Tolerancia a Particiones sobre Disponibilidad (en el sentido estricto del CAP). Durante una partición de red, los nodos no aceptan transacciones nuevas hasta que la red se reconcilia, garantizando que todos los nodos converjan al mismo estado. Para el caso de uso de certificados, la consistencia es más importante que la disponibilidad inmediata.

---

## 11. Limitaciones y Trabajo Futuro

### 11.1 Almacenamiento del PDF Completo en IPFS

**Limitación actual:** El sistema registra el hash SHA-256 del documento, pero el PDF original no se almacena on-chain (esto sería prohibitivamente caro: 1 KB en Ethereum Mainnet cuesta ~640,000 gas ≈ USD 50+). La verificación requiere que el verificador tenga el archivo original.

**Solución propuesta:** Integrar IPFS (InterPlanetary File System) para subir el PDF al sistema de archivos descentralizado. El CID resultante se almacenaría en el contrato junto al hash SHA-256. El flujo sería:
1. Emisor sube el PDF a IPFS → obtiene CID `"QmAbCd..."`.
2. El CID se almacena en el struct del certificado.
3. Verificador puede descargar el PDF desde `ipfs://QmAbCd...` y verificar que su SHA-256 coincida.

Esto permitiría verificación sin necesidad del archivo original, solo con el tokenId o el hash.

### 11.2 Panel de Administración del Owner

**Limitación actual:** El owner no tiene un panel dedicado en la UI para gestionar emisores. La autorización se hace via `autorizarEmisor` disponible en el hook, pero no hay componente visual específico.

**Solución propuesta:** Crear un tab "⚙️ Admin" visible solo para el owner con:
- Lista de emisores activos (consultando eventos `EmisorAutorizado`/`EmisorRevocado`).
- Formulario para autorizar nuevos emisores con validación de dirección.
- Botón de revocación por emisor.
- Estadísticas: total de certificados emitidos, revocados, firmados.

### 11.3 Code Splitting para jsPDF

**Limitación actual:** jsPDF añade ~200KB al bundle principal (incluye html2canvas). Esto incrementa el tiempo de carga inicial de la DApp.

**Solución propuesta:** Usar importación dinámica de React (code splitting):
```javascript
const { descargarCertificado } = await import("../../utils/pdfGenerator");
```
Esto descarga jsPDF solo cuando el usuario hace clic en "Descargar PDF", sin afectar la carga inicial.

### 11.4 Despliegue en Mainnet con Análisis de Costos de Gas

**Limitación actual:** El proyecto solo fue probado en Hardhat local y Sepolia testnet. En Mainnet, cada operación tiene costo real en ETH.

**Estimación de costos aproximados (a precio de gas de 15 gwei, ETH = USD 3,000):**

| Función | Gas estimado | Costo aprox. (USD) |
|---------|-------------|-------------------|
| `emitirCertificado` | ~120,000 gas | ~USD 5.40 |
| `revocarCertificado` | ~45,000 gas | ~USD 2.03 |
| `firmarRecepcion` | ~50,000 gas | ~USD 2.25 |
| `mintCertificado` (NFT) | ~180,000 gas | ~USD 8.10 |
| `verificarCertificado` (view) | 0 gas | USD 0.00 |

Para una universidad boliviana con ~500 graduados/año, el costo anual de emisión sería ~USD 2,700, asumible para una institución. Las verificaciones (el caso de uso más frecuente) son gratuitas.

**Optimizaciones posibles:** Batch minting (múltiples certificados en una transacción), Layer 2 como Polygon o Arbitrum (costos 10-100x menores), o Optimism (EVM-compatible, costos < USD 0.10 por transacción).

### 11.5 Integración con Sistemas Universitarios Bolivianos

**Limitación actual:** El sistema opera de forma independiente sin integración con sistemas existentes.

**Trabajo futuro:**
- API REST que envuelva las funciones del contrato para que sistemas universitarios legacy puedan emitir certificados sin exponer las wallets.
- Integración con el SINAB (Sistema de Información Nacional de Admisión a Bachillerato) para verificación de prerequisitos.
- Integración con el sistema del SEFO (Servicio de Fo educación) del Ministerio de Educación.
- SDK JavaScript/Python para que otras instituciones puedan integrar el sistema en sus propias plataformas.
- Soporte multi-institución: múltiples universidades compartiendo el contrato con sus propios namespaces de emisores.

---

## 12. Conclusiones

Este proyecto implementó un sistema completo y funcional de certificación académica sobre la red Ethereum, demostrando la viabilidad técnica de aplicar tecnología blockchain para resolver el problema real y documentado de falsificación de documentos académicos en Bolivia.

**Desde el punto de vista técnico**, el sistema integra con éxito múltiples capas tecnológicas: contratos Solidity 0.8.28 con OpenZeppelin v5, un framework de testing con 55 pruebas automatizadas al 100% de cobertura, una DApp React 18 con Vite que interactúa con MetaMask via ethers.js v6, y una extensión NFT ERC-721 que representa cada certificado como un token no fungible. El único obstáculo técnico relevante —la incompatibilidad entre OZ 5.6.1 y el target de EVM París por el opcode `mcopy`— fue diagnosticado y resuelto mediante dos cambios de configuración bien fundamentados.

**Desde el punto de vista de sistemas distribuidos**, el proyecto materializa en código ejecutable los conceptos teóricos del curso: la inmutabilidad se implementa mediante el modelo de storage de la EVM y el diseño de flag de revocación; el no repudio se garantiza con las firmas ECDSA de cada transacción; la descentralización se logra eliminando cualquier componente con servidor propio; la tolerancia a fallos es heredada de la infraestructura Ethereum; y el consenso PoS es el mecanismo que hace que todos los nodos de la red acepten los registros emitidos.

**Desde el punto de vista del impacto potencial**, el sistema demuestra que la verificación de autenticidad puede ser accesible a cualquier persona en cualquier parte del mundo, sin requerir contactar a la institución emisora, sin riesgo de respuestas falsas, y sin dependencia de la disponibilidad de ningún servidor central. Para un contexto boliviano donde la confianza institucional es limitada y los mecanismos de verificación existentes son deficientes, esta solución ofrece garantías matemáticas en lugar de confianza social.

**Lección clave:** La blockchain no es la solución correcta para todos los problemas, pero para el problema específico de la verificación descentralizada de documentos ante posible corrupción institucional, sus propiedades fundamentales —inmutabilidad, transparencia, no repudio, y descentralización— la convierten en la herramienta más adecuada disponible hoy.

---

## Anexos

### Anexo A: Estructura del Proyecto

```
SistemaDeCertificacionAcademica/
│
├── INFORME_TECNICO.md          ← Este documento
├── DEMO.md                     ← Guía de demostración local (6 escenarios)
├── SEPOLIA.md                  ← Guía de despliegue en Sepolia testnet
├── README.md
│
├── blockchain/                 ← Capa de contratos inteligentes
│   ├── hardhat.config.js       ← Configuración: Solidity 0.8.28, EVM Cancun
│   ├── package.json            ← hardhat@2.28.6, @openzeppelin/contracts@5.6.1
│   ├── .env                    ← PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
│   │
│   ├── contracts/
│   │   ├── AcademicCertification.sol   ← Contrato principal de certificados
│   │   └── CertificadoNFT.sol          ← Extensión ERC-721 NFT
│   │
│   ├── scripts/
│   │   ├── deploy.js            ← Despliegue de AcademicCertification
│   │   ├── deployLocal.js       ← Despliegue local + autorización + datos de prueba
│   │   └── deployNFT.js         ← Despliegue de CertificadoNFT + mint de prueba
│   │
│   ├── test/
│   │   ├── AcademicCertification.test.js  ← 33 tests del contrato principal
│   │   └── CertificadoNFT.test.js         ← 22 tests del contrato NFT
│   │
│   ├── artifacts/               ← ABIs compilados (auto-generado por Hardhat)
│   └── cache/                   ← Cache de compilación (auto-generado)
│
└── frontend/                    ← Capa de presentación (DApp React)
    ├── index.html
    ├── package.json             ← react@18, vite@6, ethers, jspdf
    ├── vite.config.js
    ├── eslint.config.js
    │
    └── src/
        ├── main.jsx             ← Entry point de React
        ├── App.jsx              ← Shell: tabs + routing de componentes
        ├── App.css              ← Sistema de diseño: variables CSS, clases globales
        ├── index.css            ← Reset y estilos base
        │
        ├── context/
        │   └── Web3Context.jsx  ← Estado global: wallet, roles, contrato
        │
        ├── hooks/
        │   └── useContract.js   ← Todas las llamadas al contrato + manejo de errores
        │
        ├── utils/
        │   ├── hashUtils.js     ← SHA-256 via Web Crypto API + formatHashDisplay
        │   └── pdfGenerator.js  ← Generación de PDF con jsPDF (diseño A4)
        │
        ├── contracts/           ← ABIs exportados por los scripts de despliegue
        │   ├── AcademicCertification.json  ← { address, abi }
        │   └── CertificadoNFT.json         ← { address, abi }
        │
        ├── assets/
        │   └── react.svg
        │
        └── components/
            ├── Layout/
            │   └── Navbar.jsx               ← Logo, estado conexión, botón conectar
            ├── Emitir/
            │   └── EmitirCertificado.jsx    ← Formulario de emisión + descarga PDF
            ├── Verificar/
            │   └── VerificarCertificado.jsx ← Verificación por PDF o hash
            ├── Revocar/
            │   └── RevocarCertificado.jsx   ← Revocación con motivo
            ├── Historial/
            │   └── HistorialEstudiante.jsx  ← Historial por wallet
            └── Firmar/
                └── FirmarRecepcion.jsx      ← Firma digital del estudiante
```

### Anexo B: Comandos de Referencia Rápida

**Blockchain (ejecutar desde `blockchain/`):**
```bash
# Instalar dependencias
npm install

# Compilar contratos
npx hardhat compile

# Ejecutar todos los tests (55)
npx hardhat test

# Ejecutar tests de un contrato específico
npx hardhat test test/AcademicCertification.test.js
npx hardhat test test/CertificadoNFT.test.js

# Iniciar nodo local (mantener en terminal separada)
npx hardhat node

# Desplegar en red local
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/deployLocal.js --network localhost
npx hardhat run scripts/deployNFT.js --network localhost

# Desplegar en Sepolia (requiere .env configurado)
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/deployNFT.js --network sepolia

# Ver cuentas de la red local
npx hardhat accounts --network localhost
```

**Frontend (ejecutar desde `frontend/`):**
```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con HMR
npm run dev

# Build de producción
npm run build

# Preview del build de producción
npm run preview

# Linting
npm run lint
```

**Flujo completo para demo local:**
```bash
# Terminal 1: Nodo Ethereum local
cd blockchain && npx hardhat node

# Terminal 2: Desplegar contratos
cd blockchain && npx hardhat run scripts/deployLocal.js --network localhost

# Terminal 3: Frontend
cd frontend && npm run dev
# Abrir http://localhost:5173
```

**Variables de entorno requeridas (`blockchain/.env`):**
```env
PRIVATE_KEY=0x...              # Clave privada de la cuenta de despliegue
SEPOLIA_RPC_URL=https://...    # URL del nodo RPC de Sepolia (Infura/Alchemy)
ETHERSCAN_API_KEY=...          # Para verificación del código fuente (opcional)
```

### Anexo C: Tabla de Contratos Desplegados

| Red | Contrato | Dirección | Bloque de Despliegue | Fecha |
|-----|---------|-----------|---------------------|-------|
| Hardhat Local | AcademicCertification | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | 1 | — |
| Hardhat Local | CertificadoNFT | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | 2 | — |
| Sepolia Testnet | AcademicCertification | *(pendiente de despliegue)* | — | — |
| Sepolia Testnet | CertificadoNFT | *(pendiente de despliegue)* | — | — |
| Ethereum Mainnet | AcademicCertification | *(fuera de alcance)* | — | — |

> **Nota:** Las direcciones en Hardhat local son deterministas: el deployer (accounts[0]) con nonce=0 siempre produce `0x5FbDB...` para el primer contrato y `0xe7f17...` para el segundo, independientemente de cuántas veces se reinicie el nodo. Esto simplifica la configuración del entorno de desarrollo.

> Para completar la tabla de Sepolia, ejecutar los scripts de despliegue con el flag `--network sepolia` y registrar las direcciones devueltas. Los contratos quedarán verificables públicamente en [sepolia.etherscan.io](https://sepolia.etherscan.io).

---

*Informe generado para la Práctica 6 de Sistemas Distribuidos — 7mo Semestre*  
*Sistema de Certificación Académica Blockchain (CertChain)*  
*Junio 2026*
