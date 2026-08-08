/**
 * CHATBOT DE DEMO — 100% offline, sin backend ni API key.
 * Empareja palabras clave contra un banco de respuestas sobre
 * TrustLink. No es IA real; es un motor de reglas simple pensado
 * para verse bien y responder rápido en la demo, sin depender de
 * conexión a internet ni de una key de Gemini el día de la presentación.
 *
 * Cada respuesta del bot incluye un botón "escuchar" que reproduce
 * /audios/<audioId>.mp3. Esos mp3 se generan con ElevenLabs a partir
 * del guion en /audios/<audioId>.md — mientras no exista el mp3, el
 * botón avisa "Audio pendiente" en vez de fallar en silencio.
 */

const TL_CHAT_RULES = [
  {
    keys: ['escrow', 'como funciona el escrow', 'deposito', 'dinero seguro'],
    audioId: 'escrow',
    reply: 'El escrow funciona así: el comprador deposita el pago en el contrato TrustLinkEscrow, el dinero queda bloqueado on-chain (nadie lo puede tocar, ni siquiera nosotros), el vendedor entrega el producto, el comprador confirma con un código, y recién ahí el contrato libera el pago al vendedor automáticamente.',
  },
  {
    keys: ['credito', 'préstamo', 'prestamo', 'yape credito', 'financiamiento'],
    audioId: 'credito',
    reply: 'El crédito progresivo funciona como un "Yape Créditos" on-chain: empiezas en S/50 según tu score de reputación, y cada venta exitosa registrada por el contrato TrustLinkReputation sube tu score. Al subir de nivel, se desbloquean montos mayores (S/100, S/250, S/500) — todo basado en tu historial real de ventas, no en papeles.',
  },
  {
    keys: ['reputacion', 'reputación', 'score', 'confianza', 'sbt', 'soulbound'],
    audioId: 'reputacion',
    reply: 'La reputación se guarda on-chain mediante un token no transferible (Soulbound Token) emitido por TrustLinkReputation.sol. Cada venta exitosa confirmada suma puntos, y ese historial no se puede vender ni transferir a otra cuenta — así evitamos que alguien "compre" reputación falsa.',
  },
  {
    keys: ['disputa', 'reclamo', 'no llego', 'estafa', 'fraude'],
    audioId: 'disputa',
    reply: 'Si hay un problema, el comprador puede reportar una disputa con reportarDisputa(). El superadmin revisa el caso y resuelve con resolverDisputa(), decidiendo si el dinero se libera al vendedor o se devuelve al comprador. Todo queda registrado en la blockchain, así que el proceso es auditable.',
  },
  {
    keys: ['arbitrum', 'blockchain', 'red', 'testnet', 'contrato'],
    audioId: 'arbitrum',
    reply: 'TrustLink corre sobre Arbitrum Sepolia (testnet), elegido por sus comisiones de gas mucho más bajas que Ethereum mainnet — clave para que microtransacciones de S/30 o S/50 sigan siendo rentables. Los contratos son TrustLinkEscrow.sol y TrustLinkReputation.sol, ambos verificables públicamente.',
  },
  {
    keys: ['ia', 'inteligencia artificial', 'ai', 'chatbot'],
    audioId: 'ia',
    reply: 'Nuestra propuesta usa IA en dos frentes: 1) scoring de riesgo para calcular cuánto crédito puede recibir cada vendedor según su comportamiento histórico, y 2) detección de patrones sospechosos, como ventas repetidas entre las mismas dos cuentas, que podrían indicar fraude para inflar reputación artificialmente.',
  },
  {
    keys: ['wallet', 'billetera', 'cripto', 'metamask'],
    audioId: 'wallet',
    reply: 'No necesitas saber de cripto para usar TrustLink: creamos una wallet automáticamente al registrarte (custodia gestionada por el backend), así que puedes operar con tu correo y contraseña normales sin instalar MetaMask ni preocuparte por frases semilla.',
  },
  {
    keys: ['vendedor informal', 'ambulante', 'quien puede vender'],
    audioId: 'vendedor-informal',
    reply: 'TrustLink está pensado para vendedores informales — como los que venden en la calle o por redes sociales — que hoy no tienen forma de generar un historial crediticio formal. Cada venta exitosa en la plataforma construye ese historial de forma verificable.',
  },
  {
    keys: ['hola', 'buenas', 'hey', 'buenos dias', 'buenas tardes'],
    audioId: 'saludo',
    reply: '¡Hola! Soy el asistente de TrustLink 👋 Puedo explicarte cómo funciona el escrow, el sistema de crédito progresivo, la reputación on-chain o los contratos que usamos en Arbitrum. ¿Qué te gustaría saber?',
  },
  {
    keys: ['gracias', 'ok gracias', 'perfecto'],
    audioId: 'gracias',
    reply: '¡De nada! Si quieres, puedes explorar el marketplace o el panel de crédito para ver estos flujos en acción.',
  },
];

const TL_CHAT_FALLBACK = 'Buena pregunta — en la demo puedo hablarte sobre el escrow, el sistema de crédito progresivo, la reputación on-chain (SBT) o los contratos en Arbitrum. ¿Sobre cuál te gustaría saber más?';
const TL_CHAT_FALLBACK_AUDIO_ID = 'fallback';

const TL_CHAT_SUGGESTIONS = ['¿Cómo funciona el escrow?', '¿Cómo funciona el crédito?', '¿Qué es la reputación on-chain?', '¿Qué pasa si hay una disputa?'];

/**
 * Carpeta donde viven los audios generados con ElevenLabs.
 * Cada respuesta tiene un audioId (ver TL_CHAT_RULES) que corresponde
 * a un archivo /audios/<audioId>.mp3. Mientras no exista el mp3,
 * en esa carpeta hay un <audioId>.md con el texto exacto que debe narrar
 * el audio, para que sea fácil generarlo en ElevenLabs y reemplazarlo.
 */
const TL_AUDIO_BASE_PATH = 'audios/';

function tlChatFindReply(message) {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita tildes

  for (const rule of TL_CHAT_RULES) {
    if (rule.keys.some(k => normalized.includes(k))) {
      return { text: rule.reply, audioId: rule.audioId };
    }
  }
  return { text: TL_CHAT_FALLBACK, audioId: TL_CHAT_FALLBACK_AUDIO_ID };
}

function tlChatInit() {
  const fab = document.getElementById('chatbotFab');
  const panel = document.getElementById('chatbotPanel');
  const closeBtn = document.getElementById('chatbotClose');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');
  const suggestionsWrap = document.getElementById('chatbotSuggestions');

  if (!fab || !panel) return; // el widget no está en esta página

  // El audio solo aplica al chatbot de la landing pública (explica
  // TrustLink a visitantes). El chatbot dentro de las vistas por rol
  // (comprador/vendedor/superadmin) es de soporte y no usa audio.
  const withAudio = document.body.dataset.page === 'landing';

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

  function appendMsg(text, who, audioId) {
    const div = document.createElement('div');
    div.className = `chat-msg ${who}`;
    const textSpan = document.createElement('span');
    textSpan.className = 'chat-msg-text';
    textSpan.textContent = text;
    div.appendChild(textSpan);

    if (who === 'bot' && audioId && withAudio) {
      div.appendChild(tlBuildAudioButton(audioId));
    }

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    appendMsg(text, 'user');
    input.value = '';

    const typingEl = appendTyping();
    const delay = 500 + Math.random() * 500; // simula tiempo de respuesta real
    setTimeout(() => {
      typingEl.remove();
      const { text: replyText, audioId } = tlChatFindReply(text);
      appendMsg(replyText, 'bot', audioId);
    }, delay);
  });

  // Añade el botón de audio al mensaje de bienvenida (solo en la landing)
  if (withAudio) {
    const welcomeMsg = messages.querySelector('.chat-msg.bot');
    if (welcomeMsg && !welcomeMsg.querySelector('.chat-audio-btn')) {
      const wrapped = document.createElement('span');
      wrapped.className = 'chat-msg-text';
      wrapped.textContent = welcomeMsg.textContent;
      welcomeMsg.textContent = '';
      welcomeMsg.appendChild(wrapped);
      welcomeMsg.appendChild(tlBuildAudioButton('saludo'));
    }
  }
}

/**
 * Crea el botón "escuchar" para un mensaje del bot. Intenta reproducir
 * /audios/<audioId>.mp3 (generado con ElevenLabs). Si el archivo todavía
 * no existe (solo está el .md placeholder), avisa en vez de fallar en
 * silencio, para que se note en la demo qué audios faltan grabar.
 */
let tlCurrentAudio = null;

function tlBuildAudioButton(audioId) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chat-audio-btn';
  btn.setAttribute('aria-label', 'Escuchar respuesta');
  btn.innerHTML = `
    <svg class="icon-play" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    <svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display:none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  `;

  btn.addEventListener('click', () => tlToggleAudio(btn, audioId));
  return btn;
}

function tlSetAudioBtnState(btn, playing) {
  btn.classList.toggle('playing', playing);
  btn.querySelector('.icon-play').style.display = playing ? 'none' : 'block';
  btn.querySelector('.icon-pause').style.display = playing ? 'block' : 'none';
}

function tlToggleAudio(btn, audioId) {
  // Si este mismo botón ya está reproduciendo, lo pausamos.
  if (tlCurrentAudio && tlCurrentAudio.dataset.btnRef === audioId && !tlCurrentAudio.paused) {
    tlCurrentAudio.pause();
    return;
  }

  // Detiene cualquier audio anterior en reproducción.
  if (tlCurrentAudio) {
    tlCurrentAudio.pause();
    if (tlCurrentAudio._btn) tlSetAudioBtnState(tlCurrentAudio._btn, false);
  }

  const audio = new Audio(`${TL_AUDIO_BASE_PATH}${audioId}.mp3`);
  audio.dataset.btnRef = audioId;
  audio._btn = btn;
  tlCurrentAudio = audio;

  audio.addEventListener('ended', () => tlSetAudioBtnState(btn, false));
  audio.addEventListener('pause', () => tlSetAudioBtnState(btn, false));
  audio.addEventListener('play', () => tlSetAudioBtnState(btn, true));
  audio.addEventListener('error', () => {
    tlSetAudioBtnState(btn, false);
    tlShowAudioPendingHint(btn);
  });

  audio.play().catch(() => tlShowAudioPendingHint(btn));
}

function tlShowAudioPendingHint(btn) {
  // El mp3 aún no fue generado con ElevenLabs — solo existe el .md guion.
  // En vez de fallar en silencio, avisamos brevemente en el propio botón.
  const original = btn.innerHTML;
  btn.classList.add('pending');
  btn.innerHTML = '<span class="chat-audio-pending-text">Audio pendiente</span>';
  setTimeout(() => {
    btn.classList.remove('pending');
    btn.innerHTML = original;
  }, 1800);
}

document.addEventListener('DOMContentLoaded', tlChatInit);
