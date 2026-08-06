package com.trustlink.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${trustlink.app.base-url}")
    private String baseUrl;

    @Value("${spring.mail.username:no-reply@trustlink.local}")
    private String remitente;

    @Async
    public void enviarCorreoRecuperacion(String destinatario, String nombre, String token) {
        String enlace = baseUrl + "/auth/recuperar/confirmar?token=" + token;
        String cuerpo = "Hola " + nombre + ",\n\n" +
                "Recibimos una solicitud para restablecer tu contraseña de TrustLink.\n\n" +
                "Si fuiste tú, entra a este enlace (valido por 30 minutos):\n" + enlace + "\n\n" +
                "Si no solicitaste esto, ignora este correo — tu cuenta sigue segura.\n\n" +
                "— Equipo TrustLink";

        enviar(destinatario, "Recupera tu contraseña de TrustLink", cuerpo);
    }

    @Async
    public void enviarCorreoCompraHecha(String destinatario, String nombre, String producto, String codigoConfirmacion) {
        String cuerpo = "Hola " + nombre + ",\n\n" +
                "Tu compra de \"" + producto + "\" se registró con éxito y el pago quedó en custodia segura.\n\n" +
                "Cuando recibas el producto, usa este código para confirmar la entrega:\n" + codigoConfirmacion + "\n\n" +
                "Puedes ver el estado de tu orden en " + baseUrl + "/marketplace/mis-compras\n\n" +
                "— Equipo TrustLink";
        enviar(destinatario, "Compra confirmada en TrustLink", cuerpo);
    }

    @Async
    public void enviarCorreoCompraEnviada(String destinatario, String nombre, String producto) {
        String cuerpo = "Hola " + nombre + ",\n\n" +
                "El vendedor marcó como enviado tu pedido de \"" + producto + "\".\n\n" +
                "Revisa el estado de tu orden en " + baseUrl + "/marketplace/mis-compras\n\n" +
                "— Equipo TrustLink";
        enviar(destinatario, "Tu pedido fue enviado", cuerpo);
    }

    @Async
    public void enviarCorreoSolicitudAprobada(String destinatario, String nombre) {
        String cuerpo = "Hola " + nombre + ",\n\n" +
                "¡Buenas noticias! Tu solicitud para ser vendedor en TrustLink fue aprobada.\n\n" +
                "Ya puedes publicar productos y acceder a crédito desde " + baseUrl + "/marketplace/publicar\n\n" +
                "— Equipo TrustLink";
        enviar(destinatario, "Tu solicitud de vendedor fue aprobada", cuerpo);
    }

    private void enviar(String destinatario, String asunto, String cuerpo) {
        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(remitente);
            mensaje.setTo(destinatario);
            mensaje.setSubject(asunto);
            mensaje.setText(cuerpo);
            mailSender.send(mensaje);
        } catch (Exception e) {
            // En la demo del hackathon puede que no haya SMTP configurado;
            // no queremos que esto rompa el flujo, solo lo dejamos en log.
            log.warn("No se pudo enviar el correo '{}' a {}: {}", asunto, destinatario, e.getMessage());
        }
    }
}
