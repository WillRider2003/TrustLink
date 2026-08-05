package com.trustlink.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Orden de compra respaldada por el contrato TrustLinkEscrow en Arbitrum.
 * <p>
 * Esta tabla es un espejo/cache del estado on-chain: cada vez que se llama
 * a una funcion del contrato (crearOrden, confirmarEntrega, etc.) se
 * actualiza esta fila con el resultado real de la transaccion (hash, id
 * on-chain, estado), para que las pantallas puedan mostrar informacion
 * rapido sin tener que hacer una llamada RPC en cada carga.
 */
@Entity
@Table(name = "ordenes_escrow")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdenEscrow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID de la orden dentro del contrato TrustLinkEscrow (uint256 ordenId). */
    @Column(name = "orden_id_onchain")
    private Long ordenIdOnChain;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comprador_id", nullable = false)
    private Usuario comprador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendedor_id", nullable = false)
    private Usuario vendedor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montoSoles;

    /** Monto equivalente en ETH de testnet, tal como se envio al contrato. */
    @Column(name = "monto_eth", precision = 30, scale = 18)
    private BigDecimal montoEth;

    /**
     * Codigo de confirmacion de entrega, tipo codigo de delivery. Se
     * genera al crear la orden y se muestra solo al comprador; su hash
     * (keccak256) es lo que realmente queda en el contrato.
     */
    @Column(name = "codigo_confirmacion", length = 20)
    private String codigoConfirmacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoOrden estado = EstadoOrden.EN_CUSTODIA;

    @Column(name = "tx_hash_creacion", length = 100)
    private String txHashCreacion;

    @Column(name = "tx_hash_liberacion", length = 100)
    private String txHashLiberacion;

    @Column(name = "plazo_confirmacion")
    private LocalDateTime plazoConfirmacion;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    private LocalDateTime actualizadoEn;

    @PreUpdate
    public void preUpdate() {
        this.actualizadoEn = LocalDateTime.now();
    }
}
