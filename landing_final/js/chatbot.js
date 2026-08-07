/**
 * CHATBOT DE DEMO — 100% offline, sin backend ni API key.
 * Empareja palabras clave contra un banco de respuestas sobre
 * TrustLink. No es IA real; es un motor de reglas simple pensado
 * para verse bien y responder rápido en la demo, sin depender de
 * conexión a internet ni de una key de Gemini el día de la presentación.
 */

const TL_CHAT_RULES = [
  {
    keys: ['escrow', 'como funciona el escrow', 'deposito', 'dinero seguro'],
    reply: 'El escrow funciona así: el comprador deposita el pago en el contrato TrustLinkEscrow, el dinero queda bloqueado on-chain (nadie lo puede tocar, ni siquiera nosotros), el vendedor entrega el producto, el comprador confirma con un código, y recién ahí el contrato libera el pago al vendedor automáticamente.',
  },
  {
    keys: ['credito', 'préstamo', 'prestamo', 'yape credito', 'financiamiento'],
    reply: 'El crédito progresivo funciona como un "Yape Créditos" on-chain: empiezas en S/50 según tu score de reputación, y cada venta exitosa registrada por el contrato TrustLinkReputation sube tu score. Al subir de nivel, se desbloquean montos mayores (S/100, S/250, S/500) — todo basado en tu historial real de ventas, no en papeles.',
  },
  {
    keys: ['reputacion', 'reputación', 'score', 'confianza', 'sbt', 'soulbound'],
    reply: 'La reputación se guarda on-chain mediante un token no transferible (Soulbound Token) emitido por TrustLinkReputation.sol. Cada venta exitosa confirmada suma puntos, y ese historial no se puede vender ni transferir a otra cuenta — así evitamos que alguien "compre" reputación falsa.',
  },
  {
    keys: ['disputa', 'reclamo', 'no llego', 'estafa', 'fraude'],
    reply: 'Si hay un problema, el comprador puede reportar una disputa con reportarDisputa(). El superadmin revisa el caso y resuelve con resolverDisputa(), decidiendo si el dinero se libera al vendedor o se devuelve al comprador. Todo queda registrado en la blockchain, así que el proceso es auditable.',
  },
  {
    keys: ['arbitrum', 'blockchain', 'red', 'testnet', 'contrato'],
    reply: 'TrustLink corre sobre Arbitrum Sepolia (testnet), elegido por sus comisiones de gas mucho más bajas que Ethereum mainnet — clave para que microtransacciones de S/30 o S/50 sigan siendo rentables. Los contratos son TrustLinkEscrow.sol y TrustLinkReputation.sol, ambos verificables públicamente.',
  },
  {
    keys: ['ia', 'inteligencia artificial', 'ai', 'chatbot'],
    reply: 'Nuestra propuesta usa IA en dos frentes: 1) scoring de riesgo para calcular cuánto crédito puede recibir cada vendedor según su comportamiento histórico, y 2) detección de patrones sospechosos, como ventas repetidas entre las mismas dos cuentas, que podrían indicar fraude para inflar reputación artificialmente.',
  },
  {
    keys: ['wallet', 'billetera', 'cripto', 'metamask'],
    reply: 'No necesitas saber de cripto para usar TrustLink: creamos una wallet automáticamente al registrarte (custodia gestionada por el backend), así que puedes operar con tu correo y contraseña normales sin instalar MetaMask ni preocuparte por frases semilla.',
  },
  {
    keys: ['vendedor informal', 'ambulante', 'quien puede vender'],
    reply: 'TrustLink está pensado para vendedores informales — como los que venden en la calle o por redes sociales — que hoy no tienen forma de generar un historial crediticio formal. Cada venta exitosa en la plataforma construye ese historial de forma verificable.',
  },
  {
    keys: ['hola', 'buenas', 'hey', 'buenos dias', 'buenas tardes'],
    reply: '¡Hola! Soy el asistente de TrustLink 👋 Puedo explicarte cómo funciona el escrow, el sistema de crédito progresivo, la reputación on-chain o los contratos que usamos en Arbitrum. ¿Qué te gustaría saber?',
  },
  {
    keys: ['gracias', 'ok gracias', 'perfecto'],
    reply: '¡De nada! Si quieres, puedes explorar el marketplace o el panel de crédito para ver estos flujos en acción.',
  },
];

const TL_CHAT_FALLBACK = 'Buena pregunta — en la demo puedo hablarte sobre el escrow, el sistema de crédito progresivo, la reputación on-chain (SBT) o los contratos en Arbitrum. ¿Sobre cuál te gustaría saber más?';

const TL_CHAT_SUGGESTIONS = ['¿Cómo funciona el escrow?', '¿Cómo funciona el crédito?', '¿Qué es la reputación on-chain?', '¿Qué pasa si hay una disputa?'];

function tlChatFindReply(message) {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita tildes

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

  if (!fab || !panel) return; // el widget no está en esta página

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
      appendMsg(tlChatFindReply(text), 'bot');
    }, delay);
  });
}

document.addEventListener('DOMContentLoaded', tlChatInit);
