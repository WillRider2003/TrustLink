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

/** Órdenes de ejemplo ya "resueltas" para mostrar historial y reputación con contenido. */
const TL_ORDENES_SEED = [
  { id: 'ord-1001', producto: 'Taladro percutor Bosch 1/2"', monto: 180, estado: 'ENTREGADO', comprador: 'María L.', fecha: '2026-08-02', txHash: '0x7a9f...c221' },
  { id: 'ord-1002', producto: 'Set de llaves mixtas (12 pzs)', monto: 95, estado: 'ENTREGADO', comprador: 'Jorge P.', fecha: '2026-08-03', txHash: '0x3bd1...9e40' },
  { id: 'ord-1003', producto: 'Casco de seguridad industrial', monto: 32, estado: 'EN_DISPUTA', comprador: 'Ana R.', fecha: '2026-08-05', txHash: '0xf120...77ab' },
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
 * Estado mutable de la sesión de demo (vive solo en memoria del navegador).
 * Se reinicia cada vez que se recarga la página — es la forma más simple
 * de garantizar que la demo siempre arranca en el mismo punto conocido.
 */
const TL_STATE = {
  productos: JSON.parse(JSON.stringify(TL_PRODUCTOS_SEED)),
  ordenes: JSON.parse(JSON.stringify(TL_ORDENES_SEED)),
  rolActivo: null, // 'comprador' | 'vendedor' | 'superadmin'
};
