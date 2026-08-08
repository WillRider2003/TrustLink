package com.trustlink.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Solicitud de microcredito. Segun el alcance recomendado del pitch
 * (ver TrustLink_MVP_Recomendado.pdf), el techo de prestamo se calcula
 * con una formula simple y transparente a partir del score de
 * reputacion — no hay desembolso real on-chain en el MVP, se muestra
 * como un panel de credito claro y auditable, tal como se explico al
 * jurado.
 */
@Entity
@Table(name = "solicitudes_credito")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudCredito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montoSolicitado;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal techoDisponibleAlMomento;

    @Column(nullable = false)
    private Integer scoreAlMomento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoCredito estado = EstadoCredito.APROBADO_AUTOMATICO;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public enum EstadoCredito {
        APROBADO_AUTOMATICO,
        RECHAZADO_EXCEDE_TECHO
    }
}
