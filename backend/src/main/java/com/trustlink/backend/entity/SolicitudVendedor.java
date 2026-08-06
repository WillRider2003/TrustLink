package com.trustlink.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Solicitud de un USUARIO para convertirse en vendedor. Un usuario normal
 * solo puede comprar; para publicar productos y acceder a crédito debe
 * llenar este formulario y esperar a que un SUPERADMIN la apruebe o
 * rechace desde el panel de administración.
 */
@Entity
@Table(name = "solicitudes_vendedor")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudVendedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "nombre_negocio", nullable = false, length = 120)
    private String nombreNegocio;

    @Column(name = "tipo_productos", nullable = false, length = 255)
    private String tipoProductos;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    /** Ej: años de experiencia, referencia, DNI/RUC si aplica — texto libre del formulario. */
    @Column(name = "informacion_adicional", columnDefinition = "TEXT")
    private String informacionAdicional;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoSolicitudVendedor estado = EstadoSolicitudVendedor.PENDIENTE;

    /** Motivo que el admin escribe al rechazar, visible para el usuario. */
    @Column(name = "motivo_resolucion", length = 255)
    private String motivoResolucion;

    @ManyToOne
    @JoinColumn(name = "resuelta_por_id")
    private Usuario resueltaPor;

    private LocalDateTime resueltaEn;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}
