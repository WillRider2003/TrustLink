package com.trustlink.backend.service;

import com.trustlink.backend.entity.*;
import com.trustlink.backend.repository.OrdenEscrowRepository;
import com.trustlink.backend.repository.ResenaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.OptionalDouble;

@Service
@RequiredArgsConstructor
public class ResenaService {

    private final ResenaRepository resenaRepository;
    private final OrdenEscrowRepository ordenRepository;

    public static class ResenaException extends RuntimeException {
        public ResenaException(String mensaje) { super(mensaje); }
    }

    @Transactional
    public Resena crear(Usuario comprador, Long ordenId, int calificacion, String comentario) {
        OrdenEscrow orden = ordenRepository.findById(ordenId)
                .orElseThrow(() -> new ResenaException("Orden no encontrada"));

        if (!orden.getComprador().getId().equals(comprador.getId())) {
            throw new ResenaException("No tienes permiso sobre esta orden");
        }
        if (orden.getEstado() != EstadoOrden.LIBERADO) {
            throw new ResenaException("Solo puedes reseñar compras ya entregadas y confirmadas");
        }
        if (resenaRepository.existsByOrden(orden)) {
            throw new ResenaException("Ya dejaste una reseña para esta compra");
        }
        if (calificacion < 1 || calificacion > 5) {
            throw new ResenaException("La calificación debe ser entre 1 y 5");
        }

        Resena resena = Resena.builder()
                .producto(orden.getProducto())
                .comprador(comprador)
                .orden(orden)
                .calificacion(calificacion)
                .comentario(comentario)
                .build();

        return resenaRepository.save(resena);
    }

    public List<Resena> deProducto(Producto producto) {
        return resenaRepository.findByProductoOrderByCreadoEnDesc(producto);
    }

    public double promedioDeProducto(Producto producto) {
        OptionalDouble promedio = resenaRepository.findByProductoOrderByCreadoEnDesc(producto).stream()
                .mapToInt(Resena::getCalificacion)
                .average();
        return promedio.isPresent() ? Math.round(promedio.getAsDouble() * 10.0) / 10.0 : 0.0;
    }

    public boolean puedeResenar(Usuario comprador, OrdenEscrow orden) {
        return orden.getComprador().getId().equals(comprador.getId())
                && orden.getEstado() == EstadoOrden.LIBERADO
                && !resenaRepository.existsByOrden(orden);
    }
}
