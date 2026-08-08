package com.trustlink.backend.repository;

import com.trustlink.backend.entity.ReputacionVendedor;
import com.trustlink.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReputacionVendedorRepository extends JpaRepository<ReputacionVendedor, Long> {
    Optional<ReputacionVendedor> findByUsuario(Usuario usuario);
}
