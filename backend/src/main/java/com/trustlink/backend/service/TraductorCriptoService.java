package com.trustlink.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustlink.backend.entity.EstadoOrden;
import com.trustlink.backend.entity.OrdenEscrow;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traduce el estado tecnico de una orden de escrow (eventos del contrato,
 * jerga cripto) a una frase simple que cualquier comprador o vendedor
 * entienda, sin mencionar wallets, gas ni firmas.
 * <p>
 * Usa la API de Gemini para redactar la frase de forma mas natural, pero
 * SIEMPRE hay un texto de respaldo (fallback) generado localmente con los
 * mismos datos: si la IA esta deshabilitada, no hay API key configurada, o
 * la llamada falla o tarda demasiado, se usa el fallback y el flujo de
 * compra sigue funcionando igual.
 */
@Service
@Slf4j
public class TraductorCriptoService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    /** Cache simple en memoria: misma orden + mismo estado no vuelve a llamar a la IA. */
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    @Value("${trustlink.ai.enabled:false}")
    private boolean aiHabilitada;

    @Value("${trustlink.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${trustlink.ai.gemini-model:gemini-1.5-flash}")
    private String geminiModel;

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    /**
     * Explica en lenguaje simple el estado actual de una orden de escrow.
     */
    public String explicarOrden(OrdenEscrow orden) {
        String claveCache = orden.getId() + ":" + orden.getEstado() + ":" + orden.isMarcadoEnviado();
        return cache.computeIfAbsent(claveCache, k -> generarExplicacion(orden));
    }

    private String generarExplicacion(OrdenEscrow orden) {
        String fallback = explicacionFallback(orden);

        if (!aiHabilitada || geminiApiKey == null || geminiApiKey.isBlank()) {
            return fallback;
        }

        try {
            return llamarGemini(fallback, orden);
        } catch (Exception e) {
            log.warn("No se pudo generar la explicacion con IA, usando texto de respaldo (orden #{}): {}",
                    orden.getId(), e.getMessage());
            return fallback;
        }
    }

    /**
     * Texto de respaldo sin IA: cubre exactamente los mismos datos que se le
     * pediria a Gemini, para que la calidad minima este garantizada.
     */
    private String explicacionFallback(OrdenEscrow orden) {
        String monto = "S/ " + orden.getMontoSoles();
        return switch (orden.getEstado()) {
            case EN_CUSTODIA -> orden.isMarcadoEnviado()
                    ? "El vendedor ya envió tu producto. Tu pago de " + monto + " sigue guardado de forma segura " +
                      "y se le entregará solo cuando confirmes que lo recibiste con tu código."
                    : "Tu pago de " + monto + " está guardado de forma segura. Se le entregará al vendedor solo " +
                      "cuando confirmes que recibiste tu producto" +
                      (orden.getPlazoConfirmacion() != null
                              ? ", o automáticamente el " + orden.getPlazoConfirmacion().format(FORMATO_FECHA) + " si no respondes."
                              : ".");
            case LIBERADO -> "Confirmaste la entrega, así que tu pago de " + monto + " ya se le entregó al vendedor. " +
                    "Esta compra quedó completa.";
            case EN_DISPUTA -> "Reportaste un problema con esta compra. Tu pago de " + monto + " sigue guardado y " +
                    "no se le entregará a nadie hasta que el equipo de TrustLink revise el caso y decida qué hacer.";
            case REEMBOLSADO -> "Esta compra se canceló y tu pago de " + monto + " te fue devuelto.";
        };
    }

    private String llamarGemini(String fallback, OrdenEscrow orden) throws Exception {
        String prompt = "Eres un traductor de jerga cripto para un marketplace peruano. " +
                "Reescribe la siguiente explicación en 1-2 frases simples, cálidas y claras para alguien sin " +
                "conocimientos técnicos. NO menciones wallets, gas, blockchain, contratos ni firmas. " +
                "No inventes datos que no estén en el texto original. Responde solo con la frase final, sin comillas.\n\n" +
                "Texto original: " + fallback;

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
