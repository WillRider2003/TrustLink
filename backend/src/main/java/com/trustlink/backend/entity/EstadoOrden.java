package com.trustlink.backend.entity;

/**
 * Espejo del enum `Estado` del contrato TrustLinkEscrow.sol. Se mantiene
 * sincronizado en la base de datos para que el frontend pueda mostrar el
 * estado sin tener que consultar la blockchain en cada carga de pantalla
 * (se sincroniza tras cada transaccion confirmada — ver EscrowOrdenService).
 */
public enum EstadoOrden {
    EN_CUSTODIA,
    LIBERADO,
    REEMBOLSADO,
    EN_DISPUTA
}
