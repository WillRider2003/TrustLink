package com.trustlink.backend.repository;

import com.trustlink.backend.entity.OrdenEscrow;
import com.trustlink.backend.entity.Producto;
import com.trustlink.backend.entity.Resena;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResenaRepository extends JpaRepository<Resena, Long> {
    List<Resena> findByProductoOrderByCreadoEnDesc(Producto producto);
    boolean existsByOrden(OrdenEscrow orden);
    Optional<Resena> findByOrden(OrdenEscrow orden);
}
