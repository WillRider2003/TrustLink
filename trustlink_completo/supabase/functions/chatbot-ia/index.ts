// ============================================================
// TRUSTLINK — Edge Function: chatbot-ia (Gemini + pool + fallback)
// ============================================================
// Recibe { mensaje, historial } y responde usando la API de
// Gemini (Google), con un system prompt que describe toda la
// plataforma: escrow, crédito, reputación, disputas, roles, etc.
// Así el chatbot puede responder preguntas libres del usuario,
// no solo las que calzan con palabras clave exactas.
//
// PROVEEDOR PRINCIPAL: Gemini, con POOL de API keys.
//   - Configura una o varias keys en la variable de entorno
//     GEMINI_API_KEYS, separadas por coma: "key1,key2,key3".
//   - La función prueba cada key en orden. Si una falla (rate
//     limit del free tier, key inválida, error del servidor),
//     automáticamente prueba la siguiente — el usuario nunca ve
//     el error, solo tarda un poco más esa respuesta puntual.
//   - Con una sola key en GEMINI_API_KEYS también funciona.
//
// FALLBACK OPCIONAL: si TODAS las keys de Gemini fallan (o no hay
// ninguna configurada) y existe ANTHROPIC_API_KEY, la función
// reintenta con Claude antes de rendirse. Es opcional: si no
// configuras esa variable, simplemente no se usa.
//
// Si absolutamente todo falla, la función devuelve un error 503 y
// el frontend (js/chatbot.js) cae automáticamente al motor de
// respuestas predefinidas — el chatbot nunca se rompe para el
// usuario final, incluso sin ninguna IA configurada.
//
// Ver GUIA_GEMINI.md para el paso a paso de despliegue.
// ============================================================

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Alias que Google mantiene apuntando siempre a su modelo Flash
// GA (uso general, buena relación precio/calidad) más reciente —
// hoy en día resuelve a gemini-3.6-flash. Usar el alias evita
// tener que editar y volver a desplegar esta función cada vez que
// Google saca un modelo nuevo. Si en algún momento quieres fijar
// una versión exacta (por estabilidad de benchmarks, por ejemplo),
// reemplaza este valor por algo como 'gemini-3.6-flash'.
const GEMINI_MODEL = 'gemini-flash-latest';

const SYSTEM_PROMPT = `Eres el asistente virtual de TrustLink, un marketplace peruano para vendedores informales (ambulantes, negocios sin historial crediticio formal) construido para un hackathon.

Cómo funciona la plataforma (responde SIEMPRE con esta información real, nunca inventes otra cosa):

1. ESCROW: cuando un comprador paga un producto, el dinero queda retenido en garantía (no llega al vendedor todavía). El vendedor marca el pedido como "enviado" → "en camino" → "llegado". Cuando marca "llegado", al comprador le llega un código de 6 dígitos por notificación. El comprador tiene 15 MINUTOS para ingresar ese código y confirmar que todo llegó bien. Solo ahí se libera el dinero al vendedor. Si el comprador no confirma a tiempo, su cuenta queda bloqueada 12 horas para nuevas compras (para evitar abuso del sistema).

2. CRÉDITO: todo usuario nuevo empieza con S/ 230 de crédito de bienvenida para poder comprar en la demo. Los vendedores, además, pueden solicitar préstamos adicionales al superadmin (estilo "Yape Créditos"): piden un monto, aceptan un trato digital, y si se los aprueban lo reciben y luego lo devuelven con un interés del 12% MENSUAL dentro de 30 días. Si no pueden pagar a tiempo, pueden aplazar el pago 5 días UNA sola vez (con 5% de recargo sobre el saldo). Si tras el aplazamiento tampoco pagan, el superadmin reporta el préstamo a la SBS (tal como aceptaron en el trato digital) y baja su score de reputación. Pagar a tiempo mejora su score.

3. REPUTACIÓN: el score de vendedor (0 a 100) se calcula según el monto total vendido y confirmado (no la cantidad de ventas) — con retornos decrecientes, así que vender pocos productos caros pesa más que vender muchos productos muy baratos. Pagar créditos a tiempo también suma puntos; que te reporten a la SBS los resta.

4. DISPUTAS / INCIDENCIAS: tanto comprador como vendedor pueden reportar una incidencia (producto dañado, no llegó, no es lo pedido, comprador no confirma, etc.) adjuntando evidencia (imágenes, PDF, Word o Excel, hasta 20MB por archivo). El superadmin recibe una notificación apenas se reporta, revisa el caso y decide: si falla a favor del comprador, se le reembolsa; si falla a favor del vendedor, se libera el pago.

5. ROLES: todo usuario se registra como "comprador". Desde su panel puede solicitar convertirse en "vendedor" (llenando un formulario con DNI, rubro, descripción del negocio). El superadmin revisa y aprueba o rechaza esa solicitud. El superadmin no compra ni vende: no tiene acceso al Marketplace, solo administra la plataforma.

6. MEMBRESÍAS TRUSTI: los compradores suben de nivel de fidelización (Trusti Blue → Silver → Gold → Black) automáticamente según cuánto llevan comprado y confirmado en soles. Cada nivel da más beneficios (soporte prioritario en disputas, resolución más rápida, etc.). Pueden ver su progreso y cuánto les falta para el siguiente nivel en "Mi membresía".

7. BANEO: el superadmin puede suspender (banear) una cuenta que incumple las reglas de la plataforma; un usuario baneado no puede iniciar sesión hasta que lo reactiven.

8. AUDITORÍA: el superadmin tiene un panel de auditoría con el registro de todas las acciones importantes de la plataforma (logins, logouts, pedidos, créditos, cambios de rol, baneos, disputas resueltas, etc.), descargable en CSV.

9. Hay también una DEMO estática (sin necesidad de registrarse) pensada para mostrar la plataforma rápidamente a un jurado, accesible desde el login.

Instrucciones de estilo:
- Responde siempre en español, de forma breve y clara (2-4 oraciones normalmente).
- Si te preguntan algo que no tiene que ver con TrustLink, redirige amablemente el tema.
- No inventes funciones que no existen (no hay blockchain real activa en esta versión, es un sistema de garantía simulado con base de datos).
- Si el usuario parece confundido o frustrado con un pedido específico, sugiere revisar "Mis pedidos" o usar el formulario de "Reportar incidencia".`;

interface MensajeChat {
  role: string;
  content: string;
}

/** Lee el pool de keys de Gemini desde GEMINI_API_KEYS (o GEMINI_API_KEY si solo hay una). */
function tlGetGeminiKeys(): string[] {
  const raw = Deno.env.get('GEMINI_API_KEYS') || Deno.env.get('GEMINI_API_KEY') || '';
  return raw.split(',').map((k) => k.trim()).filter(Boolean);
}

/** Convierte el historial { role: 'user'|'assistant', content } al formato de Gemini. */
function tlArmarBodyGemini(systemPrompt: string, mensajes: MensajeChat[]) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: mensajes.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 400 },
  };
}

type ResultadoGemini =
  | { ok: true; texto: string }
  | { ok: false; status: number; detalle: string };

async function tlLlamarGemini(apiKey: string, body: unknown): Promise<ResultadoGemini> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const detalle = await resp.text();
    return { ok: false, status: resp.status, detalle };
  }

  const data = await resp.json();
  const texto = (data.candidates?.[0]?.content?.parts || [])
    .map((p: { text?: string }) => p.text || '')
    .join('')
    .trim();

  if (!texto) {
    return { ok: false, status: 502, detalle: 'Respuesta vacía de Gemini: ' + JSON.stringify(data).slice(0, 300) };
  }
  return { ok: true, texto };
}

/** Fallback opcional a Claude (Anthropic), solo si ANTHROPIC_API_KEY está configurada. */
async function tlLlamarAnthropicFallback(
  apiKey: string,
  systemPrompt: string,
  mensajes: MensajeChat[],
): Promise<string | null> {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 400,
        system: systemPrompt,
        messages: mensajes,
      }),
    });
    if (!resp.ok) {
      console.error('Fallback a Anthropic también falló:', await resp.text());
      return null;
    }
    const data = await resp.json();
    const bloque = (data.content || []).find((b: { type: string }) => b.type === 'text');
    return bloque?.text || null;
  } catch (err) {
    console.error('Excepción en fallback a Anthropic:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { mensaje, historial } = await req.json();

    if (!mensaje || typeof mensaje !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta el mensaje' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // historial: últimos mensajes de la conversación, para dar contexto
    // (el frontend manda como máximo los últimos 6 turnos para no gastar tokens de más)
    const mensajes: MensajeChat[] = [
      ...(Array.isArray(historial) ? historial : []),
      { role: 'user', content: mensaje },
    ];

    const geminiKeys = tlGetGeminiKeys();
    const bodyGemini = tlArmarBodyGemini(SYSTEM_PROMPT, mensajes);

    let texto: string | null = null;
    let ultimoError = '';

    // Pool: prueba cada key de Gemini en orden. Si una falla (rate limit
    // del free tier, key revocada, error transitorio del servidor),
    // pasa a la siguiente sin que el usuario note nada.
    for (const key of geminiKeys) {
      const resultado = await tlLlamarGemini(key, bodyGemini);
      if (resultado.ok) {
        texto = resultado.texto;
        break;
      }
      ultimoError = `Gemini respondió ${resultado.status}: ${resultado.detalle}`;
      console.warn('Una key de Gemini falló, probando la siguiente del pool:', ultimoError);
    }

    // Si Gemini no está configurado o todas sus keys fallaron, intenta
    // Claude como respaldo (solo si el secreto existe).
    if (!texto) {
      const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (anthropicKey) {
        texto = await tlLlamarAnthropicFallback(anthropicKey, SYSTEM_PROMPT, mensajes);
      }
    }

    if (!texto) {
      console.error('Todos los proveedores de IA fallaron. Último error de Gemini:', ultimoError || '(sin keys configuradas)');
      return new Response(JSON.stringify({ error: 'IA no disponible' }), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ respuesta: texto }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
