/**
 * Lógica de la app de demo. Todo en memoria (TL_STATE de data.js),
 * nada persiste al recargar — es el comportamiento esperado para
 * una demo de hackathon: siempre arranca en un estado limpio y conocido.
 */

const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
  shop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
  orders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  credit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  contracts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 2l1.5 14h9L18 2"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>`,
  bot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 16h.01M16 16h.01"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>`,
  ban: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>`,
  trending: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  barChart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
};

function tlTiempoRelativoDemo(fechaIso) {
  const diffMs = Date.now() - new Date(fechaIso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

function tlRenderNotifBell(rol) {
  // La campana vive en el header superior fijo (estilo QuintaOla)
  const mount = document.getElementById('appHeaderNotifMount') || document.getElementById('topbarNotifMount');
  if (!mount) return;

  const notifs = tlGetNotificaciones(rol);
  const noLeidas = notifs.filter(n => !n.leido).length;

  mount.innerHTML = `
    <button class="notif-bell" id="notifBellBtn">
      ${ICONS.bell}
      ${noLeidas > 0 ? `<span class="notif-bell-badge">${noLeidas > 9 ? '9+' : noLeidas}</span>` : ''}
    </button>
    <div class="notif-panel" id="notifPanel">
      <div class="notif-panel-header">
        <span>Notificaciones</span>
        <button onclick="tlMarcarNotifLeidasDemo('${rol}')" class="notif-panel-markall">Marcar todas leídas</button>
      </div>
      <div class="notif-panel-list" id="notifPanelList">
        ${notifs.length ? notifs.map(n => `
          <div class="notif-item ${n.leido ? '' : 'unread'}">
            <div class="notif-item-title">${n.titulo}</div>
            <div class="notif-item-msg">${n.mensaje}</div>
            <div class="notif-item-time">${tlTiempoRelativoDemo(n.fecha)}</div>
          </div>
        `).join('') : `<div style="padding:24px; text-align:center; color:var(--tl-grey-600); font-size:0.82rem;">No tienes notificaciones todavía.</div>`}
      </div>
    </div>
  `;

  document.getElementById('notifBellBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('notifPanel').classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    if (panel && !panel.contains(e.target) && e.target.id !== 'notifBellBtn') panel.classList.remove('show');
  });
}

function tlMarcarNotifLeidasDemo(rol) {
  tlMarcarNotificacionesLeidas(rol);
  tlRenderNotifBell(rol);
}

function tlRequireRole() {
  const rol = sessionStorage.getItem('tl_rol');
  if (!rol || !TL_USERS[rol]) {
    window.location.href = 'login.html';
    return null;
  }
  TL_STATE.rolActivo = rol;
  return rol;
}

function tlLogout() {
  sessionStorage.removeItem('tl_rol');
  window.location.href = 'login.html';
}

function tlShowToast(text, variant = 'default') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${variant}`;
  el.innerHTML = `${variant === 'success' ? ICONS.check : ICONS.alert}<span>${text}</span>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ============ SIDEBAR ============ */
const SIDEBAR_LINKS = {
  comprador: [
    { href: 'marketplace.html', icon: 'shop', label: 'Marketplace' },
    { href: 'mis-pedidos.html', icon: 'orders', label: 'Mis compras' },
    { href: 'membresia.html', icon: 'shield', label: 'Mi membresía' },
    { href: 'solicitud-vendedor.html', icon: 'fileText', label: 'Ser vendedor' },
    { href: 'reportar-incidencia.html', icon: 'alert', label: 'Reportar incidencia' },
  ],
  vendedor: [
    { href: 'dashboard-vendedor.html', icon: 'home', label: 'Mi tienda' },
    { href: 'mis-pedidos.html', icon: 'orders', label: 'Ventas' },
    { href: 'dashboard-ventas.html', icon: 'barChart', label: 'Dashboard de ventas' },
    { href: 'credito.html', icon: 'credit', label: 'Crédito progresivo' },
    { href: 'reportar-incidencia.html', icon: 'alert', label: 'Reportar incidencia' },
  ],
  superadmin: [
    { href: 'admin.html', icon: 'shield', label: 'Panel admin' },
    { href: 'solicitudes.html', icon: 'inbox', label: 'Solicitudes vendedor' },
    { href: 'incidencias-admin.html', icon: 'alert', label: 'Incidencias' },
    { href: 'creditos-admin.html', icon: 'credit', label: 'Créditos pendientes' },
    { href: 'auditoria.html', icon: 'barChart', label: 'Auditoría' },
  ],
};

function tlRenderSidebar(rol, activePage) {
  const mount = document.getElementById('sidebarMount');
  if (!mount) return;
  const user = TL_USERS[rol];
  const links = SIDEBAR_LINKS[rol] || [];

  const roleLabel = { comprador: 'Comprador', vendedor: 'Vendedor', superadmin: 'Superadmin' }[rol];
  const pendientesCount = rol === 'superadmin'
    ? tlGetSolicitudes().filter(s => s.estado === 'pendiente').length
    : 0;

  mount.innerHTML = `
    <header class="app-header" id="appHeader">
      <div class="app-header-brand">
        <button class="menu-toggle" id="menuToggleHeader" style="margin-right:4px;">${ICONS.menu}</button>
        <img src="img/logo.png" alt="TrustLink" onerror="this.style.display='none'">
        <div class="app-header-brand-text">Trust<span>Link</span></div>
      </div>
      <div class="app-header-actions">
        <button type="button" class="icon-btn" id="darkModeToggle" title="Cambiar tema">
          <span id="darkModeIcon">${ICONS.moon}</span>
        </button>
        <div id="appHeaderNotifMount" style="position:relative;"></div>
        <div class="app-header-user" title="${user.wallet}">
          <span class="app-header-user-name">${user.nombre}</span>
          <span class="app-header-user-avatar">${user.avatarInicial}</span>
        </div>
      </div>
    </header>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-role-badge">${ICONS.shield}${roleLabel} · Demo</div>
      <div class="sidebar-section-label">Navegación</div>
      <nav class="sidebar-nav">
        ${links.map(l => `
          <a href="${l.href}" class="sidebar-link ${activePage === l.href ? 'active' : ''}">
            ${ICONS[l.icon]}<span>${l.label}</span>
            ${l.href === 'solicitudes.html' && pendientesCount > 0 ? `<span class="sidebar-link-badge">${pendientesCount}</span>` : ''}
          </a>`).join('')}
        <div class="sidebar-section-label">Web3</div>
        <a href="contratos.html" class="sidebar-link ${activePage === 'contratos.html' ? 'active' : ''}">
          ${ICONS.contracts}<span>Contratos</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${user.avatarInicial}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.nombre}</div>
            <div class="sidebar-user-role">${user.wallet}</div>
          </div>
        </div>
        <a href="#" class="sidebar-exit" onclick="tlLogout(); return false;">${ICONS.logout}<span>Salir de demo</span></a>
      </div>
    </aside>
    <div class="sidebar-scrim" id="sidebarScrim"></div>
  `;

  const scrim = document.getElementById('sidebarScrim');
  scrim.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    scrim.classList.remove('show');
  });

  const headerMenuToggle = document.getElementById('menuToggleHeader');
  if (headerMenuToggle) headerMenuToggle.addEventListener('click', tlToggleSidebar);

  const darkBtn = document.getElementById('darkModeToggle');
  if (darkBtn) darkBtn.addEventListener('click', tlToggleDarkMode);
  tlSyncDarkModeIcon();
}

function tlToggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  try { localStorage.setItem('tl_dark_mode', isDark ? '1' : '0'); } catch (e) {}
  tlSyncDarkModeIcon();
}

function tlSyncDarkModeIcon() {
  const icon = document.getElementById('darkModeIcon');
  const label = document.getElementById('darkModeLabel');
  if (!icon) return;
  const isDark = document.body.classList.contains('dark');
  icon.innerHTML = isDark ? ICONS.sun : ICONS.moon;
  if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
}

function tlToggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarScrim').classList.toggle('show');
}

/* El widget flotante del chatbot (FAB + panel) vive en chatbot-widget.js,
   compartido entre la landing pública y las vistas internas. */

/* ============ MARKETPLACE ============ */
function tlRenderProductGrid(containerId, { onlyOwn = false, rol } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let productos = TL_STATE.productos;
  if (onlyOwn) {
    productos = productos.filter(p => p.creadoPor === 'vendedor-demo');
  }

  if (productos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${ICONS.bag}
        <div class="empty-state-title">Todavía no hay productos</div>
        <div class="empty-state-desc">Publica tu primer producto para verlo aquí.</div>
      </div>`;
    return;
  }

  container.innerHTML = productos.map(p => `
    <div class="product-card">
      <img src="${p.img}" class="product-card-img" alt="${p.nombre}" onerror="this.src='https://placehold.co/400x400/2563eb/ffffff?text=TrustLink'">
      <div class="product-card-body">
        <div class="product-card-name">${p.nombre}</div>
        <div class="product-card-seller">${ICONS.shield}Vendedor Demo · reputación verificada</div>
        <div class="product-card-price">S/ ${p.precio.toFixed(2)}</div>
        <div class="product-card-footer">
          ${rol === 'comprador'
            ? `<button class="btn btn-primary btn-sm btn-block" onclick="tlOpenComprarModal('${p.id}')">${ICONS.lock} Comprar con escrow</button>`
            : `<span class="badge ${p.creadoPor === 'vendedor-demo' ? 'badge-green' : 'badge-dark'}">${p.creadoPor === 'vendedor-demo' ? 'Publicado por ti' : 'Producto demo'}</span>`
          }
        </div>
      </div>
    </div>
  `).join('');
}

/* ============ PUBLICAR PRODUCTO (vendedor) ============ */
let tlPendingImageDataUrl = null;

function tlInitPublicarForm() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const preview = document.getElementById('dropzonePreview');
  const form = document.getElementById('publicarForm');
  if (!form) return;

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      tlPendingImageDataUrl = ev.target.result;
      preview.src = tlPendingImageDataUrl;
      preview.style.display = 'block';
      document.getElementById('dropzoneText').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('prodNombre').value.trim();
    const precio = parseFloat(document.getElementById('prodPrecio').value);
    const desc = document.getElementById('prodDesc').value.trim();

    if (!nombre || !precio) {
      tlShowToast('Completa nombre y precio del producto');
      return;
    }

    const nuevo = {
      id: 'p-' + Date.now(),
      nombre,
      precio,
      desc: desc || 'Sin descripción adicional.',
      img: tlPendingImageDataUrl || 'https://placehold.co/400x400/2563eb/ffffff?text=TrustLink',
      creadoPor: 'vendedor-demo',
    };
    TL_STATE.productos.unshift(nuevo);
    tlShowToast('Producto publicado. Ya es visible para los compradores.', 'success');
    form.reset();
    preview.style.display = 'none';
    document.getElementById('dropzoneText').style.display = 'block';
    tlPendingImageDataUrl = null;
    tlRenderProductGrid('misProductosGrid', { onlyOwn: true, rol: 'vendedor' });
  });
}

/* ============ MODAL COMPRAR / ESCROW ANIMADO ============ */
function tlOpenComprarModal(productoId) {
  const producto = TL_STATE.productos.find(p => p.id === productoId);
  if (!producto) return;

  document.getElementById('modalProductoNombre').textContent = producto.nombre;
  document.getElementById('modalProductoPrecio').textContent = `S/ ${producto.precio.toFixed(2)}`;
  document.getElementById('modalProductoImg').src = producto.img;
  document.getElementById('comprarOverlay').dataset.productoId = productoId;
  document.getElementById('comprarOverlay').classList.add('show');
  document.getElementById('escrowTimeline').innerHTML = tlEscrowStepsHTML(0);
  document.getElementById('btnConfirmarCompra').disabled = false;
  document.getElementById('btnConfirmarCompra').style.display = 'inline-flex';
}

function tlCloseComprarModal() {
  document.getElementById('comprarOverlay').classList.remove('show');
}

const ESCROW_STEPS = [
  { title: 'Depósito en escrow', desc: 'El comprador deposita el pago en el contrato TrustLinkEscrow. El dinero queda bloqueado on-chain.', fn: 'crearOrden()' },
  { title: 'Notificación al vendedor', desc: 'El vendedor recibe la orden y debe confirmar el envío desde "Mis pedidos".', fn: null },
];

function tlEscrowStepsHTML(activeStep) {
  return ESCROW_STEPS.map((s, i) => {
    let cls = '';
    if (i < activeStep) cls = 'done';
    else if (i === activeStep) cls = 'active';
    const icon = i < activeStep ? ICONS.check : (i === activeStep ? ICONS.clock : '');
    return `
      <div class="escrow-step ${cls}">
        <div class="escrow-step-dot">${icon || (i + 1)}</div>
        <div class="escrow-step-body">
          <div class="escrow-step-title">${s.title}</div>
          <div class="escrow-step-desc">${s.desc}</div>
          ${s.fn ? `<div class="escrow-step-meta">${s.fn}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/**
 * Crea el pedido en estado ESPERANDO_VENDEDOR (el dinero queda en
 * escrow, pero el pago solo se libera cuando AMBAS partes confirman
 * la entrega — ver tlConfirmarParteDelPedido en mis-pedidos.html).
 */
function tlConfirmarCompra() {
  const btn = document.getElementById('btnConfirmarCompra');
  btn.disabled = true;
  const timeline = document.getElementById('escrowTimeline');
  let step = 0;

  function advance() {
    step++;
    timeline.innerHTML = tlEscrowStepsHTML(step);
    if (step < ESCROW_STEPS.length) {
      setTimeout(advance, 900);
    } else {
      btn.style.display = 'none';

      const productoId = document.getElementById('comprarOverlay').dataset.productoId;
      const producto = TL_STATE.productos.find(p => p.id === productoId);
      if (producto) {
        const nuevaOrden = {
          id: 'ord-' + Date.now(),
          producto: producto.nombre,
          monto: producto.precio,
          estado: 'ESPERANDO_VENDEDOR',
          comprador: 'Comprador Demo',
          fecha: new Date().toISOString().slice(0, 10),
          txHash: '0x' + Math.random().toString(16).slice(2, 6) + '...' + Math.random().toString(16).slice(2, 6),
          confirmacionVendedor: false,
          confirmacionComprador: false,
        };
        TL_STATE.ordenes.unshift(nuevaOrden);
        tlAgregarNotificacion('vendedor', 'Nuevo pedido recibido', `Comprador Demo pidió tu "${producto.nombre}". Confirma el envío desde "Ventas".`);
      }

      tlShowToast('Dinero depositado en escrow. Esperando que el vendedor confirme el envío.', 'success');
    }
  }
  setTimeout(advance, 500);
}

/* ============ INIT COMÚN POR PÁGINA ============ */
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const page = body.dataset.page;
  if (!page || page === 'login') return;

  const rol = tlRequireRole();
  if (!rol) return;

  tlRenderSidebar(rol, body.dataset.activeLink || '');
  tlRenderNotifBell(rol);
  tlRenderChatbotWidget();

  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) menuToggle.addEventListener('click', tlToggleSidebar);
});
