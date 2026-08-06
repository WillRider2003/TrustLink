package com.trustlink.backend.repository;

import com.trustlink.backend.entity.LogAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, Long> {
    List<LogAuditoria> findByCreadoEnBetweenOrderByCreadoEnDesc(LocalDateTime desde, LocalDateTime hasta);
    List<LogAuditoria> findTop200ByOrderByCreadoEnDesc();
}
