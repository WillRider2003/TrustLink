package com.trustlink.backend.service;

import com.trustlink.backend.service.ai.GeminiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Chatbot conversacional que resuelve dudas de un vendedor/comprador
 * nuevo sobre como funciona TrustLink (que es el escrow, como sube el
 * score, que pasa en una disputa, etc.), en lenguaje simple.
 * <p>
 * El contexto de la plataforma va fijo en cada prompt (no hay
 * "entrenamiento" ni base de datos vectorial: para el tamaño de este
 * FAQ, mandar el contexto completo en cada llamada es suficiente y
 * mucho mas simple de mantener). El historial de la conversacion lo
 * guarda el controller en la sesion HTTP y se lo pasa a este servicio
 * en cada mensaje nuevo.
 */
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final GeminiClient geminiClient;

    private static final String RESPUESTA_SIN_IA =
            "No puedo responder en este momento. Mientras tanto, puedes revisar las secciones de " +
            "Marketplace, Crédito y tu Perfil, o escribirle al equipo de TrustLink.";

    private static final String CONTEXTO_TRUSTLINK = """
            TrustLink es un marketplace peruano donde la gente compra y vende productos con el pago
            protegido: el dinero del comprador queda "guardado" (en custodia) y solo se le entrega al
            vendedor cuando el comprador confirma que recibió su producto con un código de 6 dígitos,
            o automáticamente pasado un plazo si el comprador no responde. Si algo sale mal, cualquiera
            de los dos puede "reportar un problema" y el equipo de TrustLink revisa el caso a mano.

            Cada vez que un vendedor completa una venta sin problemas, su "score de reputación" (0 a
            100) sube. El score se calcula con una fórmula simple y pública: pesa el número de ventas
            completadas y el número de compradores distintos (venderle siempre a la misma persona no
            ayuda tanto como venderle a gente distinta). No hay inteligencia artificial ni caja negra
            en el cálculo del score en sí, es una fórmula fija.

            Con un score más alto, el vendedor desbloquea un "techo de crédito" más alto en el Panel de
            Crédito (S/50 a S/350 según el rango de score) — es un límite de cuánto puede solicitar,
            pensado como beneficio futuro para vendedores con buen historial; hoy es un registro
            (mockup) y no un desembolso de dinero real todavía.

            Para poder vender hay que pedir ser "vendedor" desde la sección "Ser vendedor" y esperar
            aprobación. Cualquier usuario puede comprar sin ser vendedor.

            El superadmin es quien puede banear usuarios y resolver disputas manualmente si las partes
            no se ponen de acuerdo.

            Todo esto corre sobre tecnología blockchain por dentro, pero el usuario normal nunca
            necesita entender ni tocar wallets, gas, ni firmar nada — el sistema lo maneja todo de forma
            invisible para que se sienta como una compra normal.
            """;

    public String responder(String mensajeUsuario, List<String> historial) {
        StringBuilder historialTexto = new StringBuilder();
        for (String linea : historial) {
            historialTexto.append(linea).append("\n");
        }

        String prompt = "Eres el asistente de ayuda de TrustLink. Tu única función es resolver dudas " +
                "de vendedores y compradores nuevos sobre cómo funciona la plataforma, usando SOLO la " +
                "información del contexto de abajo. Responde en español, en 2-4 frases como máximo, en " +
                "tono cercano y simple, sin jerga técnica (no digas blockchain, wallet, gas, smart contract). " +
                "Si la pregunta no tiene relación con TrustLink o no puedes responderla con el contexto " +
                "dado, dilo honestamente y sugiere contactar al equipo de soporte — no inventes información.\n\n" +
                "CONTEXTO DE TRUSTLINK:\n" + CONTEXTO_TRUSTLINK + "\n\n" +
                "CONVERSACIÓN HASTA AHORA:\n" + historialTexto +
                "\nNueva pregunta del usuario: " + mensajeUsuario +
                "\n\nResponde solo con tu respuesta, sin comillas ni prefijos como \"Asistente:\".";

        return geminiClient.generarOFallback(prompt, RESPUESTA_SIN_IA);
    }
}
