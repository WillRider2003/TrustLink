package com.trustlink.backend.repository;

import com.trustlink.backend.entity.Notificacion;
import com.trustlink.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findTop30ByUsuarioOrderByCreadoEnDesc(Usuario usuario);
    long countByUsuarioAndLeidaFalse(Usuario usuario);
    List<Notificacion> findByUsuarioAndLeidaFalse(Usuario usuario);
}
