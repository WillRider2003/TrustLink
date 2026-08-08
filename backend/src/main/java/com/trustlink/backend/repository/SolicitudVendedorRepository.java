package com.trustlink.backend.repository;

import com.trustlink.backend.entity.EstadoSolicitudVendedor;
import com.trustlink.backend.entity.SolicitudVendedor;
import com.trustlink.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SolicitudVendedorRepository extends JpaRepository<SolicitudVendedor, Long> {
    List<SolicitudVendedor> findByUsuarioOrderByCreadoEnDesc(Usuario usuario);
    List<SolicitudVendedor> findByEstadoOrderByCreadoEnAsc(EstadoSolicitudVendedor estado);
    List<SolicitudVendedor> findAllByOrderByCreadoEnDesc();

    /** Para evitar que un usuario mande varias solicitudes PENDIENTE a la vez. */
    Optional<SolicitudVendedor> findFirstByUsuarioAndEstadoOrderByCreadoEnDesc(Usuario usuario, EstadoSolicitudVendedor estado);
}
