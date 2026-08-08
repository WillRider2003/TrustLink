package com.trustlink.backend.repository;

import com.trustlink.backend.entity.SolicitudCredito;
import com.trustlink.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SolicitudCreditoRepository extends JpaRepository<SolicitudCredito, Long> {
    List<SolicitudCredito> findByUsuarioOrderByCreadoEnDesc(Usuario usuario);
}
