package com.trustlink.backend.repository;

import com.trustlink.backend.entity.Producto;
import com.trustlink.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByActivoTrueOrderByCreadoEnDesc();
    List<Producto> findByVendedorOrderByCreadoEnDesc(Usuario vendedor);
}
