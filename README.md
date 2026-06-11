# Sistema de Certificación Académica — DApp en Ethereum

DApp descentralizada para la emisión, verificación y gestión de certificados académicos sobre la red Ethereum, desarrollada como práctica de Sistemas Distribuidos.

## Descripción

El sistema permite que una institución académica emita certificados inmutables en la blockchain. Cualquier persona puede verificar la autenticidad de un certificado consultando el contrato inteligente, sin depender de una autoridad central. Los certificados pueden exportarse como PDF desde el frontend.

## Estructura del proyecto

```
SistemaDeCertificacionAcademica/
├── blockchain/                  # Proyecto Hardhat (Solidity)
│   ├── contracts/               # Contratos inteligentes (.sol)
│   ├── scripts/                 # Scripts de despliegue
│   ├── test/                    # Tests del contrato
│   ├── hardhat.config.js        # Configuración de redes
│   ├── .env.example             # Variables de entorno requeridas
│   └── package.json
├── frontend/                    # Proyecto React + Vite
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Tecnologías

| Capa        | Tecnología                              |
|-------------|-----------------------------------------|
| Smart Contract | Solidity 0.8.24                      |
| Framework BC | Hardhat + hardhat-toolbox             |
| Testnet      | Sepolia (Ethereum)                     |
| Frontend     | React 18 + Vite                        |
| Web3         | ethers.js v6                           |
| PDF          | jsPDF                                  |

## Configuración inicial

### 1. Blockchain

```bash
cd blockchain
cp .env.example .env
# Editar .env con tus claves
npm install
```

Variables requeridas en `blockchain/.env`:

```
PRIVATE_KEY=<clave privada de tu wallet>
SEPOLIA_RPC_URL=<URL RPC de Sepolia (Alchemy o Infura)>
ETHERSCAN_API_KEY=<clave de Etherscan para verificación>
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Comandos útiles

```bash
# Iniciar nodo local
cd blockchain && npx hardhat node

# Compilar contratos
cd blockchain && npx hardhat compile

# Ejecutar tests
cd blockchain && npx hardhat test

# Desplegar en red local
cd blockchain && npx hardhat run scripts/deploy.js --network localhost

# Desplegar en Sepolia
cd blockchain && npx hardhat run scripts/deploy.js --network sepolia

# Iniciar frontend
cd frontend && npm run dev
```

## Redes soportadas

- **localhost** — `http://127.0.0.1:8545` (chainId 31337) — nodo Hardhat local
- **sepolia** — Ethereum Sepolia testnet (chainId 11155111)

## Licencia

MIT
