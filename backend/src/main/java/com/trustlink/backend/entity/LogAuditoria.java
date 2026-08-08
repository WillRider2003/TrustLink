package com.trustlink.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Registro de auditoría de acciones relevantes del sistema (quién hizo
 * qué, cuándo, sobre qué). Visible solo para el SUPERADMIN, con filtro
 * de fechas y exportación a CSV/Excel (ver AuditoriaController).
 */
@Entity
@Table(name = "logs_auditoria")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Usuario que realizó la acción. Null si fue el sistema (ej. un job automático). */
    @ManyToOne
    @JoinColumn(name = "actor_id")
    private Usuario actor;

    /** Email del actor al momento de la acción, guardado aparte por si el usuario luego se elimina. */
    @Column(name = "actor_email", length = 150)
    private String actorEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoAccionAuditoria accion;

    /** Tipo de entidad afectada, ej. "Producto", "OrdenEscrow", "Usuario". */
    @Column(name = "entidad_tipo", length = 60)
    private String entidadTipo;

    /** Id de la entidad afectada, si aplica. */
    @Column(name = "entidad_id")
    private Long entidadId;

    /** Descripción legible de lo que pasó, ej. "Aprobó la solicitud de vendedor #12". */
    @Column(nullable = false, length = 500)
    private String detalle;

    @Column(name = "ip_origen", length = 45)
    private String ipOrigen;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}
