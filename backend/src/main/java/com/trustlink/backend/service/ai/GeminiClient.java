package com.trustlink.backend.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Cliente compartido para pedirle a Gemini que redacte un texto a partir
 * de un prompt. Lo usan los distintos "traductores" de la app (jerga
 * cripto, explicacion de score, etc.) para no duplicar la llamada HTTP.
 * <p>
 * SIEMPRE hay un texto de respaldo: si la IA esta deshabilitada, no hay
 * API key, o la llamada falla o tarda demasiado, se devuelve el fallback
 * tal cual y el llamador sigue funcionando igual.
 */
@Component
@Slf4j
public class GeminiClient {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    @Value("${trustlink.ai.enabled:false}")
    private boolean aiHabilitada;

    @Value("${trustlink.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${trustlink.ai.gemini-model:gemini-flash-latest}")
    private String geminiModel;

    /**
     * Devuelve el texto generado por Gemini a partir de {@code prompt}, o
     * {@code fallback} si la IA esta deshabilitada, sin API key, o si la
     * llamada falla por cualquier motivo (timeout, error HTTP, respuesta
     * vacia, etc.).
     */
    public String generarOFallback(String prompt, String fallback) {
        if (!aiHabilitada || geminiApiKey == null || geminiApiKey.isBlank()) {
            return fallback;
        }
        try {
            return llamarGemini(prompt);
        } catch (Exception e) {
            log.warn("Llamada a Gemini fallo, usando texto de respaldo: {}", e.getMessage());
            return fallback;
        }
    }

    private String llamarGemini(String prompt) throws Exception {
        Map<String, Object> body = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{ Map.of("text", prompt) })
                },
                "generationConfig", Map.of("temperature", 0.4, "maxOutputTokens", 200)
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel +
                ":generateContent?key=" + geminiApiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(6))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini respondió " + response.statusCode() + ": " + response.body());
        }

        JsonNode raiz = objectMapper.readTree(response.body());
        JsonNode texto = raiz.path("candidates").path(0).path("content").path("parts").path(0).path("text");

        if (texto.isMissingNode() || texto.asText().isBlank()) {
            throw new RuntimeException("Respuesta de Gemini sin texto utilizable");
        }

        return texto.asText().trim();
    }
}
