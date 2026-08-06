package com.trustlink.backend.service;

import com.trustlink.backend.entity.EstadoSolicitudVendedor;
import com.trustlink.backend.entity.SolicitudVendedor;
import com.trustlink.backend.entity.TipoAccionAuditoria;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.SolicitudVendedorRepository;
import com.trustlink.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Flujo de solicitud para que un USUARIO pase a ser vendedor. Mientras
 * no tenga una solicitud APROBADA, no puede publicar productos ni pedir
 * crédito (ver MarketplaceController y CreditoController).
 */
@Service
@RequiredArgsConstructor
public class SolicitudVendedorService {

    private final SolicitudVendedorRepository solicitudRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoriaService;
    private final NotificacionService notificacionService;

    public static class SolicitudException extends RuntimeException {
        public SolicitudException(String mensaje) { super(mensaje); }
    }

    @Transactional
    public SolicitudVendedor solicitar(Usuario usuario, String nombreNegocio, String tipoProductos,
                                        String descripcion, String informacionAdicional) {
        if (usuario.isVendedorAprobado()) {
            throw new SolicitudException("Ya eres vendedor aprobado.");
        }
        solicitudRepository.findFirstByUsuarioAndEstadoOrderByCreadoEnDesc(usuario, EstadoSolicitudVendedor.PENDIENTE)
                .ifPresent(s -> {
                    throw new SolicitudException("Ya tienes una solicitud pendiente de revisión.");
                });

        SolicitudVendedor solicitud = SolicitudVendedor.builder()
                .usuario(usuario)
                .nombreNegocio(nombreNegocio)
                .tipoProductos(tipoProductos)
                .descripcion(descripcion)
                .informacionAdicional(informacionAdicional)
                .estado(EstadoSolicitudVendedor.PENDIENTE)
                .build();

        SolicitudVendedor guardada = solicitudRepository.save(solicitud);
        auditoriaService.registrar(usuario, TipoAccionAuditoria.SOLICITUD_VENDEDOR_CREADA,
                "SolicitudVendedor", guardada.getId(),
                usuario.getEmail() + " solicitó ser vendedor con el negocio \"" + nombreNegocio + "\"");
        return guardada;
    }

    public List<SolicitudVendedor> historial(Usuario usuario) {
        return solicitudRepository.findByUsuarioOrderByCreadoEnDesc(usuario);
    }

    public List<SolicitudVendedor> pendientes() {
        return solicitudRepository.findByEstadoOrderByCreadoEnAsc(EstadoSolicitudVendedor.PENDIENTE);
    }

    public List<SolicitudVendedor> todas() {
        return solicitudRepository.findAllByOrderByCreadoEnDesc();
    }

    @Transactional
    public SolicitudVendedor aprobar(Usuario admin, Long solicitudId) {
        SolicitudVendedor solicitud = obtenerPendiente(solicitudId);

        solicitud.setEstado(EstadoSolicitudVendedor.APROBADA);
        solicitud.setResueltaPor(admin);
        solicitud.setResueltaEn(LocalDateTime.now());
        solicitudRepository.save(solicitud);

        Usuario usuario = solicitud.getUsuario();
        usuario.setVendedorAprobado(true);
        usuarioRepository.save(usuario);

        auditoriaService.registrar(admin, TipoAccionAuditoria.SOLICITUD_VENDEDOR_APROBADA,
                "SolicitudVendedor", solicitud.getId(),
                admin.getEmail() + " aprobó la solicitud de vendedor de " + usuario.getEmail());
        notificacionService.notificarSolicitudAprobada(usuario, "/marketplace/publicar");

        return solicitud;
    }

    @Transactional
    public SolicitudVendedor rechazar(Usuario admin, Long solicitudId, String motivo) {
        SolicitudVendedor solicitud = obtenerPendiente(solicitudId);

        solicitud.setEstado(EstadoSolicitudVendedor.RECHAZADA);
        solicitud.setMotivoResolucion(motivo);
        solicitud.setResueltaPor(admin);
        solicitud.setResueltaEn(LocalDateTime.now());

        SolicitudVendedor guardada = solicitudRepository.save(solicitud);
        auditoriaService.registrar(admin, TipoAccionAuditoria.SOLICITUD_VENDEDOR_RECHAZADA,
                "SolicitudVendedor", solicitud.getId(),
                admin.getEmail() + " rechazó la solicitud de vendedor de " + solicitud.getUsuario().getEmail()
                        + " (motivo: " + motivo + ")");
        notificacionService.notificarSolicitudRechazada(solicitud.getUsuario(), motivo, "/vendedor/solicitud");
        return guardada;
    }

    private SolicitudVendedor obtenerPendiente(Long id) {
        SolicitudVendedor solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new SolicitudException("Solicitud no encontrada"));
        if (solicitud.getEstado() != EstadoSolicitudVendedor.PENDIENTE) {
            throw new SolicitudException("Esta solicitud ya fue resuelta.");
        }
        return solicitud;
    }
}
