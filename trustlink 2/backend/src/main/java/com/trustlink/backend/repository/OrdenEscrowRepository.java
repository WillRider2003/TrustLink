package com.trustlink.backend.repository;

import com.trustlink.backend.entity.OrdenEscrow;
import com.trustlink.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrdenEscrowRepository extends JpaRepository<OrdenEscrow, Long> {
    List<OrdenEscrow> findByCompradorOrderByCreadoEnDesc(Usuario comprador);
    List<OrdenEscrow> findByVendedorOrderByCreadoEnDesc(Usuario vendedor);
    Optional<OrdenEscrow> findByOrdenIdOnChain(Long ordenIdOnChain);
    List<OrdenEscrow> findAllByOrderByCreadoEnDesc();
}
