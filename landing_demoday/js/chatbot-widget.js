/**
 * Widget flotante del chatbot (FAB + panel), reutilizable en cualquier
 * página. No depende de app.js ni de sesión/rol — solo necesita
 * chatbot.js (motor de respuestas) y un <div id="chatbotMount"></div>
 * en el HTML.
 */

const TL_CHATBOT_ICONS = {
  bot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 16h.01M16 16h.01"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l18 18"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>`,
};

function tlRenderChatbotWidget() {
  const mount = document.getElementById('chatbotMount');
  if (!mount) return;
  mount.innerHTML = `
    <button class="chatbot-fab" id="chatbotFab" aria-label="Abrir chatbot">${TL_CHATBOT_ICONS.bot}</button>
    <div class="chatbot-panel" id="chatbotPanel">
      <div class="chatbot-header">
        <div class="chatbot-header-icon">${TL_CHATBOT_ICONS.bot}</div>
        <div class="chatbot-header-text">
          <div class="chatbot-header-title">Asistente TrustLink</div>
          <div class="chatbot-header-status">En línea</div>
        </div>
        <button class="chatbot-close" id="chatbotClose">${TL_CHATBOT_ICONS.x}</button>
      </div>
      <div class="chatbot-messages" id="chatbotMessages">
        <div class="chat-msg bot">¡Hola! Soy el asistente de TrustLink 👋 Pregúntame sobre el escrow, el crédito progresivo, la reputación on-chain o los contratos en Arbitrum.</div>
      </div>
      <div class="chatbot-suggestions" id="chatbotSuggestions"></div>
      <form class="chatbot-input-row" id="chatbotForm">
        <input type="text" id="chatbotInput" placeholder="Escribe tu pregunta..." autocomplete="off">
        <button type="submit" class="chatbot-send">${TL_CHATBOT_ICONS.send}</button>
      </form>
    </div>
  `;
  tlChatInit();
}
