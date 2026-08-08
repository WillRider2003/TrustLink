// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TrustLinkReputation.sol";

/// @title TrustLinkEscrow
/// @notice Custodia el pago de una venta entre comprador y vendedor informal.
///         El dinero (ETH nativo de Arbitrum en el MVP) queda bloqueado hasta
///         que el comprador confirma la entrega con un codigo, o hasta que
///         se cumple el plazo de timeout (en cuyo caso se libera al vendedor
///         o se reembolsa al comprador segun si hubo disputa reportada).
contract TrustLinkEscrow is Ownable, ReentrancyGuard {
    enum Estado {
        Inexistente,
        EnCustodia,
        Liberado,
        Reembolsado,
        EnDisputa
    }

    struct Orden {
        address comprador;
        address vendedor;
        uint256 monto;
        uint256 creadaEn;
        uint256 plazoConfirmacion; // timestamp limite para confirmar
        bytes32 codigoHash;        // hash del codigo de confirmacion de entrega
        Estado estado;
    }

    /// @notice Ventana de tiempo por defecto para confirmar entrega (72 horas en el MVP)
    uint256 public constant PLAZO_CONFIRMACION_DEFECTO = 72 hours;

    /// @notice Contrato de reputacion al que se notifican las ventas exitosas
    TrustLinkReputation public reputacion;

    uint256 private _nextOrdenId = 1;
    mapping(uint256 => Orden) public ordenes;

    event OrdenCreada(uint256 indexed ordenId, address indexed comprador, address indexed vendedor, uint256 monto, uint256 plazoConfirmacion);
    event EntregaConfirmada(uint256 indexed ordenId, address indexed comprador, address indexed vendedor, uint256 monto);
    event OrdenReembolsada(uint256 indexed ordenId, address indexed comprador, uint256 monto);
    event OrdenEnDisputa(uint256 indexed ordenId, address indexed reportadoPor);
    event DisputaResuelta(uint256 indexed ordenId, bool liberadoAlVendedor);

    error MontoInvalido();
    error OrdenNoExiste();
    error EstadoInvalido();
    error NoAutorizado();
    error CodigoIncorrecto();
    error PlazoNoVencido();
    error TransferenciaFallida();

    constructor(address _reputacionContract) Ownable(msg.sender) {
        reputacion = TrustLinkReputation(_reputacionContract);
    }

    /// @notice El comprador deposita el pago en garantia al solicitar un producto.
    /// @param vendedor Direccion del vendedor.
    /// @param codigoHash keccak256 del codigo de confirmacion de entrega (se genera
    ///        y se muestra al comprador fuera de la cadena, tipo codigo de delivery).
    function crearOrden(address vendedor, bytes32 codigoHash) external payable nonReentrant returns (uint256) {
        if (msg.value == 0) revert MontoInvalido();
        if (vendedor == address(0) || vendedor == msg.sender) revert NoAutorizado();

        uint256 ordenId = _nextOrdenId++;
        ordenes[ordenId] = Orden({
            comprador: msg.sender,
            vendedor: vendedor,
            monto: msg.value,
            creadaEn: block.timestamp,
            plazoConfirmacion: block.timestamp + PLAZO_CONFIRMACION_DEFECTO,
            codigoHash: codigoHash,
            estado: Estado.EnCustodia
        });

        emit OrdenCreada(ordenId, msg.sender, vendedor, msg.value, block.timestamp + PLAZO_CONFIRMACION_DEFECTO);
        return ordenId;
    }

    /// @notice El comprador confirma la entrega ingresando el codigo. Libera el pago
    ///         al vendedor y notifica al contrato de reputacion para acuñar el SBT.
    function confirmarEntrega(uint256 ordenId, string calldata codigo) external nonReentrant {
        Orden storage orden = ordenes[ordenId];
        if (orden.estado == Estado.Inexistente) revert OrdenNoExiste();
        if (orden.estado != Estado.EnCustodia) revert EstadoInvalido();
        if (msg.sender != orden.comprador) revert NoAutorizado();
        if (keccak256(abi.encodePacked(codigo)) != orden.codigoHash) revert CodigoIncorrecto();

        orden.estado = Estado.Liberado;

        (bool ok, ) = payable(orden.vendedor).call{value: orden.monto}("");
        if (!ok) revert TransferenciaFallida();

        // Registrar la venta exitosa en el contrato de reputacion (acuña SBT)
        reputacion.registrarVentaExitosa(orden.vendedor, orden.comprador);

        emit EntregaConfirmada(ordenId, orden.comprador, orden.vendedor, orden.monto);
    }

    /// @notice Si el comprador no confirma dentro del plazo y no hay disputa,
    ///         cualquiera puede ejecutar la liberacion automatica al vendedor.
    function liberarPorTimeout(uint256 ordenId) external nonReentrant {
        Orden storage orden = ordenes[ordenId];
        if (orden.estado == Estado.Inexistente) revert OrdenNoExiste();
        if (orden.estado != Estado.EnCustodia) revert EstadoInvalido();
        if (block.timestamp < orden.plazoConfirmacion) revert PlazoNoVencido();

        orden.estado = Estado.Liberado;

        (bool ok, ) = payable(orden.vendedor).call{value: orden.monto}("");
        if (!ok) revert TransferenciaFallida();

        reputacion.registrarVentaExitosa(orden.vendedor, orden.comprador);

        emit EntregaConfirmada(ordenId, orden.comprador, orden.vendedor, orden.monto);
    }

    /// @notice El comprador o el vendedor pueden marcar una orden en disputa
    ///         antes de que se cumpla el plazo, deteniendo la liberacion automatica.
    function reportarDisputa(uint256 ordenId) external {
        Orden storage orden = ordenes[ordenId];
        if (orden.estado == Estado.Inexistente) revert OrdenNoExiste();
        if (orden.estado != Estado.EnCustodia) revert EstadoInvalido();
        if (msg.sender != orden.comprador && msg.sender != orden.vendedor) revert NoAutorizado();

        orden.estado = Estado.EnDisputa;
        emit OrdenEnDisputa(ordenId, msg.sender);
    }

    /// @notice El owner (superadmin/backend en el MVP) resuelve una disputa manualmente.
    ///         En produccion esto migraria a un modulo de arbitraje (ver roadmap).
    function resolverDisputa(uint256 ordenId, bool liberarAlVendedor) external onlyOwner nonReentrant {
        Orden storage orden = ordenes[ordenId];
        if (orden.estado == Estado.Inexistente) revert OrdenNoExiste();
        if (orden.estado != Estado.EnDisputa) revert EstadoInvalido();

        if (liberarAlVendedor) {
            orden.estado = Estado.Liberado;
            (bool ok, ) = payable(orden.vendedor).call{value: orden.monto}("");
            if (!ok) revert TransferenciaFallida();
            reputacion.registrarVentaExitosa(orden.vendedor, orden.comprador);
            emit EntregaConfirmada(ordenId, orden.comprador, orden.vendedor, orden.monto);
        } else {
            orden.estado = Estado.Reembolsado;
            (bool ok, ) = payable(orden.comprador).call{value: orden.monto}("");
            if (!ok) revert TransferenciaFallida();
            emit OrdenReembolsada(ordenId, orden.comprador, orden.monto);
        }

        emit DisputaResuelta(ordenId, liberarAlVendedor);
    }

    function obtenerOrden(uint256 ordenId) external view returns (Orden memory) {
        return ordenes[ordenId];
    }
}
