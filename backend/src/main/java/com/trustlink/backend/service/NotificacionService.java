package com.trustlink.backend.service;

import com.trustlink.backend.entity.Notificacion;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Punto único para notificar a un usuario. Crea la notificación in-app
 * (si el usuario las tiene activadas) y dispara el correo correspondiente
 * (si las tiene activadas) — cada evento de negocio (compra, envío,
 * solicitud aprobada) llama a uno de estos métodos en vez de hablar
 * directo con EmailService o NotificacionRepository.
 */
@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final EmailService emailService;

    @Transactional
    public void notificarCompraHecha(Usuario comprador, String producto, String codigoConfirmacion, String enlace) {
        crearInApp(comprador, "Compra confirmada",
                "Tu compra de \"" + producto + "\" quedó en custodia. Guarda tu código de entrega.", enlace);
        if (comprador.isNotificacionesPorCorreo()) {
            emailService.enviarCorreoCompraHecha(comprador.getEmail(), comprador.getNombre(), producto, codigoConfirmacion);
        }
    }

    @Transactional
    public void notificarCompraEnviada(Usuario comprador, String producto, String enlace) {
        crearInApp(comprador, "Pedido enviado",
                "El vendedor marcó como enviado tu pedido de \"" + producto + "\".", enlace);
        if (comprador.isNotificacionesPorCorreo()) {
            emailService.enviarCorreoCompraEnviada(comprador.getEmail(), comprador.getNombre(), producto);
        }
    }

    @Transactional
    public void notificarSolicitudAprobada(Usuario usuario, String enlace) {
        crearInApp(usuario, "Solicitud aprobada",
                "Tu solicitud para ser vendedor fue aprobada. Ya puedes publicar productos.", enlace);
        if (usuario.isNotificacionesPorCorreo()) {
            emailService.enviarCorreoSolicitudAprobada(usuario.getEmail(), usuario.getNombre());
        }
    }

    @Transactional
    public void notificarSolicitudRechazada(Usuario usuario, String motivo, String enlace) {
        crearInApp(usuario, "Solicitud rechazada",
                "Tu solicitud para ser vendedor fue rechazada. Motivo: " + motivo, enlace);
        // No se envía correo de rechazo para no sobrecargar al usuario;
        // el detalle queda visible en su historial dentro de la app.
    }

    private void crearInApp(Usuario usuario, String titulo, String mensaje, String enlace) {
        if (!usuario.isNotificacionesEnApp()) {
            return;
        }
        Notificacion notificacion = Notificacion.builder()
                .usuario(usuario)
                .titulo(titulo)
                .mensaje(mensaje)
                .enlace(enlace)
                .build();
        notificacionRepository.save(notificacion);
    }

    public List<Notificacion> recientes(Usuario usuario) {
        return notificacionRepository.findTop30ByUsuarioOrderByCreadoEnDesc(usuario);
    }

    public long contarNoLeidas(Usuario usuario) {
        return notificacionRepository.countByUsuarioAndLeidaFalse(usuario);
    }

    @Transactional
    public void marcarTodasLeidas(Usuario usuario) {
        List<Notificacion> pendientes = notificacionRepository.findByUsuarioAndLeidaFalse(usuario);
        pendientes.forEach(n -> n.setLeida(true));
        notificacionRepository.saveAll(pendientes);
    }
}
