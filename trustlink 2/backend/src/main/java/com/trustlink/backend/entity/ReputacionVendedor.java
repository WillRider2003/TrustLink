package com.trustlink.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Cache local del estado de reputacion on-chain de un vendedor (lo que
 * devuelve TrustLinkReputation.reputacionDe() en el contrato). Se
 * actualiza cada vez que se emite un nuevo SBT o se recalcula el score.
 */
@Entity
@Table(name = "reputacion_vendedores")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReputacionVendedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @Builder.Default
    @Column(nullable = false)
    private Integer ventasExitosas = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer scoreActual = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer compradoresDistintos = 0;

    /** Ultimo tokenId de SBT acuñado para este vendedor (referencia informativa). */
    private Long ultimoTokenIdSbt;

    private LocalDateTime actualizadoEn;

    @PreUpdate
    @PrePersist
    public void marcarActualizacion() {
        this.actualizadoEn = LocalDateTime.now();
    }
}
