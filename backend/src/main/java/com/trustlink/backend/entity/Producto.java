package com.trustlink.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Producto publicado por un vendedor en el marketplace. El precio se
 * maneja en Soles (para que el vendedor piense en su moneda local) y se
 * convierte a ETH de testnet solo al momento de crear la orden de escrow
 * (ver EscrowOrdenService), tal como describe el pitch: la blockchain
 * queda invisible para el usuario final.
 */
@Entity
@Table(name = "productos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendedor_id", nullable = false)
    private Usuario vendedor;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Positive
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precioSoles;

    @Column(name = "foto_url", length = 255)
    private String fotoUrl;

    @Builder.Default
    @Column(nullable = false)
    private boolean activo = true;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}
