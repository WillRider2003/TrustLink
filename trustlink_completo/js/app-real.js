/**
 * APP REAL — layout compartido (sidebar, notificaciones, toasts)
 * -----------------------------------------------------------------
 * Equivalente al app.js de la demo, pero conectado a Supabase real
 * en vez de datos en memoria. Cada página protegida debe:
 *   1. Tener <div id="sidebarMount"></div> y <div id="topbarNotifMount"></div>
 *   2. Cargar supabase-client.js ANTES de este archivo
 *   3. Llamar tlInitLayout('marketplace.html') al terminar de cargar
 */

const ICONS_REAL = {
  shop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
  orders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
  credit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>`,
  barChart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>`,
  // Ícono de cerrar profesional (X simétrica con remates redondeados)
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>`,
  contracts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>`,
  audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
};

const SIDEBAR_LINKS_REAL = {
  comprador: [
    { href: 'marketplace.html', icon: 'shop', label: 'Marketplace' },
    { href: 'carrito.html', icon: 'cart', label: 'Carrito' },
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
    { href: 'usuarios-admin.html', icon: 'inbox', label: 'Usuarios' },
    { href: 'solicitudes.html', icon: 'inbox', label: 'Solicitudes vendedor' },
    { href: 'incidencias-admin.html', icon: 'alert', label: 'Incidencias' },
    { href: 'creditos-admin.html', icon: 'credit', label: 'Créditos pendientes' },
    { href: 'auditoria.html', icon: 'audit', label: 'Auditoría' },
  ],
};

/** Nombre completo (nombre + apellido) para mostrar en header y sidebar. */
function tlNombreCompleto(perfil) {
  return [perfil.nombre, perfil.apellido].filter(Boolean).join(' ');
}

function tlInicialesDe(perfil) {
  const full = tlNombreCompleto(perfil);
  return full.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

/**
 * Renderiza el layout compartido estilo QuintaOla:
 *  - Header superior fijo con logo TrustLink, toggle de modo oscuro,
 *    campana de notificaciones y nombre completo del usuario.
 *  - Sidebar izquierda FIJA (no se recorta al hacer scroll).
 */
function tlRenderSidebarReal(perfil, activePage) {
  const mount = document.getElementById('sidebarMount');
  if (!mount) return;
  const links = SIDEBAR_LINKS_REAL[perfil.rol] || [];
  const roleLabel = { comprador: 'Comprador', vendedor: 'Vendedor', superadmin: 'Superadmin' }[perfil.rol];
  const nombreCompleto = tlNombreCompleto(perfil);
  const iniciales = tlInicialesDe(perfil);
  const avatarHTML = perfil.avatar_url
    ? `<img src="${perfil.avatar_url}" alt="">`
    : iniciales;

  mount.innerHTML = `
    <header class="app-header" id="appHeader">
      <div class="app-header-brand">
        <button class="menu-toggle" id="menuToggleHeader" style="margin-right:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <img src="img/logo.png" alt="TrustLink" onerror="this.style.display='none'">
        <div class="app-header-brand-text">Trust<span>Link</span></div>
      </div>
      <div class="app-header-actions">
        <button type="button" class="icon-btn" id="darkModeToggle" title="Cambiar tema">
          <span id="darkModeIcon">${ICONS_REAL.moon}</span>
        </button>
        <div id="appHeaderNotifMount" style="position:relative;"></div>
        <button type="button" class="app-header-user" id="appHeaderUserBtn" title="Mi perfil">
          <span class="app-header-user-name">${nombreCompleto}</span>
          <span class="app-header-user-avatar" id="appHeaderUserAvatar">${avatarHTML}</span>
        </button>
      </div>
    </header>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-role-badge">${ICONS_REAL.shield}${roleLabel}</div>
      ${perfil.rol !== 'superadmin' ? `
      <div class="sidebar-credit-box">
        Crédito disponible
        <strong>S/ ${Number(perfil.credito_disponible).toFixed(2)}</strong>
      </div>` : ''}
      <div class="sidebar-section-label">Navegación</div>
      <nav class="sidebar-nav">
        ${links.map(l => `
          <a href="${l.href}" class="sidebar-link ${activePage === l.href ? 'active' : ''}">
            ${ICONS_REAL[l.icon]}<span>${l.label}</span>
          </a>`).join('')}
        <div class="sidebar-section-label">Web3</div>
        <a href="contratos.html" class="sidebar-link ${activePage === 'contratos.html' ? 'active' : ''}">
          ${ICONS_REAL.contracts}<span>Contratos</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="sidebar-user" id="sidebarUserBtn" style="background:none; border:none; width:100%; text-align:left; cursor:pointer; padding:6px; border-radius:var(--tl-radius-sm);">
          <div class="sidebar-user-avatar" id="sidebarUserAvatar">${avatarHTML}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${nombreCompleto}</div>
            <div class="sidebar-user-role">${roleLabel}</div>
          </div>
        </button>
        <a href="#" class="sidebar-exit" onclick="tlSignOut(); return false;">${ICONS_REAL.logout}<span>Cerrar sesión</span></a>
      </div>
    </aside>
    <div class="sidebar-scrim" id="sidebarScrim"></div>
  `;

  const userBtn = document.getElementById('sidebarUserBtn');
  if (userBtn) userBtn.addEventListener('click', () => tlAbrirModalPerfil(perfil));
  const headerUserBtn = document.getElementById('appHeaderUserBtn');
  if (headerUserBtn) headerUserBtn.addEventListener('click', () => tlAbrirModalPerfil(perfil));
  const headerMenuToggle = document.getElementById('menuToggleHeader');
  if (headerMenuToggle) headerMenuToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarScrim').classList.toggle('show');
  });

  const scrim = document.getElementById('sidebarScrim');
  if (scrim) scrim.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    scrim.classList.remove('show');
  });

  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) menuToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarScrim').classList.toggle('show');
  });

  const darkBtn = document.getElementById('darkModeToggle');
  if (darkBtn) darkBtn.addEventListener('click', tlToggleDarkMode);
  tlSyncDarkModeIcon();
}

/**
 * Modo oscuro: clase body.dark + localStorage, mismo patrón simple
 * usado en el resto del sitio. El script anti-flash que aplica la
 * clase antes del primer paint vive inline en cada HTML (ver
 * <script data-dark-init> al inicio del <body>), así que aquí solo
 * hace falta el toggle y mantener el ícono sincronizado.
 */
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
  icon.innerHTML = isDark ? ICONS_REAL.sun : ICONS_REAL.moon;
  if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
}

// ---------- Paginación genérica ----------

/**
 * Pagina un array y pinta controles de página.
 *  tlPaginar({ items, porPagina, renderPagina, paginacionMountId })
 * renderPagina recibe el slice de items de la página actual.
 * Devuelve { irA(pagina) } por si la página necesita resetear a 1.
 */
function tlPaginar({ items, porPagina = 10, renderPagina, paginacionMountId }) {
  const mount = document.getElementById(paginacionMountId);
  let paginaActual = 1;
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));

  function pintar() {
    const desde = (paginaActual - 1) * porPagina;
    renderPagina(items.slice(desde, desde + porPagina), paginaActual);

    if (!mount) return;
    if (totalPaginas <= 1) { mount.innerHTML = ''; return; }

    // Ventana de máx. 5 botones numerados alrededor de la página actual
    let ini = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPaginas, ini + 4);
    ini = Math.max(1, fin - 4);
    let botones = '';
    for (let p = ini; p <= fin; p++) {
      botones += `<button class="tl-page-btn ${p === paginaActual ? 'active' : ''}" data-pag="${p}">${p}</button>`;
    }

    mount.innerHTML = `
      <div class="tl-pagination">
        <button class="tl-page-btn" data-pag="${paginaActual - 1}" ${paginaActual === 1 ? 'disabled' : ''}>‹</button>
        ${botones}
        <button class="tl-page-btn" data-pag="${paginaActual + 1}" ${paginaActual === totalPaginas ? 'disabled' : ''}>›</button>
        <span class="tl-page-info">Página ${paginaActual} de ${totalPaginas} · ${items.length} registros</span>
      </div>
    `;
    mount.querySelectorAll('.tl-page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Number(btn.dataset.pag);
        if (p >= 1 && p <= totalPaginas && p !== paginaActual) { paginaActual = p; pintar(); }
      });
    });
  }

  pintar();
  return { irA(p) { paginaActual = Math.min(Math.max(1, p), totalPaginas); pintar(); } };
}

// ---------- Notificaciones (campana en el topbar) ----------

async function tlRenderNotifBell() {
  // La campana ahora vive en el header superior fijo (estilo QuintaOla);
  // el mount viejo del topbar queda como fallback para páginas sueltas.
  const mount = document.getElementById('appHeaderNotifMount') || document.getElementById('topbarNotifMount');
  if (!mount) return;

  const count = await tlContarNotificacionesNoLeidas();
  mount.innerHTML = `
    <button class="notif-bell" id="notifBellBtn">
      ${ICONS_REAL.bell}
      ${count > 0 ? `<span class="notif-bell-badge">${count > 9 ? '9+' : count}</span>` : ''}
    </button>
    <div class="notif-panel" id="notifPanel">
      <div class="notif-panel-header">
        <span>Notificaciones</span>
        <button onclick="tlMarcarTodasLeidasUI()" class="notif-panel-markall">Marcar todas leídas</button>
      </div>
      <div class="notif-panel-list" id="notifPanelList">
        <div style="padding:20px; text-align:center; color:var(--tl-grey-600); font-size:0.82rem;">Cargando...</div>
      </div>
    </div>
  `;

  document.getElementById('notifBellBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) await tlLoadNotifList();
  });

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    if (panel && !panel.contains(e.target) && e.target.id !== 'notifBellBtn') panel.classList.remove('show');
  });
}

async function tlLoadNotifList() {
  const list = document.getElementById('notifPanelList');
  const notifs = await tlListarNotificaciones();

  if (!notifs.length) {
    list.innerHTML = `<div style="padding:24px; text-align:center; color:var(--tl-grey-600); font-size:0.82rem;">No tienes notificaciones todavía.</div>`;
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.leida ? '' : 'unread'}" onclick="tlMarcarNotifYRecargar(${n.id})">
      <div class="notif-item-title">${n.titulo}</div>
      <div class="notif-item-msg">${n.mensaje}</div>
      <div class="notif-item-time">${tlTiempoRelativo(n.creado_en)}</div>
    </div>
  `).join('');
}

async function tlMarcarNotifYRecargar(id) {
  await tlMarcarNotificacionLeida(id);
  await tlLoadNotifList();
  await tlRenderNotifBell();
}

async function tlMarcarTodasLeidasUI() {
  await tlMarcarTodasLeidas();
  await tlLoadNotifList();
  await tlRenderNotifBell();
}

function tlTiempoRelativo(fechaIso) {
  const diffMs = Date.now() - new Date(fechaIso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

// ---------- Toasts (reutiliza el patrón de la demo) ----------

function tlShowToastReal(mensaje, tipo = 'default') {
  const stack = document.getElementById('toastStack');
  if (!stack) { alert(mensaje); return; }
  const toast = document.createElement('div');
  // La clase debe ser "success" (no "toast-success"): css/components.css
  // define el selector ".toast.success", así que con el nombre viejo el
  // borde verde de éxito nunca se aplicaba.
  toast.className = `toast ${tipo === 'success' ? 'success' : ''}`;
  toast.textContent = mensaje;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---------- Modal de perfil (avatar, nombre, teléfono, contraseña) ----------

let tlPerfilActual = null;

function tlAsegurarModalPerfilEnDOM() {
  if (document.getElementById('perfilOverlay')) return;
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="overlay" id="perfilOverlay">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Mi perfil</div>
          <button class="modal-close" onclick="tlCerrarModalPerfil()">${ICONS_REAL.x}</button>
        </div>
        <div class="modal-body">
          <div style="display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:18px;">
            <div id="perfilAvatarPreview" style="width:76px; height:76px; border-radius:50%; background:var(--tl-accent); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.4rem; color:white; overflow:hidden; cursor:pointer;" onclick="document.getElementById('perfilAvatarInput').click()"></div>
            <input type="file" id="perfilAvatarInput" accept="image/jpeg,image/png,image/webp" style="display:none;">
            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('perfilAvatarInput').click()">Cambiar foto</button>
            <div style="font-size:0.72rem; color:var(--tl-grey-600);">JPG, PNG o WEBP · máx. 5MB</div>
          </div>

          <form id="perfilDatosForm">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="field"><label>Nombre</label><input type="text" id="perfilNombre" required placeholder="Ej. Rosell"></div>
              <div class="field"><label>Apellido</label><input type="text" id="perfilApellido" placeholder="Ej. Pretel"></div>
            </div>
            <div class="field"><label>Teléfono</label><input type="text" id="perfilTelefono" placeholder="Ej. 941 148 693"></div>
            <button type="submit" class="btn btn-primary btn-block">Guardar datos</button>
          </form>

          <div style="height:1px; background:var(--tl-grey-200); margin:20px 0;"></div>

          <form id="perfilPasswordForm">
            <div class="field"><label>Nueva contraseña</label><input type="password" id="perfilPassword1" minlength="6" placeholder="Mínimo 6 caracteres"></div>
            <div class="field"><label>Confirmar nueva contraseña</label><input type="password" id="perfilPassword2" minlength="6"></div>
            <button type="submit" class="btn btn-outline btn-block">Cambiar contraseña</button>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div.firstElementChild);

  document.getElementById('perfilAvatarInput').addEventListener('change', tlSubirAvatarDesdeModal);
  document.getElementById('perfilDatosForm').addEventListener('submit', tlGuardarDatosPerfil);
  document.getElementById('perfilPasswordForm').addEventListener('submit', tlGuardarPasswordPerfil);
}

function tlAbrirModalPerfil(perfil) {
  tlAsegurarModalPerfilEnDOM();
  tlPerfilActual = perfil;

  document.getElementById('perfilNombre').value = perfil.nombre;
  document.getElementById('perfilApellido').value = perfil.apellido || '';
  document.getElementById('perfilTelefono').value = perfil.telefono || '';
  document.getElementById('perfilPassword1').value = '';
  document.getElementById('perfilPassword2').value = '';

  const preview = document.getElementById('perfilAvatarPreview');
  const iniciales = tlInicialesDe(perfil);
  preview.innerHTML = perfil.avatar_url
    ? `<img src="${perfil.avatar_url}" alt="" style="width:100%; height:100%; object-fit:cover;">`
    : iniciales;

  document.getElementById('perfilOverlay').classList.add('show');
}

function tlCerrarModalPerfil() {
  const overlay = document.getElementById('perfilOverlay');
  if (overlay) overlay.classList.remove('show');
}

async function tlSubirAvatarDesdeModal(e) {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('perfilAvatarPreview');
  const original = preview.innerHTML;
  preview.innerHTML = '···';
  try {
    const url = await tlSubirAvatar(file);
    preview.innerHTML = `<img src="${url}" alt="" style="width:100%; height:100%; object-fit:cover;">`;
    tlPerfilActual.avatar_url = url;
    tlRenderSidebarReal(tlPerfilActual, document.querySelector('[data-active-link]')?.dataset.activeLink);
    tlShowToastReal('Foto de perfil actualizada', 'success');
  } catch (err) {
    preview.innerHTML = original;
    tlShowToastReal(err.message || 'No se pudo subir la foto');
  } finally {
    e.target.value = '';
  }
}

async function tlGuardarDatosPerfil(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    const nombre = document.getElementById('perfilNombre').value.trim();
    const apellido = document.getElementById('perfilApellido').value.trim();
    const telefono = document.getElementById('perfilTelefono').value.trim();
    if (!nombre) throw new Error('El nombre no puede estar vacío');
    await tlActualizarMiPerfil({ nombre, apellido: apellido || null, telefono: telefono || null });
    tlPerfilActual.nombre = nombre;
    tlPerfilActual.apellido = apellido;
    tlPerfilActual.telefono = telefono;
    tlRenderSidebarReal(tlPerfilActual, document.querySelector('[data-active-link]')?.dataset.activeLink);
    tlShowToastReal('Datos actualizados', 'success');
  } catch (err) {
    tlShowToastReal(err.message || 'No se pudieron guardar los datos');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar datos';
  }
}

async function tlGuardarPasswordPerfil(e) {
  e.preventDefault();
  const p1 = document.getElementById('perfilPassword1').value;
  const p2 = document.getElementById('perfilPassword2').value;
  if (!p1 && !p2) { tlShowToastReal('Escribe la nueva contraseña'); return; }
  if (p1.length < 6) { tlShowToastReal('La contraseña debe tener al menos 6 caracteres'); return; }
  if (p1 !== p2) { tlShowToastReal('Las contraseñas no coinciden'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Cambiando...';
  try {
    await tlCambiarPassword(p1);
    document.getElementById('perfilPassword1').value = '';
    document.getElementById('perfilPassword2').value = '';
    tlShowToastReal('Contraseña actualizada', 'success');
  } catch (err) {
    tlShowToastReal(err.message || 'No se pudo cambiar la contraseña');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cambiar contraseña';
  }
}

// ---------- Init compartido ----------

/**
 * Llamar al final de cada página protegida. rolRequerido es opcional
 * (si se pasa, además exige ese rol exacto o redirige).
 */
async function tlInitLayout(activePage, rolRequerido = null) {
  try {
    const ctx = rolRequerido ? await tlRequireRolReal(rolRequerido) : await tlRequireAuth();
    if (!ctx) return null;

    tlRenderSidebarReal(ctx.perfil, activePage);
    await tlRenderNotifBell();
    tlWatchAuthYBfcache(rolRequerido);

    // El widget del chatbot vive en <div id="chatbotMount"> de cada
    // página protegida, pero antes solo index.html lo inicializaba.
    // Centralizarlo aquí garantiza que aparezca en los 3 roles.
    if (typeof tlRenderChatbotWidget === 'function') tlRenderChatbotWidget();

    return ctx;
  } catch (err) {
    // Última línea de defensa: si algo inesperado revienta durante el
    // init, se ve un mensaje claro en vez de una página muda sin
    // sidebar ni contenido (que era indistinguible de "no hay datos").
    console.error('tlInitLayout falló:', err);
    const main = document.querySelector('.main-content') || document.body;
    const aviso = document.createElement('div');
    aviso.style.cssText = 'margin:24px; padding:16px 20px; border-radius:10px; background:#fef2f2; border:1px solid #fecaca; color:#991b1b; font-size:0.9rem;';
    aviso.textContent = 'Ocurrió un error cargando esta página. Intenta recargar; si persiste, contacta al equipo de TrustLink.';
    main.prepend(aviso);
    return null;
  }
}

/**
 * Cierra el hueco de seguridad del botón "atrás" / bfcache: cuando el
 * navegador restaura una página protegida desde su caché (Chrome/Safari
 * guardan el DOM ya pintado, con sidebar y datos, para volver instantáneo),
 * el JS no vuelve a correr — así la sesión ya esté cerrada, se ve la
 * página vieja por un instante y, si el usuario no navega, se queda ahí.
 *
 * Solución: en `pageshow`, si event.persisted es true (vino del bfcache),
 * revalida la sesión de inmediato y expulsa si ya no es válida. También
 * escucha onAuthStateChange de Supabase para reaccionar si la sesión se
 * cierra en otra pestaña, y valida al recuperar el foco de la pestaña.
 */
function tlWatchAuthYBfcache(rolRequerido) {
  const revalidar = async () => {
    const session = await tlGetSession();
    if (!session) {
      window.location.replace('login.html');
      return;
    }
    if (rolRequerido) {
      const perfil = await tlGetMiPerfil();
      if (!perfil || perfil.rol !== rolRequerido) {
        window.location.replace('sin-acceso.html');
      }
    }
  };

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) revalidar();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revalidar();
  });

  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') window.location.replace('login.html');
  });
}

// ============================================================
// MODAL DE CONFIRMACIÓN (reemplaza al confirm() nativo del navegador)
// ============================================================

/**
 * Sustituye a window.confirm(mensaje). Devuelve una Promise<boolean>
 * igual que el confirm nativo, pero pintado con el estilo del sitio
 * en vez del popup gris feo del navegador. Uso: if (!await tlConfirm('¿Seguro?')) return;
 */
function tlConfirm(mensaje, { titulo = 'Confirmar', textoAceptar = 'Aceptar', textoCancelar = 'Cancelar', peligroso = true } = {}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('tlConfirmOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tlConfirmOverlay';
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:380px;">
          <div class="modal-header">
            <div class="modal-title" id="tlConfirmTitulo"></div>
          </div>
          <div class="modal-body">
            <div id="tlConfirmMensaje" style="font-size:0.88rem; color:var(--tl-grey-600); line-height:1.5; margin-bottom:18px;"></div>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-outline" style="flex:1;" id="tlConfirmCancelar"></button>
              <button class="btn btn-primary" style="flex:1;" id="tlConfirmAceptar"></button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    document.getElementById('tlConfirmTitulo').textContent = titulo;
    document.getElementById('tlConfirmMensaje').textContent = mensaje;
    const btnAceptar = document.getElementById('tlConfirmAceptar');
    const btnCancelar = document.getElementById('tlConfirmCancelar');
    btnAceptar.textContent = textoAceptar;
    btnCancelar.textContent = textoCancelar;
    btnAceptar.style.background = peligroso ? '#dc2626' : '';
    btnAceptar.style.borderColor = peligroso ? '#dc2626' : '';

    const cerrar = (resultado) => {
      overlay.classList.remove('show');
      btnAceptar.removeEventListener('click', onAceptar);
      btnCancelar.removeEventListener('click', onCancelar);
      resolve(resultado);
    };
    const onAceptar = () => cerrar(true);
    const onCancelar = () => cerrar(false);

    btnAceptar.addEventListener('click', onAceptar);
    btnCancelar.addEventListener('click', onCancelar);
    overlay.classList.add('show');
  });
}

// ============================================================
// POPUP "DESCARGAR COMO" (CSV o Excel)
// ============================================================

/**
 * Muestra un popup para elegir CSV o Excel y devuelve una
 * Promise<'csv'|'excel'|null>. Uso:
 *   const formato = await tlElegirFormatoDescarga();
 *   if (formato) tlExportar...(formato);
 */
function tlElegirFormatoDescarga(titulo = 'Descargar reporte') {
  return new Promise((resolve) => {
    let overlay = document.getElementById('tlDescargaOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tlDescargaOverlay';
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:360px;">
          <div class="modal-header">
            <div class="modal-title" id="tlDescargaTitulo"></div>
            <button class="modal-close" id="tlDescargaClose">${ICONS_REAL.x}</button>
          </div>
          <div class="modal-body">
            <div style="font-size:0.84rem; color:var(--tl-grey-600); margin-bottom:16px;">Elige el formato del archivo.</div>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-outline" style="flex:1; flex-direction:column; height:auto; padding:16px 10px; gap:6px;" id="tlDescargaCsv">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                CSV
              </button>
              <button class="btn btn-outline" style="flex:1; flex-direction:column; height:auto; padding:16px 10px; gap:6px;" id="tlDescargaExcel">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                Excel
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    document.getElementById('tlDescargaTitulo').textContent = titulo;
    const btnCsv = document.getElementById('tlDescargaCsv');
    const btnExcel = document.getElementById('tlDescargaExcel');
    const btnClose = document.getElementById('tlDescargaClose');

    const cerrar = (resultado) => {
      overlay.classList.remove('show');
      btnCsv.removeEventListener('click', onCsv);
      btnExcel.removeEventListener('click', onExcel);
      btnClose.removeEventListener('click', onClose);
      resolve(resultado);
    };
    const onCsv = () => cerrar('csv');
    const onExcel = () => cerrar('excel');
    const onClose = () => cerrar(null);

    btnCsv.addEventListener('click', onCsv);
    btnExcel.addEventListener('click', onExcel);
    btnClose.addEventListener('click', onClose);
    overlay.classList.add('show');
  });
}

/**
 * Descarga `filas` (array de arrays, primera fila = headers) como
 * CSV o Excel (.xls con tabla HTML — Excel lo abre nativamente sin
 * necesitar ninguna librería de generación de xlsx real).
 */
function tlDescargarTabla(nombreArchivo, headers, filas, formato) {
  if (formato === 'excel') {
    const filasHtml = filas.map(f => '<tr>' + f.map(v => `<td>${(v ?? '').toString().replace(/</g, '&lt;')}</td>`).join('') + '</tr>').join('');
    const headHtml = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Datos</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head><body><table border="1">${headHtml}${filasHtml}</table></body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${nombreArchivo}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const csv = [headers, ...filas].map(fila => fila.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${nombreArchivo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
