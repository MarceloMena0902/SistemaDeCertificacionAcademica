// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CertificadoNFT
 * @author Sistema de Certificación Académica
 * @notice Contrato ERC-721 que representa cada certificado académico como un NFT único.
 *         Cada token está vinculado al hash SHA-256 del documento físico del certificado,
 *         relacionando la representación on-chain con el documento original off-chain.
 *
 * @dev Hereda de ERC721URIStorage para almacenar un URI de metadata por token
 *      (apuntando a un JSON en IPFS) y de Ownable para el control de acceso.
 *
 * Flujo de metadata (JSON que debe subirse a IPFS antes de mintear):
 * {
 *   "name": "Certificado Académico #<tokenId>",
 *   "description": "Certificado verificado en blockchain",
 *   "estudiante": "<nombreEstudiante>",
 *   "carrera": "<carrera>",
 *   "universidad": "Universidad Boliviana",
 *   "fecha": "<fechaEmision>",
 *   "hash": "<hashDocumento>"
 * }
 * El tokenURI que se pasa a mintCertificado debe ser: "ipfs://<CID>"
 * El contrato antepone "ipfs://" automáticamente si se usa _baseURI(),
 * pero también acepta URIs completos en setTokenURI para mayor flexibilidad.
 */
contract CertificadoNFT is ERC721URIStorage, Ownable {

    // ─────────────────────────────────────────────────────────────────────────
    // State variables
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Relaciona cada tokenId con el hash SHA-256 del documento.
    mapping(uint256 => bytes32) public tokenAHash;

    /// @notice Relación inversa: hash del documento → tokenId.
    /// @dev El valor 0 indica que el hash no está registrado
    ///      (tokenIds válidos empiezan en 1).
    mapping(bytes32 => uint256) public hashAToken;

    /// @notice Indica si una dirección está autorizada para mintear NFTs.
    mapping(address => bool) public emisoresAutorizados;

    /// @dev Contador interno de tokens; se incrementa antes de cada mint.
    ///      El primer token tiene ID 1, por lo que el ID 0 nunca es válido.
    uint256 private _tokenIdCounter;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitido al mintear un nuevo certificado NFT.
    event CertificadoMinted(
        uint256 indexed tokenId,
        bytes32 indexed hashDocumento,
        address indexed estudianteWallet
    );

    /// @notice Emitido al autorizar un nuevo emisor.
    event EmisorAutorizado(address indexed emisor);

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Restringe la ejecución a emisores autorizados.
    modifier onlyEmisor() {
        require(
            emisoresAutorizados[msg.sender],
            "CertificadoNFT: solo un emisor autorizado puede ejecutar esta funcion"
        );
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Despliega el contrato.
     *         En OpenZeppelin v5, Ownable requiere pasar el owner inicial.
     * @dev El deployer queda como owner; el contador arranca en 0.
     */
    constructor()
        ERC721("CertificadoAcademico", "CERT")
        Ownable(msg.sender)
    {
        _tokenIdCounter = 0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gestión de emisores
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Autoriza a una dirección para mintear certificados NFT.
     * @dev Solo el owner puede llamar esta función.
     * @param emisor Dirección a autorizar.
     */
    function autorizarEmisor(address emisor) external onlyOwner {
        require(emisor != address(0), "CertificadoNFT: direccion invalida");
        require(!emisoresAutorizados[emisor], "CertificadoNFT: emisor ya autorizado");
        emisoresAutorizados[emisor] = true;
        emit EmisorAutorizado(emisor);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mint
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Mintea un nuevo NFT de certificado académico.
     * @dev Solo emisores autorizados pueden llamar esta función.
     *      El hash del documento debe ser único en el contrato.
     *      El tokenURI debe apuntar al JSON de metadata en IPFS.
     *
     * @param estudianteWallet Dirección del estudiante que recibirá el NFT.
     * @param hashDocumento    Hash SHA-256 (bytes32) del documento original.
     * @param uri              URI de la metadata del token (ej: "ipfs://<CID>").
     */
    function mintCertificado(
        address estudianteWallet,
        bytes32 hashDocumento,
        string memory uri
    ) external onlyEmisor {
        require(estudianteWallet != address(0),   "CertificadoNFT: wallet invalida");
        require(hashDocumento != bytes32(0),      "CertificadoNFT: hash invalido");
        require(bytes(uri).length > 0,            "CertificadoNFT: URI vacio");
        require(
            hashAToken[hashDocumento] == 0,
            "CertificadoNFT: hash ya registrado"
        );

        // Incrementar antes de usar para que el primer tokenId sea 1
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        // Mintear el NFT al estudiante
        _mint(estudianteWallet, newTokenId);

        // Guardar la metadata URI en el storage del token
        _setTokenURI(newTokenId, uri);

        // Registrar la relación bidireccional tokenId ↔ hash
        tokenAHash[newTokenId]      = hashDocumento;
        hashAToken[hashDocumento]   = newTokenId;

        emit CertificadoMinted(newTokenId, hashDocumento, estudianteWallet);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Consultas (view)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Verifica si un documento está registrado como NFT y quién es su dueño actual.
     * @dev Permite verificar la autenticidad de un certificado sin conocer el tokenId.
     *      Si el NFT fue transferido, `owner` reflejará el dueño actual (no el estudiante original).
     *
     * @param hashDocumento Hash SHA-256 del documento a verificar.
     * @return exists  true si el certificado está registrado como NFT.
     * @return tokenId ID del token (0 si no existe).
     * @return owner   Dirección del dueño actual del NFT (address(0) si no existe).
     */
    function verificarPorHash(bytes32 hashDocumento)
        external
        view
        returns (bool exists, uint256 tokenId, address owner)
    {
        tokenId = hashAToken[hashDocumento];
        exists  = tokenId != 0;
        owner   = exists ? ownerOf(tokenId) : address(0);
    }

    /**
     * @notice Retorna el hash del documento asociado a un tokenId dado.
     * @dev Retorna bytes32(0) si el tokenId no tiene hash registrado.
     * @param tokenId ID del token a consultar.
     * @return Hash SHA-256 del documento original (bytes32(0) si no existe).
     */
    function obtenerHashDeToken(uint256 tokenId)
        external
        view
        returns (bytes32)
    {
        return tokenAHash[tokenId];
    }

    /**
     * @notice Retorna el total de certificados NFT emitidos hasta el momento.
     * @return Número de tokens minteados.
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Overrides
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice URI base para los tokens.
     * @dev Los tokenURIs completos se almacenan directamente con _setTokenURI,
     *      por lo que esta función retorna una cadena vacía (ERC721URIStorage
     *      concatena _baseURI() + tokenURI almacenado; al ser vacío, el URI
     *      completo que se pasó en mint es el que prevalece).
     */
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }
}
