package com.trustlink.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Reseña de un producto, escrita por un comprador que ya recibió y
 * confirmó esa compra (orden en estado LIBERADO) — así evitamos reseñas
 * de gente que nunca compró el producto.
 */
@Entity
@Table(name = "resenas", uniqueConstraints = @UniqueConstraint(columnNames = {"orden_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Resena {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @ManyToOne(optional = false)
    @JoinColumn(name = "comprador_id", nullable = false)
    private Usuario comprador;

    /** La orden que habilita esta reseña — una reseña por orden, para que nadie reseñe dos veces la misma compra. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "orden_id", nullable = false)
    private OrdenEscrow orden;

    /** Calificación de 1 a 5 estrellas. */
    @Column(nullable = false)
    private int calificacion;

    @Column(columnDefinition = "TEXT")
    private String comentario;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();
}
