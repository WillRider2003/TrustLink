package com.trustlink.backend.service;

import com.trustlink.backend.entity.OrdenEscrow;
import com.trustlink.backend.service.ai.GeminiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Traduce el estado tecnico de una orden de escrow (eventos del contrato,
 * jerga cripto) a una frase simple que cualquier comprador o vendedor
 * entienda, sin mencionar wallets, gas ni firmas.
 * <p>
 * Usa {@link GeminiClient} para redactar la frase de forma mas natural,
 * pero SIEMPRE hay un texto de respaldo generado localmente con los
 * mismos datos: si la IA esta deshabilitada o falla, el flujo de compra
 * sigue funcionando igual.
 */
@Service
@RequiredArgsConstructor
public class TraductorCriptoService {

    private final GeminiClient geminiClient;

    /** Cache simple en memoria: misma orden + mismo estado no vuelve a llamar a la IA. */
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    /**
     * Explica en lenguaje simple el estado actual de una orden de escrow.
     */
    public String explicarOrden(OrdenEscrow orden) {
        String claveCache = orden.getId() + ":" + orden.getEstado() + ":" + orden.isMarcadoEnviado();
        return cache.computeIfAbsent(claveCache, k -> {
            String fallback = explicacionFallback(orden);
            String prompt = "Eres un traductor de jerga cripto para un marketplace peruano. " +
                    "Reescribe la siguiente explicación en 1-2 frases simples, cálidas y claras para alguien sin " +
                    "conocimientos técnicos. NO menciones wallets, gas, blockchain, contratos ni firmas. " +
                    "No inventes datos que no estén en el texto original. Responde solo con la frase final, sin comillas.\n\n" +
                    "Texto original: " + fallback;
            return geminiClient.generarOFallback(prompt, fallback);
        });
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
}
