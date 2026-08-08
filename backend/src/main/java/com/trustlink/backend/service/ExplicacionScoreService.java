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
 * Explica en lenguaje natural POR QUÉ un vendedor tiene el score que
 * tiene, a partir de los mismos numeros que ya calcula ScoringService
 * (ventas exitosas, compradores distintos, disputas). No promete
 * beneficios de credito no confirmados — solo explica el numero.
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
            String prompt = "Eres un asistente de confianza dentro de TrustLink, un marketplace peruano " +
            "donde vendedores y compradores hacen transacciones protegidas por escrow en blockchain. " +
            "Tu única tarea en este momento es explicarle al vendedor, en lenguaje cotidiano y cercano, " +
            "por qué tiene el score que tiene. Habla siempre en segunda persona (\"tu score...\", \"has completado...\"). " +
            "\n\n" +
            "DATOS DEL VENDEDOR (usa TODOS, no omitas ninguno):\n" +
            "- Score actual: " + rep.getScoreActual() + " puntos\n" +
            "- Ventas exitosas completadas: " + rep.getVentasExitosas() + "\n" +
            "- Compradores distintos que te han comprado: " + rep.getCompradoresDistintos() + "\n" +
            "- Problemas o disputas reportadas: " + disputas + "\n" +
            "\n" +
            "INSTRUCCIONES ESTRICTAS:\n" +
            "1. Escribe exactamente 2 frases. Ni más, ni menos.\n" +
            "2. La primera frase explica el score con los números concretos.\n" +
            "3. La segunda frase da un mensaje motivador honesto: si va bien, reconócelo; " +
            "   si tiene disputas, menciona que reducen el score sin ser alarmista.\n" +
            "4. Incluye el número exacto del score (" + rep.getScoreActual() + ") en la primera frase.\n" +
            "5. Menciona las ventas y los compradores distintos como factores positivos.\n" +
            "6. Si disputas > 0, menciónalas como factor que afecta el score, sin dramatizar.\n" +
            "7. Si disputas == 0, menciona que no tener problemas reportados es un punto a favor.\n" +
            "8. PROHIBIDO mencionar crédito, préstamos, techos de préstamo o cualquier beneficio futuro.\n" +
            "9. PROHIBIDO usar palabras técnicas: no digas blockchain, escrow, wallet, token, SBT.\n" +
            "10. PROHIBIDO inventar datos que no estén en los números de arriba.\n" +
            "11. Responde SOLO con las 2 frases. Sin comillas, sin introducción, sin explicación extra.\n" +
            "\n" +
            "Texto de referencia (puedes reescribirlo pero respeta todos sus datos): " + fallback;
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
