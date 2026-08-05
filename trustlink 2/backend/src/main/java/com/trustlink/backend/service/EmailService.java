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

        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(remitente);
            mensaje.setTo(destinatario);
            mensaje.setSubject("Recupera tu contraseña de TrustLink");
            mensaje.setText(cuerpo);
            mailSender.send(mensaje);
        } catch (Exception e) {
            // En la demo del hackathon puede que no haya SMTP configurado;
            // no queremos que esto rompa el flujo, solo lo dejamos en log
            // y el enlace tambien queda visible en la pantalla de confirmacion
            // (ver AuthController) para que la demo funcione sin correo real.
            log.warn("No se pudo enviar el correo de recuperación (¿SMTP configurado?): {}", e.getMessage());
        }
    }
}
