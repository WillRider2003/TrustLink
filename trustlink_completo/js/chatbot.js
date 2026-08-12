/**
 * CHATBOT TRUSTLINK — con IA real + fallback offline
 * -----------------------------------------------------------------
 * Cada pregunta del usuario se manda primero a la Edge Function
 * "chatbot-ia" de Supabase, que llama a Claude con un system prompt
 * que conoce toda la plataforma (escrow, crédito, disputas, etc.),
 * así el bot puede responder preguntas libres y no solo las que
 * calzan exacto con una palabra clave.
 *
 * Si la IA no está configurada, no hay internet, o la llamada falla
 * por cualquier motivo, el chatbot cae automáticamente al motor de
 * reglas por palabras clave (TL_CHAT_RULES) — así nunca se rompe ni
 * deja al usuario sin respuesta, incluso en la demo sin backend.
 *
 * El chatbot vive en TODAS las páginas autenticadas (no solo la
 * landing): basta con tener <div id="chatbotMount"></div> en el HTML
 * y cargar este archivo + chatbot-widget.js.
 */

const TL_CHAT_RULES = [
  {
    keys: ['escrow', 'como funciona el escrow', 'deposito', 'dinero seguro', 'garantia'],
    reply: 'Cuando compras, tu pago queda retenido en garantía (escrow) — el vendedor todavía no lo recibe. Cuando marca el pedido como "llegado", te llega un código de 6 dígitos por notificación. Tienes 15 minutos para ingresarlo y confirmar que todo está bien; recién ahí se libera el pago al vendedor.',
  },
  {
    keys: ['codigo', 'código', '6 digitos', 'confirmar entrega', '15 minutos'],
    reply: 'El código de 6 dígitos te llega por notificación apenas el vendedor marca tu pedido como "llegado". Tienes 15 minutos para ingresarlo en la página del pedido. Si no confirmas a tiempo, tu cuenta queda bloqueada 12 horas para nuevas compras — así que revisa tus notificaciones seguido.',
  },
  {
    keys: ['credito', 'préstamo', 'prestamo', 'yape credito', 'financiamiento', 'interes'],
    reply: 'Todo usuario nuevo empieza con S/230 de crédito para comprar en la plataforma. Si eres vendedor, puedes solicitar préstamos adicionales al superadmin con 12% de interés mensual, aceptando un trato digital. Si no pagas a tiempo, puedes aplazar 5 días con recargo del 5%; si tampoco pagas después de eso, se reporta a la SBS. Pagar a tiempo mejora tu reputación.',
  },
  {
    keys: ['membresia', 'membresía', 'trusti', 'nivel', 'fidelizacion', 'fidelización'],
    reply: 'Como comprador subes de nivel de membresía (Trusti Blue, Silver, Gold y Black) según cuánto llevas comprado y confirmado en la plataforma. Cada nivel superior da más beneficios, como soporte prioritario en incidencias. Puedes ver tu progreso en "Mi membresía".',
  },
  {
    keys: ['baneo', 'baneado', 'suspendida', 'suspension', 'suspensión', 'cuenta bloqueada permanente'],
    reply: 'El superadmin puede suspender una cuenta si detecta un mal uso reiterado de la plataforma. Si tu cuenta está suspendida, no podrás iniciar sesión hasta que el superadmin la reactive.',
  },
  {
    keys: ['reputacion', 'reputación', 'score', 'confianza'],
    reply: 'Tu score de reputación (0 a 100) sube con cada venta exitosa que completas y con cada crédito que pagas a tiempo. Es tu historial de confianza dentro de la plataforma.',
  },
  {
    keys: ['disputa', 'reclamo', 'no llego', 'no llegó', 'estafa', 'incidencia', 'problema con mi pedido'],
    reply: 'Si algo salió mal con un pedido (no llegó, llegó dañado, no es lo que pediste), puedes reportar una incidencia con fotos desde "Reportar incidencia" en el menú. El superadmin revisa el caso y decide si se reembolsa al comprador o se libera el pago al vendedor.',
  },
  {
    keys: ['bloqueo', 'bloqueada', '12 horas', 'no puedo comprar'],
    reply: 'Si tu cuenta está bloqueada, es porque no confirmaste un pedido dentro de los 15 minutos después de marcado como "llegado". El bloqueo dura 12 horas desde ese momento — después vuelves a poder comprar con normalidad.',
  },
  {
    keys: ['vendedor', 'ser vendedor', 'quiero vender'],
    reply: 'Puedes solicitar convertirte en vendedor desde "Ser vendedor" en el menú — llenas un formulario con tu DNI, rubro y una descripción de tu negocio, y el superadmin revisa tu solicitud.',
  },
  {
    keys: ['hola', 'buenas', 'hey', 'buenos dias', 'buenas tardes'],
    reply: '¡Hola! Soy el asistente de TrustLink 👋 Puedo ayudarte con el escrow, el código de confirmación, el crédito, las incidencias o cómo convertirte en vendedor. ¿Qué necesitas saber?',
  },
  {
    keys: ['gracias', 'ok gracias', 'perfecto'],
    reply: '¡De nada! Cualquier otra duda, aquí estoy.',
  },
];

const TL_CHAT_FALLBACK = 'No estoy seguro de haber entendido bien tu pregunta. Puedo ayudarte con el escrow, el código de confirmación, el crédito, las incidencias o cómo convertirte en vendedor — ¿sobre cuál te gustaría saber más?';

const TL_CHAT_SUGGESTIONS = ['¿Cómo funciona el escrow?', '¿Qué hago con el código de 6 dígitos?', '¿Cómo pido crédito?', '¿Cómo reporto un problema?', '¿Cómo funcionan las membresías?'];

/**
 * URL de la Edge Function de IA. Se arma a partir de SUPABASE_URL
 * (definida en supabase-client.js) reemplazando el dominio, que es
 * el patrón estándar de Supabase para Edge Functions.
 */
function tlChatIaEndpoint() {
  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('PEGA_AQUI')) return null;
  return SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co') + '/chatbot-ia';
}

// Guarda el historial reciente de la conversación (para dar contexto
// a la IA), sin persistirlo — se pierde al recargar la página, y eso
// está bien para un chatbot de soporte.
let tlChatHistorial = [];

/**
 * Intenta responder con IA real. Devuelve el texto de la respuesta,
 * o null si falló (para que el caller haga fallback al motor de reglas).
 */
async function tlChatPreguntarIA(mensaje) {
  const endpoint = tlChatIaEndpoint();
  if (!endpoint) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // no colgar el chat más de 12s

    // Supabase Edge Functions verifican el JWT del header Authorization
    // por defecto. Sin ese header responden 401 y el chat caía en
    // silencio al modo offline aunque las keys estuvieran bien
    // configuradas. Se usa el token de sesión si hay usuario logueado,
    // o la anon key (que también es un JWT válido) si no.
    let bearer = SUPABASE_ANON_KEY;
    try {
      if (typeof sb !== 'undefined') {
        const { data } = await sb.auth.getSession();
        if (data && data.session) bearer = data.session.access_token;
      }
    } catch (e) { /* sin sesión: se usa la anon key */ }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + bearer,
      },
      body: JSON.stringify({ mensaje, historial: tlChatHistorial.slice(-6) }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn('chatbot-ia HTTP', resp.status, await resp.text().catch(() => ''));
      return null;
    }
    const data = await resp.json();
    if (data.error || !data.respuesta) return null;
    return data.respuesta;
  } catch (err) {
    console.warn('Chatbot IA no disponible, usando fallback offline:', err.message);
    return null;
  }
}

function tlChatFindReplyOffline(message) {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const rule of TL_CHAT_RULES) {
    if (rule.keys.some(k => normalized.includes(k))) {
      return rule.reply;
    }
  }
  return TL_CHAT_FALLBACK;
}

function tlChatInit() {
  const fab = document.getElementById('chatbotFab');
  const panel = document.getElementById('chatbotPanel');
  const closeBtn = document.getElementById('chatbotClose');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');
  const suggestionsWrap = document.getElementById('chatbotSuggestions');

  if (!fab || !panel) return;

  suggestionsWrap.innerHTML = TL_CHAT_SUGGESTIONS
    .map(s => `<button type="button" class="chatbot-suggestion">${s}</button>`)
    .join('');

  suggestionsWrap.querySelectorAll('.chatbot-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.textContent;
      form.requestSubmit();
    });
  });

  fab.addEventListener('click', () => {
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) input.focus();
  });
  closeBtn.addEventListener('click', () => panel.classList.remove('show'));

  function appendMsg(text, who) {
    const div = document.createElement('div');
    div.className = `chat-msg ${who}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function appendTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.innerHTML = '<div class="chat-msg-typing"><span></span><span></span><span></span></div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    appendMsg(text, 'user');
    input.value = '';

    const typingEl = appendTyping();

    // Intenta IA real primero; si no responde en el timeout o falla,
    // cae al motor de reglas offline sin que el usuario note el cambio.
    let replyText = await tlChatPreguntarIA(text);
    let viaIA = replyText !== null;
    if (!replyText) {
      replyText = tlChatFindReplyOffline(text);
    }

    typingEl.remove();
    appendMsg(replyText, 'bot');

    tlChatHistorial.push({ role: 'user', content: text });
    tlChatHistorial.push({ role: 'assistant', content: replyText });
    if (tlChatHistorial.length > 12) tlChatHistorial = tlChatHistorial.slice(-12);
  });
}

document.addEventListener('DOMContentLoaded', tlChatInit);
