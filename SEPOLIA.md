# CertChain — Despliegue en Sepolia Testnet

Guía paso a paso para desplegar el contrato `AcademicCertification` en la red
de prueba pública Sepolia y conectar el frontend a la dirección real.

> **Sepolia** es la testnet oficial de Ethereum. Las transacciones son reales
> (confirmadas por validadores reales) pero el ETH no tiene valor económico.
> Es el entorno más cercano a producción sin arriesgar fondos reales.

---

## Advertencias de seguridad

> **NUNCA subas el archivo `.env` a git.**
> El `.gitignore` ya lo excluye, pero verifica con `git status` antes de cada commit.
> Una clave privada expuesta en un repositorio público puede ser detectada por bots
> en segundos y los fondos de la wallet pueden ser robados de forma irreversible.

> **Usa una wallet de prueba exclusiva para Sepolia.**
> Nunca reutilices la clave privada de tu wallet principal (mainnet).
> Crea una wallet nueva en MetaMask solo para desarrollo y testing.

---

## Requisitos previos

- Cuenta de MetaMask con una wallet de prueba (ver advertencia arriba)
- Cuenta en [Alchemy](https://alchemy.com) o [Infura](https://infura.io) para obtener un endpoint RPC
- Cuenta en [Etherscan](https://etherscan.io) para verificar el contrato (opcional pero recomendado)
- El repositorio clonado y las dependencias instaladas (`npm install` en `/blockchain`)

---

## Paso 1 — Obtener ETH de testnet (Sepolia faucet)

Necesitas ETH de Sepolia para pagar el gas del despliegue (~0.01–0.05 ETH).

Faucets disponibles (usar al menos uno):

| Faucet | URL | Requisito |
|---|---|---|
| Alchemy Sepolia Faucet | https://sepoliafaucet.com | Cuenta Alchemy |
| Chainlink Faucet | https://faucets.chain.link/sepolia | Cuenta GitHub |
| Infura Faucet | https://www.infura.io/faucet/sepolia | Cuenta Infura |
| PoW Faucet | https://sepolia-faucet.pk910.de | Minería en navegador |

1. Copiar la dirección pública de tu wallet de prueba de MetaMask.
2. Pegar la dirección en el faucet elegido y solicitar ETH.
3. Esperar 1–2 minutos; el ETH aparece en MetaMask cuando confirmas la red Sepolia.

Para verificar el saldo en Sepolia: https://sepolia.etherscan.io/address/TU_DIRECCION

---

## Paso 2 — Obtener URL RPC de Sepolia

### Opción A — Alchemy (recomendado)

1. Registrarse en https://alchemy.com
2. Panel → **Create App** → Network: **Ethereum Sepolia** → crear
3. En la app creada → **API Key** → copiar la URL HTTPS:
   ```
   https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
   ```

### Opción B — Infura

1. Registrarse en https://infura.io
2. Dashboard → **Create New Project** → seleccionar Ethereum
3. En el proyecto → Endpoints → **Sepolia** → copiar URL HTTPS:
   ```
   https://sepolia.infura.io/v3/TU_PROJECT_ID
   ```

---

## Paso 3 — Obtener API Key de Etherscan

Necesaria para verificar el código fuente del contrato (permite leer el ABI
directamente desde Etherscan y usar el contrato como "verified").

1. Registrarse en https://etherscan.io
2. Perfil → **API Keys** → **Add** → nombre: `CertChain`
3. Copiar el API Key generado.

---

## Paso 4 — Crear el archivo `.env`

```bash
cd blockchain
cp .env.example .env
```

Editar `blockchain/.env` con los valores reales:

```env
# Clave privada de la wallet de prueba (SIN el prefijo 0x)
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# URL RPC de Sepolia (Alchemy o Infura)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY_AQUI

# API Key de Etherscan para verificación del contrato
ETHERSCAN_API_KEY=TU_ETHERSCAN_API_KEY_AQUI
```

> La `PRIVATE_KEY` en el `.env` va **sin** el prefijo `0x`.
> `hardhat.config.js` la lee y agrega el prefijo internamente al construir el array de `accounts`.

Verificar que el `.env` no está siendo trackeado por git:

```bash
git status
# blockchain/.env NO debe aparecer en la lista
```

---

## Paso 5 — Compilar y desplegar en Sepolia

### Compilar el contrato

```bash
cd blockchain
npx hardhat compile
```

Salida esperada:
```
Compiled 1 Solidity file successfully (evm target: paris).
```

### Desplegar en Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

El script puede tardar 15–60 segundos (depende de la congestión de la red).

Salida esperada:
```
─────────────────────────────────────────────
 Desplegando AcademicCertification
─────────────────────────────────────────────

Deployer : 0xTU_WALLET_ADDRESS
Balance  : 0.XXX ETH

Desplegando contrato...

Contrato desplegado en : 0xNUEVA_DIRECCION_DEL_CONTRATO
Red                    : sepolia

✓ Archivo guardado en  : .../frontend/src/contracts/AcademicCertification.json
─────────────────────────────────────────────
 Despliegue completado exitosamente
─────────────────────────────────────────────
```

Anotar la dirección del contrato: `0xNUEVA_DIRECCION_DEL_CONTRATO`

Verificar en el explorador de bloques:
```
https://sepolia.etherscan.io/address/0xNUEVA_DIRECCION_DEL_CONTRATO
```

---

## Paso 6 — Verificar el contrato en Etherscan (opcional pero recomendado)

La verificación publica el código fuente del contrato en Etherscan,
permitiendo que cualquier persona audite la lógica y que las herramientas
puedan leer el ABI directamente sin el JSON local.

```bash
cd blockchain
npx hardhat verify --network sepolia 0xNUEVA_DIRECCION_DEL_CONTRATO
```

Salida esperada:
```
Successfully submitted source code for contract
contracts/AcademicCertification.sol:AcademicCertification
at 0xNUEVA_DIRECCION_DEL_CONTRATO for verification on the block explorer.
Waiting for verification result...
Successfully verified contract AcademicCertification on the block explorer.
https://sepolia.etherscan.io/address/0xNUEVA_DIRECCION_DEL_CONTRATO#code
```

Una vez verificado, en Etherscan aparece la pestaña **Contract** con el código
fuente y la posibilidad de interactuar con las funciones directamente desde la web.

---

## Paso 7 — Actualizar el frontend

El script `deploy.js` ya actualiza automáticamente
`frontend/src/contracts/AcademicCertification.json` con la nueva dirección y ABI.

Verificar el contenido del JSON generado:

```bash
# La dirección debe coincidir con la del despliegue en Sepolia
cat frontend/src/contracts/AcademicCertification.json | grep '"address"'
```

Reconstruir el frontend para producción:

```bash
cd frontend
npm run build
```

Para desarrollo local apuntando a Sepolia:

```bash
cd frontend
npm run dev
```

Abrir http://localhost:5173 → MetaMask debe estar en la red **Sepolia** →
conectar → los badges de rol aparecerán si la wallet conectada es el owner
o un emisor autorizado.

---

## Paso 8 — Configurar MetaMask para Sepolia

A diferencia de la red local, Sepolia **ya está preconfigurada en MetaMask**:

1. MetaMask → selector de red → **Mostrar redes de prueba** (activar en Configuración → Avanzado)
2. Seleccionar **Sepolia test network**
3. MetaMask usará automáticamente los endpoints RPC públicos de Ethereum Foundation.

El frontend detectará `chainId === 11155111` y mostrará los enlaces reales a
Etherscan Sepolia en los alerts de éxito tras emitir o revocar.

---

## Diferencias respecto a la red local

| Aspecto | Hardhat Local | Sepolia Testnet |
|---|---|---|
| **Confirmación de tx** | Instantánea (sin minado real) | 12–30 segundos |
| **ETH disponible** | 10 000 ETH gratis por cuenta | Solicitar en faucet (límite diario) |
| **Persistencia** | Se resetea al reiniciar el nodo | Permanente (mientras Sepolia exista) |
| **Etherscan** | No disponible | Disponible en sepolia.etherscan.io |
| **Verificación pública** | No | Sí — cualquiera puede ver el contrato |
| **Nodo propio** | Sí (Hardhat) | No (Alchemy/Infura como intermediario) |
| **Costo de gas** | 0 (ETH de prueba local) | 0 (ETH de Sepolia, sin valor real) |

---

## Autorizar emisores adicionales en Sepolia

Después del despliegue, el `owner` (la wallet del deployer) es el único emisor.
Para autorizar wallets adicionales como emisores en Sepolia:

**Opción A — Etherscan (si el contrato está verificado):**

1. Ir a `https://sepolia.etherscan.io/address/DIRECCION_CONTRATO#writeContract`
2. Conectar la wallet owner con MetaMask → **Connect to Web3**
3. Función `autorizarEmisor` → ingresar la dirección → **Write** → confirmar en MetaMask

**Opción B — Script:**

Crear `blockchain/scripts/autorizarEmisor.js`:

```js
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const direccionContrato = "0xNUEVA_DIRECCION_DEL_CONTRATO";
  const nuevEmisor = "0xDIRECCION_NUEVO_EMISOR";

  const AcademicCertification = await ethers.getContractFactory("AcademicCertification");
  const contrato = AcademicCertification.attach(direccionContrato);

  const tx = await contrato.connect(owner).autorizarEmisor(nuevEmisor);
  await tx.wait();
  console.log(`Emisor autorizado: ${nuevEmisor}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

```bash
npx hardhat run scripts/autorizarEmisor.js --network sepolia
```

**Opción C — Frontend:**

Conectar la cuenta owner → la función `autorizarEmisor` del hook `useContract`
puede llamarse directamente desde la consola del navegador mientras la wallet
owner está conectada, o implementando un panel de administración en la UI.

---

## Troubleshooting

**Error: "insufficient funds for gas"**
→ La wallet no tiene ETH de Sepolia. Solicitar en un faucet (Paso 1).

**Error: "nonce too low"**
→ MetaMask tiene el nonce desincronizado. MetaMask → Configuración → Avanzado →
**Limpiar datos de actividad y nonce** → volver a intentar.

**Error: "could not detect network"**
→ La URL RPC en `.env` es incorrecta o el servicio (Alchemy/Infura) está caído.
Verificar la URL y el estado del servicio.

**El frontend sigue mostrando la dirección de la red local**
→ El JSON en `frontend/src/contracts/AcademicCertification.json` no fue actualizado.
Verificar que el deploy en Sepolia terminó correctamente y relanzar `npm run dev`.

**Etherscan verification: "Already Verified"**
→ El contrato ya estaba verificado (posiblemente el bytecode coincide con otro deploy anterior).
No es un error; el contrato sigue siendo funcional.
