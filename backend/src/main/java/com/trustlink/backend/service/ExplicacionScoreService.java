package com.trustlink.backend.service;

import com.trustlink.backend.entity.EstadoOrden;
import com.trustlink.backend.entity.ReputacionVendedor;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.OrdenEscrowRepository;
import com.trustlink.backend.repository.ReputacionVendedorRepository;
import com.trustlink.backend.service.ai.GeminiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sayyy helllooo
 * Explica en lenguaje natural POR QUÉ un vendedor tiene el score que
 * tiene, a partir de los mismos numeros que ya calcula ScoringService
 * (ventas exitosas, compradores distintos, disputas). No promete
 * beneficios de credito no confirmados, solo explica el numero.
 * <p>
 * Usa {@link GeminiClient} para redactar la frase de forma mas natural,
 * pero SIEMPRE hay un texto de respaldo generado localmente con los
 * mismos datos: si la IA esta deshabilitada o falla, el panel de
 * reputacion/credito sigue mostrando una explicación igual de correcta.
 */
@Service
@RequiredArgsConstructor
public class ExplicacionScoreService {

    private final ReputacionVendedorRepository reputacionRepository;
    private final OrdenEscrowRepository ordenRepository;
    private final GeminiClient geminiClient;

    /** Cache simple en memoria: mismos numeros no vuelven a llamar a la IA. */
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public String explicarScore(Usuario vendedor) {
        ReputacionVendedor rep = reputacionRepository.findByUsuario(vendedor).orElse(null);

        if (rep == null || rep.getVentasExitosas() == 0) {
            return "Todavía no tienes ventas completadas, así que tu score empieza en 0. " +
                    "Se irá formando con cada compra que entregues y confirmen tus clientes.";
        }

        long disputas = ordenRepository.findByVendedorOrderByCreadoEnDesc(vendedor).stream()
                .filter(o -> o.getEstado() == EstadoOrden.EN_DISPUTA)
                .count();

        String claveCache = vendedor.getId() + ":" + rep.getScoreActual() + ":" + rep.getVentasExitosas() +
                ":" + rep.getCompradoresDistintos() + ":" + disputas;

        return cache.computeIfAbsent(claveCache, k -> {
            String fallback = explicacionFallback(rep, disputas);
            String prompt = "Eres un asistente que explica en lenguaje simple, sin jerga tecnica ni financiera, " +
                    "el score de reputación de un vendedor de un marketplace peruano. Reescribe la siguiente " +
                    "explicación en 1-2 frases claras y directas, en segunda persona (\"tu score...\"). " +
                    "NO menciones crédito, préstamos, techos de préstamo ni prometas ningún beneficio: solo " +
                    "explica por qué el score es ese número, usando exclusivamente los datos del texto original. " +
                    "No inventes datos nuevos. Responde solo con la frase final, sin comillas.\n\n" +
                    "Texto original: " + fallback;
            return geminiClient.generarOFallback(prompt, fallback);
        });
    }

    /**
     * Texto de respaldo sin IA: cubre exactamente los mismos datos que se
     * le pediría a Gemini, para que la calidad mínima esté garantizada.
     */
    private String explicacionFallback(ReputacionVendedor rep, long disputas) {
        String ventasTexto = rep.getVentasExitosas() + (rep.getVentasExitosas() == 1 ? " venta" : " ventas");
        String compradoresTexto = rep.getCompradoresDistintos() +
                (rep.getCompradoresDistintos() == 1 ? " persona diferente" : " personas diferentes");
        String disputasTexto = disputas == 0
                ? "sin ningún problema reportado"
                : (disputas == 1 ? "con 1 problema reportado" : "con " + disputas + " problemas reportados");

        return "Tu score es " + rep.getScoreActual() + " porque has completado " + ventasTexto +
                " con " + compradoresTexto + ", " + disputasTexto + ".";
    }
}
