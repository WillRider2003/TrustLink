// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TrustLinkReputation
/// @notice Soulbound Token (SBT) de reputacion para vendedores informales.
///         Se acuña automaticamente cuando el contrato de Escrow confirma
///         una venta cerrada sin disputas. El token NO es transferible:
///         representa un historial de confianza que pertenece a la persona,
///         no a la wallet como activo negociable.
/// @dev Solo la direccion del contrato de Escrow (o el owner, en modo demo)
///      puede autorizar el minteo, evitando que cualquiera se autoemita reputacion.
contract TrustLinkReputation is ERC721, Ownable {
    /// @notice Contador simple de IDs de token (empieza en 1)
    uint256 private _nextTokenId = 1;

    /// @notice Direccion del contrato de Escrow autorizado a pedir minteos
    address public escrowContract;

    /// @notice Cantidad de ventas exitosas (sin disputa) por vendedor
    mapping(address => uint256) public ventasExitosas;

    /// @notice Score de reputacion 0-100 calculado off-chain (backend) y publicado aqui
    mapping(address => uint8) public score;

    /// @notice Compradores distintos que le han comprado a cada vendedor
    ///         (para que el backend calcule diversidad de contrapartes)
    mapping(address => mapping(address => bool)) public compradorHaComprado;
    mapping(address => uint256) public totalCompradoresDistintos;

    event ReputacionEmitida(address indexed vendedor, uint256 indexed tokenId, uint256 totalVentas);
    event ScoreActualizado(address indexed vendedor, uint8 nuevoScore);
    event EscrowContractActualizado(address indexed nuevoEscrow);

    error SoloEscrowAutorizado();
    error TransferenciaNoPermitida();
    error ScoreFueraDeRango();

    modifier soloEscrow() {
        if (msg.sender != escrowContract && msg.sender != owner()) revert SoloEscrowAutorizado();
        _;
    }

    constructor() ERC721("TrustLink Reputation", "TLREP") Ownable(msg.sender) {}

    /// @notice Define (o actualiza) la direccion del contrato de Escrow autorizado.
    ///         Se ejecuta una sola vez tras desplegar ambos contratos.
    function setEscrowContract(address _escrow) external onlyOwner {
        escrowContract = _escrow;
        emit EscrowContractActualizado(_escrow);
    }

    /// @notice Llamado por el contrato de Escrow cuando una venta se cierra
    ///         sin disputas. Acuña un nuevo SBT y actualiza contadores.
    function registrarVentaExitosa(address vendedor, address comprador) external soloEscrow {
        ventasExitosas[vendedor] += 1;

        if (!compradorHaComprado[vendedor][comprador]) {
            compradorHaComprado[vendedor][comprador] = true;
            totalCompradoresDistintos[vendedor] += 1;
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(vendedor, tokenId);

        emit ReputacionEmitida(vendedor, tokenId, ventasExitosas[vendedor]);
    }

    /// @notice Publica el score (0-100) calculado por el backend/IA para un vendedor.
    ///         En el MVP lo llama el owner (backend); en produccion se migraria
    ///         a un oraculo multi-firma (ver roadmap del pitch).
    function actualizarScore(address vendedor, uint8 nuevoScore) external onlyOwner {
        if (nuevoScore > 100) revert ScoreFueraDeRango();
        score[vendedor] = nuevoScore;
        emit ScoreActualizado(vendedor, nuevoScore);
    }

    /// @notice Numero de SBTs (=ventas exitosas) que tiene un vendedor.
    function reputacionDe(address vendedor) external view returns (uint256 ventas, uint8 puntaje, uint256 compradoresDistintos) {
        return (ventasExitosas[vendedor], score[vendedor], totalCompradoresDistintos[vendedor]);
    }

    // ---- Bloqueo de transferencias: hace el token "soulbound" ----

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Se permite el mint (from == address(0)) y el burn (to == address(0)).
        // Cualquier transferencia entre dos direcciones distintas de cero se bloquea.
        if (from != address(0) && to != address(0)) {
            revert TransferenciaNoPermitida();
        }
        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override {
        revert TransferenciaNoPermitida();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert TransferenciaNoPermitida();
    }
}
