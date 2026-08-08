package com.trustlink.backend.controller;

import com.trustlink.backend.service.ChatbotService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * Endpoint del chatbot de ayuda (widget flotante, ver fragments/navbar.html).
 * Va bajo /api/** porque ese prefijo ya está exento de CSRF en
 * SecurityConfig, para que el widget pueda llamarlo con un fetch simple
 * sin tener que leer el token CSRF del DOM.
 * <p>
 * El historial de la conversación se guarda en la sesión HTTP del
 * usuario (no en base de datos: es solo contexto de ayuda, no hace
 * falta persistirlo entre sesiones), limitado a los últimos intercambios
 * para no mandar prompts cada vez más largos a la IA.
 */
@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private static final String ATRIBUTO_HISTORIAL = "chatbotHistorial";
    private static final int MAX_LINEAS_HISTORIAL = 12; // 6 intercambios usuario/asistente

    private final ChatbotService chatbotService;

    public record MensajeRequest(@NotBlank String mensaje) {}
    public record MensajeResponse(String respuesta) {}

    @PostMapping("/mensaje")
    public MensajeResponse enviarMensaje(@RequestBody MensajeRequest request, HttpSession session) {
        @SuppressWarnings("unchecked")
        List<String> historial = (List<String>) session.getAttribute(ATRIBUTO_HISTORIAL);
        if (historial == null) {
            historial = new ArrayList<>();
        }

        String mensaje = request.mensaje().trim();
        String respuesta = chatbotService.responder(mensaje, historial);

        historial.add("Usuario: " + mensaje);
        historial.add("Asistente: " + respuesta);
        while (historial.size() > MAX_LINEAS_HISTORIAL) {
            historial.remove(0);
        }
        session.setAttribute(ATRIBUTO_HISTORIAL, historial);

        return new MensajeResponse(respuesta);
    }
}
