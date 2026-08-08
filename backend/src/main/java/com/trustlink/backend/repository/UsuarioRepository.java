package com.trustlink.backend.repository;

import com.trustlink.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT u FROM Usuario u WHERE " +
           "LOWER(u.nombre) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.apellido) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))")
    java.util.List<Usuario> buscar(@Param("q") String query);
}
