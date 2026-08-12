/**
 * DATOS HARDCODEADOS PARA LA DEMO DE HACKATHON
 * ---------------------------------------------
 * Nada de esto viene de una base de datos real: todo vive en memoria
 * del navegador (variable global TL_STATE) y se resetea al recargar
 * la página. Es intencional: esta app es solo para presentar el flujo
 * y las funcionalidades de TrustLink en el demo day, no para producción.
 *
 * Las imágenes de producto se referencian desde ./img/productos/<nombre>.jpg
 * Coloca ahí tus fotos reales con estos nombres exactos para reemplazar
 * los placeholders generados automáticamente.
 */

const TL_USERS = {
  comprador: {
    id: 'u-comprador-demo',
    nombre: 'Comprador Demo',
    email: 'demo.comprador@trustlink.com',
    rol: 'USUARIO',
    wallet: '0x8f3D...9aC1',
    avatarInicial: 'CD',
  },
  vendedor: {
    id: 'u-vendedor-demo',
    nombre: 'Vendedor Demo',
    email: 'demo.vendedor@trustlink.com',
    rol: 'USUARIO',
    wallet: '0x4B21...E7F0',
    avatarInicial: 'VD',
    score: 742,
    ventasExitosas: 18,
    compradoresDistintos: 12,
    nivelCredito: 2, // índice en TL_CREDIT_TIERS
  },
  superadmin: {
    id: 'u-superadmin-demo',
    nombre: 'Super Admin',
    email: 'superadmin@trustlink.com',
    rol: 'SUPERADMIN',
    wallet: '0x0000...ADM1',
    avatarInicial: 'SA',
  },
};

const TL_CREDIT_TIERS = [
  { label: 'Nivel 1', monto: 'S/ 50', minScore: 0 },
  { label: 'Nivel 2', monto: 'S/ 100', minScore: 300 },
  { label: 'Nivel 3', monto: 'S/ 250', minScore: 600 },
  { label: 'Nivel 4', monto: 'S/ 500', minScore: 850 },
];

/**
 * Catálogo inicial. "creadoPor" indica si el producto ya venía
 * precargado ('seed') o si lo publicó el usuario vendedor durante
 * la demo ('vendedor-demo'), solo para diferenciarlo visualmente.
 */
const TL_PRODUCTOS_SEED = [
  { id: 'p1', nombre: 'Taladro percutor Bosch 1/2"', precio: 180, img: 'img/productos/taladro.jpg', desc: 'Taladro percutor semi-nuevo, incluye 2 brocas. Ideal para trabajos de construcción.', creadoPor: 'seed' },
  { id: 'p2', nombre: 'Cargador portátil 20000mAh', precio: 65, img: 'img/productos/cargador.jpg', desc: 'Power bank de carga rápida, dos puertos USB-C. Perfecto para vender en la calle.', creadoPor: 'seed' },
  { id: 'p3', nombre: 'Set de llaves mixtas (12 pzs)', precio: 95, img: 'img/productos/llaves.jpg', desc: 'Juego completo de llaves mixtas en acero al cromo vanadio, estuche incluido.', creadoPor: 'seed' },
  { id: 'p4', nombre: 'Martillo de carpintero', precio: 45, img: 'img/productos/martillo.jpg', desc: 'Martillo con mango de fibra de vidrio antideslizante, cabeza forjada.', creadoPor: 'seed' },
  { id: 'p5', nombre: 'Extensión eléctrica 10m', precio: 38, img: 'img/productos/extension.jpg', desc: 'Cable calibre 14, 3 tomas, protección contra sobrecarga.', creadoPor: 'seed' },
  { id: 'p6', nombre: 'Casco de seguridad industrial', precio: 32, img: 'img/productos/casco.jpg', desc: 'Certificado, ajuste con rueda dentada, ventilación lateral.', creadoPor: 'seed' },
  { id: 'p7', nombre: 'Guantes de trabajo reforzados', precio: 22, img: 'img/productos/guantes.jpg', desc: 'Palma de cuero sintético, resistentes a cortes, talla única ajustable.', creadoPor: 'seed' },
  { id: 'p8', nombre: 'Casaca Matt Whellingthon', precio: 50, img: 'img/productos/casaca.jpg', desc: 'Casaca impermeable, ideal para clima frío-húmedo.', creadoPor: 'seed' },
  { id: 'p9', nombre: 'Linterna recargable LED', precio: 40, img: 'img/productos/linterna.jpg', desc: 'USB-C, 3 modos de luz, resistente a salpicaduras.', creadoPor: 'seed' },
];

/** Órdenes de ejemplo ya "resueltas" para mostrar historial y reputación con contenido.
 * estado: 'ESPERANDO_VENDEDOR' | 'ESPERANDO_COMPRADOR' | 'ENTREGADO' | 'EN_DISPUTA'
 * Un pedido pasa a ENTREGADO solo cuando AMBAS partes confirmaron
 * (confirmacionVendedor y confirmacionComprador en true) — así se
 * libera el dinero del escrow.
 */
const TL_ORDENES_SEED = [
  { id: 'ord-1001', producto: 'Taladro percutor Bosch 1/2"', monto: 180, estado: 'ENTREGADO', comprador: 'María L.', fecha: '2026-08-02', txHash: '0x7a9f...c221', confirmacionVendedor: true, confirmacionComprador: true },
  { id: 'ord-1002', producto: 'Set de llaves mixtas (12 pzs)', monto: 95, estado: 'ENTREGADO', comprador: 'Jorge P.', fecha: '2026-08-03', txHash: '0x3bd1...9e40', confirmacionVendedor: true, confirmacionComprador: true },
  { id: 'ord-1003', producto: 'Casco de seguridad industrial', monto: 32, estado: 'EN_DISPUTA', comprador: 'Ana R.', fecha: '2026-08-05', txHash: '0xf120...77ab', confirmacionVendedor: true, confirmacionComprador: false },
  { id: 'ord-1004', producto: 'Cargador portátil 20000mAh', monto: 65, estado: 'ESPERANDO_COMPRADOR', comprador: 'Comprador Demo', fecha: '2026-08-08', txHash: '0x9e02...44d1', confirmacionVendedor: true, confirmacionComprador: false },
];

/** Direcciones y funciones reales, tomadas del backend TrustLink (Arbitrum Sepolia). */
const TL_CONTRACTS = {
  chainName: 'Arbitrum Sepolia (testnet)',
  chainId: 421614,
  escrow: {
    nombre: 'TrustLinkEscrow.sol',
    address: '0xEFFbc4f5524d4c546c0A6A3a0C36A0c6BB9ec24c',
    funciones: ['crearOrden()', 'confirmarEntrega()', 'reportarDisputa()', 'resolverDisputa()', 'liberarPorTimeout()'],
  },
  reputation: {
    nombre: 'TrustLinkReputation.sol',
    address: '0x72A292696389daf898BdC72672cA6B983564ee5d',
    funciones: ['registrarVentaExitosa()', 'actualizarScore()', 'reputacionDe()', 'compradorHaComprado()'],
  },
};

/**
 * Historial de ventas del vendedor demo, usado en el dashboard de
 * ventas (dashboard-ventas.html) para graficar ingresos y unidades
 * a lo largo del tiempo. Son datos de ejemplo, no vienen de la
 * blockchain ni de MySQL — es solo para mostrar el tipo de panel
 * que tendría un vendedor real conectado al backend.
 */
const TL_VENTAS_MENSUALES = [
  { mes: 'Mar', monto: 320, unidades: 4 },
  { mes: 'Abr', monto: 410, unidades: 5 },
  { mes: 'May', monto: 285, unidades: 3 },
  { mes: 'Jun', monto: 560, unidades: 7 },
  { mes: 'Jul', monto: 690, unidades: 8 },
  { mes: 'Ago', monto: 495, unidades: 6 },
];

const TL_VENTAS_POR_PRODUCTO = [
  { nombre: 'Taladro percutor Bosch 1/2"', unidades: 6, monto: 1080 },
  { nombre: 'Set de llaves mixtas (12 pzs)', unidades: 5, monto: 475 },
  { nombre: 'Cargador portátil 20000mAh', unidades: 8, monto: 520 },
  { nombre: 'Casco de seguridad industrial', unidades: 4, monto: 128 },
  { nombre: 'Martillo de carpintero', unidades: 3, monto: 135 },
];

/**
 * NOTIFICACIONES SIMULADAS POR ROL
 * ----------------------------------
 * Igual patrón que las solicitudes: viven en localStorage para que
 * al cambiar de rol dentro del mismo navegador (comprador → vendedor)
 * la campanita de notificaciones muestre eventos coherentes con lo
 * que pasó en el otro rol durante la demo.
 */
const TL_NOTIFICACIONES_KEY = 'tl_notificaciones';

const TL_NOTIFICACIONES_SEED = [
  { id: 'n1', rol: 'vendedor', titulo: 'Nuevo pedido recibido', mensaje: 'Comprador Demo pidió tu "Cargador portátil 20000mAh". Prepara la entrega.', leido: false, fecha: '2026-08-08T10:15:00' },
  { id: 'n2', rol: 'vendedor', titulo: 'Pago liberado', mensaje: 'María L. confirmó la entrega del Taladro percutor. Se liberaron S/ 180.00 a tu cuenta.', leido: true, fecha: '2026-08-02T16:40:00' },
  { id: 'n3', rol: 'comprador', titulo: 'Tu pedido está en camino', mensaje: 'El vendedor confirmó el envío de tu Cargador portátil 20000mAh.', leido: false, fecha: '2026-08-08T10:20:00' },
  { id: 'n4', rol: 'superadmin', titulo: 'Incidencia abierta', mensaje: 'Ana R. reportó un problema con el pedido ord-1003 (Casco de seguridad industrial).', leido: false, fecha: '2026-08-05T09:05:00' },
  { id: 'n5', rol: 'superadmin', titulo: 'Nueva solicitud de vendedor', mensaje: 'Un comprador solicitó convertirse en vendedor. Revisa la solicitud.', leido: false, fecha: '2026-08-07T14:00:00' },
];

function tlGetNotificaciones(rol) {
  try {
    const raw = localStorage.getItem(TL_NOTIFICACIONES_KEY);
    const todas = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(TL_NOTIFICACIONES_SEED));
    return todas.filter(n => n.rol === rol);
  } catch (e) {
    return TL_NOTIFICACIONES_SEED.filter(n => n.rol === rol);
  }
}

function tlGetTodasNotificaciones() {
  try {
    const raw = localStorage.getItem(TL_NOTIFICACIONES_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(TL_NOTIFICACIONES_SEED));
  } catch (e) {
    return JSON.parse(JSON.stringify(TL_NOTIFICACIONES_SEED));
  }
}

function tlSaveNotificaciones(lista) {
  try { localStorage.setItem(TL_NOTIFICACIONES_KEY, JSON.stringify(lista)); } catch (e) { /* modo privado */ }
}

function tlAgregarNotificacion(rol, titulo, mensaje) {
  const todas = tlGetTodasNotificaciones();
  todas.unshift({ id: 'n-' + Date.now(), rol, titulo, mensaje, leido: false, fecha: new Date().toISOString() });
  tlSaveNotificaciones(todas);
}

function tlMarcarNotificacionesLeidas(rol) {
  const todas = tlGetTodasNotificaciones().map(n => n.rol === rol ? { ...n, leido: true } : n);
  tlSaveNotificaciones(todas);
}

/**
 * AUDITORÍA HARDCODEADA
 * ----------------------
 * Registro de acciones sensibles de ejemplo, para mostrar en la
 * demo cómo se vería la trazabilidad completa de la plataforma
 * (login, resolución de disputas, cambios de rol, créditos, baneos).
 */
const TL_AUDITORIA_SEED = [
  { fecha: '2026-08-08T08:02:00', accion: 'LOGIN', actor: 'Comprador Demo', entidad: 'auth', detalle: '—' },
  { fecha: '2026-08-08T08:10:00', accion: 'PEDIDO_CREADO', actor: 'Comprador Demo', entidad: 'ord-1004', detalle: 'Cargador portátil 20000mAh · S/ 65.00' },
  { fecha: '2026-08-08T09:30:00', accion: 'ROL_CAMBIADO', actor: 'Super Admin', entidad: 'usuario u-vendedor-demo', detalle: 'nuevo_rol: vendedor · motivo: solicitud_aceptada' },
  { fecha: '2026-08-07T14:00:00', accion: 'SOLICITUD_VENDEDOR_CREADA', actor: 'Comprador Demo', entidad: 'sol-9001', detalle: 'rubro: Ferretería' },
  { fecha: '2026-08-05T09:05:00', accion: 'INCIDENCIA_REPORTADA', actor: 'Ana R.', entidad: 'ord-1003', detalle: 'categoria: producto_dañado' },
  { fecha: '2026-08-05T11:20:00', accion: 'CREDITO_SOLICITADO', actor: 'Vendedor Demo', entidad: 'cred-501', detalle: 'monto: S/ 100.00 · tasa: 12%' },
  { fecha: '2026-08-05T11:45:00', accion: 'CREDITO_APROBADO', actor: 'Super Admin', entidad: 'cred-501', detalle: 'vendedor: u-vendedor-demo' },
  { fecha: '2026-08-04T17:12:00', accion: 'USUARIO_BANEADO', actor: 'Super Admin', entidad: 'usuario demo-spam-01', detalle: 'motivo: reportes reiterados de productos falsos' },
  { fecha: '2026-08-02T16:40:00', accion: 'PEDIDO_CONFIRMADO', actor: 'María L.', entidad: 'ord-1001', detalle: 'monto liberado: S/ 180.00' },
  { fecha: '2026-08-02T09:00:00', accion: 'LOGIN', actor: 'Vendedor Demo', entidad: 'auth', detalle: '—' },
];

/**
 * SOLICITUDES PARA SER VENDEDOR
 * ------------------------------
 * A diferencia del resto de TL_STATE (en memoria, se pierde al
 * recargar), las solicitudes viven en localStorage: así, cuando en
 * la demo cambias de rol (comprador → superadmin) desde el mismo
 * navegador, el superadmin sigue viendo la solicitud que mandó el
 * comprador. Sigue siendo 100% local — nada sale del navegador, no
 * hay backend real detrás.
 */
const TL_SOLICITUDES_KEY = 'tl_solicitudes_vendedor';

function tlGetSolicitudes() {
  try {
    const raw = localStorage.getItem(TL_SOLICITUDES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function tlSaveSolicitudes(lista) {
  try {
    localStorage.setItem(TL_SOLICITUDES_KEY, JSON.stringify(lista));
  } catch (e) {
    // localStorage puede fallar en modo privado — la demo sigue
    // funcionando, solo no persiste entre recargas.
  }
}

function tlCrearSolicitudVendedor(datos) {
  const lista = tlGetSolicitudes();
  const nueva = {
    id: 'sol-' + Date.now(),
    nombre: datos.nombre,
    dni: datos.dni,
    telefono: datos.telefono,
    rubro: datos.rubro,
    descripcion: datos.descripcion,
    estado: 'pendiente', // 'pendiente' | 'aceptada' | 'rechazada'
    fecha: new Date().toISOString().slice(0, 10),
  };
  lista.unshift(nueva);
  tlSaveSolicitudes(lista);
  return nueva;
}

function tlActualizarSolicitud(id, estado) {
  const lista = tlGetSolicitudes();
  const idx = lista.findIndex(s => s.id === id);
  if (idx !== -1) {
    lista[idx].estado = estado;
    tlSaveSolicitudes(lista);
  }
  return lista;
}

/**
 * Incidencias de ejemplo, para la vista de superadmin y de reporte
 * del comprador/vendedor en la demo.
 */
const TL_INCIDENCIAS_SEED = [
  { id: 'inc-1', pedidoId: 'ord-1003', categoria: 'Producto dañado', descripcion: 'El casco llegó con el ajuste de rueda dañado.', reportadoPor: 'Ana R. (comprador)', estado: 'abierta', fecha: '2026-08-05' },
  { id: 'inc-2', pedidoId: 'ord-1002', categoria: 'Demora en la entrega', descripcion: 'El vendedor tardó 3 días más de lo acordado.', reportadoPor: 'Jorge P. (comprador)', estado: 'resuelta_comprador', fecha: '2026-08-03' },
];

/**
 * Solicitudes de crédito de ejemplo para creditos-admin.html.
 * monto_a_pagar ya incluye el 12% de interés mensual.
 */
const TL_CREDITOS_SEED = [
  { id: 'cred-501', solicitante: 'Vendedor Demo', monto: 100, montoAPagar: 112, estado: 'pendiente', fecha: '2026-08-05' },
  { id: 'cred-502', solicitante: 'Vendedor Demo', monto: 50, montoAPagar: 56, estado: 'aprobado', pagado: true, fecha: '2026-07-20' },
];

/**
 * Estado mutable de la sesión de demo (vive solo en memoria del navegador).
 * Se reinicia cada vez que se recarga la página — es la forma más simple
 * de garantizar que la demo siempre arranca en el mismo punto conocido.
 */
const TL_STATE = {
  productos: JSON.parse(JSON.stringify(TL_PRODUCTOS_SEED)),
  ordenes: JSON.parse(JSON.stringify(TL_ORDENES_SEED)),
  rolActivo: null, // 'comprador' | 'vendedor' | 'superadmin'
};
