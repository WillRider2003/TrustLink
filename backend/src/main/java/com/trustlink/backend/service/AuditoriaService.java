package com.trustlink.backend.service;

import com.trustlink.backend.entity.LogAuditoria;
import com.trustlink.backend.entity.TipoAccionAuditoria;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.LogAuditoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Punto único para registrar eventos auditables. Se llama desde los
 * demás services (login, ordenes, solicitudes, etc.) para dejar un
 * rastro consultable y exportable desde el panel de SUPERADMIN.
 * <p>
 * Usa su propia transacción (REQUIRES_NEW) para que, si el registro del
 * log fallara por algún motivo, no se revierta la operación de negocio
 * que lo disparó — auditar no debe poder tumbar una compra real.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditoriaService {

    private final LogAuditoriaRepository logRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(Usuario actor, TipoAccionAuditoria accion, String entidadTipo, Long entidadId, String detalle) {
        try {
            LogAuditoria entrada = LogAuditoria.builder()
                    .actor(actor)
                    .actorEmail(actor != null ? actor.getEmail() : "sistema")
                    .accion(accion)
                    .entidadTipo(entidadTipo)
                    .entidadId(entidadId)
                    .detalle(detalle)
                    .build();
            logRepository.save(entrada);
        } catch (Exception e) {
            // No queremos que un fallo al auditar tumbe la acción real.
            log.error("No se pudo registrar log de auditoría: {}", detalle, e);
        }
    }

    public void registrar(Usuario actor, TipoAccionAuditoria accion, String detalle) {
        registrar(actor, accion, null, null, detalle);
    }
}
