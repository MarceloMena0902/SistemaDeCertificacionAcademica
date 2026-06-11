// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AcademicCertification
 * @author Sistema de Certificación Académica
 * @notice Contrato para emitir, verificar y revocar certificados académicos en Ethereum.
 * @dev El dueño (universidad) autoriza emisores. Los certificados se identifican por el
 *      hash SHA-256 del documento original, garantizando inmutabilidad y trazabilidad.
 */
contract AcademicCertification {
    // ─────────────────────────────────────────────────────────────────────────
    // Variables de estado
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Dirección del dueño del contrato (la institución académica).
    address public owner;

    /// @notice Indica si una dirección está autorizada para emitir certificados.
    mapping(address => bool) public emisoresAutorizados;

    /// @notice Almacena cada certificado indexado por el hash del documento.
    mapping(bytes32 => Certificate) public certificados;

    /// @notice Historial de hashes de certificados emitidos a cada estudiante.
    mapping(address => bytes32[]) public certificadosPorEstudiante;

    // ─────────────────────────────────────────────────────────────────────────
    // Struct
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Representa un certificado académico registrado en la blockchain.
     * @dev El campo `revocado` invalida el certificado sin eliminarlo del registro.
     */
    struct Certificate {
        string  codigoCertificado;
        string  nombreEstudiante;
        address estudianteWallet;
        address emisor;
        uint256 fechaEmision;
        bool    revocado;
        string  motivoRevocacion;
        bool    firmadoPorEstudiante;
        uint256 fechaFirmaEstudiante;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Eventos
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Se emite cuando un emisor registra un nuevo certificado.
    event CertificadoEmitido(
        bytes32 indexed hashDocumento,
        string          codigo,
        address indexed estudiante,
        address indexed emisor
    );

    /// @notice Se emite cuando un emisor revoca un certificado existente.
    event CertificadoRevocado(
        bytes32 indexed hashDocumento,
        string          motivo,
        address indexed emisor
    );

    /// @notice Se emite cuando el estudiante firma la recepción de su certificado.
    event CertificadoFirmado(
        bytes32 indexed hashDocumento,
        address indexed estudiante
    );

    /// @notice Se emite cuando el owner autoriza a un nuevo emisor.
    event EmisorAutorizado(address indexed emisor);

    /// @notice Se emite cuando el owner revoca los permisos de un emisor.
    event EmisorRevocado(address indexed emisor);

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Restringe la ejecución al dueño del contrato.
    modifier onlyOwner() {
        require(msg.sender == owner, "AcademicCertification: solo el owner puede ejecutar esta funcion");
        _;
    }

    /// @dev Restringe la ejecución a emisores autorizados por el owner.
    modifier onlyEmisor() {
        require(
            emisoresAutorizados[msg.sender],
            "AcademicCertification: solo un emisor autorizado puede ejecutar esta funcion"
        );
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Despliega el contrato y establece al deployer como owner y primer emisor autorizado.
     * @dev El owner es automáticamente un emisor para poder emitir certificados de inmediato.
     */
    constructor() {
        owner = msg.sender;
        emisoresAutorizados[msg.sender] = true;
        emit EmisorAutorizado(msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gestión de emisores
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Autoriza a una dirección para emitir certificados.
     * @dev Solo el owner puede llamar esta función. No tiene efecto si `_emisor` ya está autorizado.
     * @param _emisor Dirección de la wallet que se desea autorizar como emisor.
     */
    function autorizarEmisor(address _emisor) external onlyOwner {
        require(_emisor != address(0), "AcademicCertification: direccion invalida");
        require(!emisoresAutorizados[_emisor], "AcademicCertification: el emisor ya esta autorizado");
        emisoresAutorizados[_emisor] = true;
        emit EmisorAutorizado(_emisor);
    }

    /**
     * @notice Revoca los permisos de un emisor para que no pueda emitir más certificados.
     * @dev Solo el owner puede llamar esta función. El owner no puede revocarse a sí mismo.
     * @param _emisor Dirección del emisor cuyo permiso se desea revocar.
     */
    function revocarEmisor(address _emisor) external onlyOwner {
        require(_emisor != owner, "AcademicCertification: no se puede revocar al owner");
        require(emisoresAutorizados[_emisor], "AcademicCertification: el emisor no esta autorizado");
        emisoresAutorizados[_emisor] = false;
        emit EmisorRevocado(_emisor);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ciclo de vida del certificado
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Registra un nuevo certificado académico en la blockchain.
     * @dev El `_hashDocumento` debe ser el SHA-256 del PDF original, calculado off-chain.
     *      Revierte si el hash ya fue registrado previamente.
     * @param _hashDocumento Hash SHA-256 (bytes32) del documento PDF del certificado.
     * @param _codigo        Código único del certificado (ej. "CERT-2024-001").
     * @param _nombre        Nombre completo del estudiante tal como aparece en el certificado.
     * @param _estudianteWallet Dirección de la wallet del estudiante propietario del certificado.
     */
    function emitirCertificado(
        bytes32 _hashDocumento,
        string  calldata _codigo,
        string  calldata _nombre,
        address _estudianteWallet
    ) external onlyEmisor {
        require(_hashDocumento != bytes32(0), "AcademicCertification: hash invalido");
        require(bytes(_codigo).length > 0,    "AcademicCertification: codigo vacio");
        require(bytes(_nombre).length > 0,    "AcademicCertification: nombre vacio");
        require(_estudianteWallet != address(0), "AcademicCertification: wallet del estudiante invalida");
        require(
            certificados[_hashDocumento].fechaEmision == 0,
            "AcademicCertification: el certificado ya existe"
        );

        certificados[_hashDocumento] = Certificate({
            codigoCertificado:    _codigo,
            nombreEstudiante:     _nombre,
            estudianteWallet:     _estudianteWallet,
            emisor:               msg.sender,
            fechaEmision:         block.timestamp,
            revocado:             false,
            motivoRevocacion:     "",
            firmadoPorEstudiante: false,
            fechaFirmaEstudiante: 0
        });

        certificadosPorEstudiante[_estudianteWallet].push(_hashDocumento);

        emit CertificadoEmitido(_hashDocumento, _codigo, _estudianteWallet, msg.sender);
    }

    /**
     * @notice Permite al estudiante firmar digitalmente la recepción de su certificado.
     * @dev Solo puede firmar la wallet registrada como `estudianteWallet` en el certificado.
     *      Un certificado revocado no puede ser firmado.
     * @param _hashDocumento Hash SHA-256 del certificado a firmar.
     */
    function firmarRecepcion(bytes32 _hashDocumento) external {
        Certificate storage cert = certificados[_hashDocumento];

        require(cert.fechaEmision != 0,            "AcademicCertification: el certificado no existe");
        require(!cert.revocado,                    "AcademicCertification: el certificado fue revocado");
        require(!cert.firmadoPorEstudiante,        "AcademicCertification: el certificado ya fue firmado");
        require(
            msg.sender == cert.estudianteWallet,
            "AcademicCertification: solo el estudiante propietario puede firmar"
        );

        cert.firmadoPorEstudiante = true;
        cert.fechaFirmaEstudiante = block.timestamp;

        emit CertificadoFirmado(_hashDocumento, msg.sender);
    }

    /**
     * @notice Revoca un certificado emitido, dejando constancia del motivo en la blockchain.
     * @dev Solo emisores autorizados pueden revocar. El registro original se preserva;
     *      únicamente se activa el flag `revocado` y se almacena el motivo.
     * @param _hashDocumento Hash SHA-256 del certificado a revocar.
     * @param _motivo        Descripción del motivo de revocación (no puede estar vacío).
     */
    function revocarCertificado(
        bytes32 _hashDocumento,
        string  calldata _motivo
    ) external onlyEmisor {
        Certificate storage cert = certificados[_hashDocumento];

        require(cert.fechaEmision != 0, "AcademicCertification: el certificado no existe");
        require(!cert.revocado,         "AcademicCertification: el certificado ya fue revocado");
        require(bytes(_motivo).length > 0, "AcademicCertification: el motivo no puede estar vacio");

        cert.revocado          = true;
        cert.motivoRevocacion  = _motivo;

        emit CertificadoRevocado(_hashDocumento, _motivo, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Consultas (view)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Verifica y retorna todos los datos de un certificado dado su hash.
     * @dev Si el certificado no existe, `exists` será `false` y el resto de campos
     *      tendrán sus valores por defecto (strings vacíos, address(0), etc.).
     * @param _hashDocumento Hash SHA-256 del certificado a consultar.
     * @return codigoCertificado    Código del certificado.
     * @return nombreEstudiante     Nombre completo del estudiante.
     * @return estudianteWallet     Dirección de la wallet del estudiante.
     * @return emisor               Dirección de la wallet del emisor.
     * @return fechaEmision         Timestamp Unix de la emisión.
     * @return revocado             `true` si el certificado fue revocado.
     * @return motivoRevocacion     Motivo de revocación (vacío si no fue revocado).
     * @return firmadoPorEstudiante `true` si el estudiante firmó la recepción.
     * @return fechaFirmaEstudiante Timestamp Unix de la firma del estudiante (0 si no firmó).
     * @return exists               `true` si el certificado existe en el contrato.
     */
    function verificarCertificado(bytes32 _hashDocumento)
        external
        view
        returns (
            string  memory codigoCertificado,
            string  memory nombreEstudiante,
            address        estudianteWallet,
            address        emisor,
            uint256        fechaEmision,
            bool           revocado,
            string  memory motivoRevocacion,
            bool           firmadoPorEstudiante,
            uint256        fechaFirmaEstudiante,
            bool           exists
        )
    {
        Certificate storage cert = certificados[_hashDocumento];
        exists = cert.fechaEmision != 0;

        return (
            cert.codigoCertificado,
            cert.nombreEstudiante,
            cert.estudianteWallet,
            cert.emisor,
            cert.fechaEmision,
            cert.revocado,
            cert.motivoRevocacion,
            cert.firmadoPorEstudiante,
            cert.fechaFirmaEstudiante,
            exists
        );
    }

    /**
     * @notice Retorna todos los hashes de certificados asociados a un estudiante.
     * @dev El array puede contener hashes de certificados revocados. El llamador
     *      debe usar `verificarCertificado` para filtrar por estado si lo necesita.
     * @param _estudiante Dirección de la wallet del estudiante a consultar.
     * @return Array de hashes (bytes32) de los certificados del estudiante.
     */
    function obtenerCertificadosDeEstudiante(address _estudiante)
        external
        view
        returns (bytes32[] memory)
    {
        return certificadosPorEstudiante[_estudiante];
    }
}
