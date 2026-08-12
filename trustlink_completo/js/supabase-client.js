/**
 * CLIENTE SUPABASE — TrustLink (versión funcional real)
 * -------------------------------------------------------
 * Este archivo es el único punto de contacto con la base de datos.
 * Todo lo demás (marketplace.js, pedido.js, etc.) llama a las
 * funciones de aquí, nunca a supabase-js directamente.
 *
 * Antes de usar esto en producción, reemplaza SUPABASE_URL y
 * SUPABASE_ANON_KEY con los valores reales de tu proyecto
 * (Supabase → Project Settings → API). La anon key es pública por
 * diseño — la seguridad real la dan las políticas RLS en la base
 * de datos, no el secreto de esta key.
 */

const SUPABASE_URL = 'https://hrsueiosbcpiepwwqxqw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc3VlaW9zYmNwaWVwd3dxeHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODcxMTYsImV4cCI6MjEwMTg2MzExNn0.vTZ-fRvxBFFdBpNT9CqAUQD4tQiIhaMuPznGMIE4Wuo';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// AUTH
// ============================================================

async function tlSignUp(email, password, nombre, telefono, apellido, dni) {
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { nombre, telefono, apellido, dni } },
  });
  if (error) throw error;
  return data;
}

async function tlSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Bloquea acceso si el usuario está baneado — Supabase Auth no
  // puede interceptar esto por RLS, así que se valida aquí mismo,
  // justo tras autenticar, y se cierra la sesión si corresponde.
  const { data: perfilData } = await sb.from('perfiles').select('baneado, baneado_motivo').eq('id', data.user.id).single();
  if (perfilData && perfilData.baneado) {
    await sb.auth.signOut();
    throw new Error(perfilData.baneado_motivo || 'Tu cuenta está suspendida. Contacta al soporte de TrustLink.');
  }

  await sb.rpc('registrar_evento_auditoria', { p_accion: 'LOGIN', p_detalle: null });
  return data;
}

async function tlSignOut() {
  try { await sb.rpc('registrar_evento_auditoria', { p_accion: 'LOGOUT', p_detalle: null }); } catch (e) { /* no bloquear el logout si esto falla */ }
  await sb.auth.signOut();
  // replace() en vez de href: no deja la página protegida en el
  // historial para "adelante", y al combinarse con el listener de
  // pageshow en app-real.js, un "atrás" posterior siempre revalida
  // sesión en vez de mostrar el bfcache ya logueado.
  window.location.replace('login.html');
}

async function tlGetSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

/**
 * Protege una página: si no hay sesión, redirige a login.
 * Si hay sesión, devuelve { session, perfil }.
 * Llamar al inicio de cada página protegida (marketplace, admin, etc.)
 */
async function tlRequireAuth() {
  const session = await tlGetSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  const perfil = await tlGetMiPerfil();
  if (!perfil) {
    window.location.href = 'login.html';
    return null;
  }
  return { session, perfil };
}

/** Igual que tlRequireAuth pero además exige un rol específico. */
async function tlRequireRolReal(rolEsperado) {
  const ctx = await tlRequireAuth();
  if (!ctx) return null;
  if (ctx.perfil.rol !== rolEsperado) {
    window.location.href = 'sin-acceso.html';
    return null;
  }
  return ctx;
}

// ============================================================
// PERFIL
// ============================================================

async function tlGetMiPerfil() {
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await sb.from('perfiles').select('*').eq('id', userData.user.id).single();
  if (error) { console.error(error); return null; }
  return data;
}

async function tlGetBloqueoVigente(usuarioId) {
  const { data, error } = await sb.rpc('bloqueo_vigente', { p_usuario_id: usuarioId });
  if (error) { console.error(error); return null; }
  return data && data.length ? data[0] : null;
}

/**
 * Actualiza nombre y/o teléfono del perfil propio.
 * cambios: { nombre?, telefono? }
 */
async function tlActualizarMiPerfil(cambios) {
  const { data: userData } = await sb.auth.getUser();
  const { error } = await sb.from('perfiles').update(cambios).eq('id', userData.user.id);
  if (error) throw error;
}

/** Cambia la contraseña del usuario autenticado. Supabase re-valida la sesión actual. */
async function tlCambiarPassword(nuevaPassword) {
  const { error } = await sb.auth.updateUser({ password: nuevaPassword });
  if (error) throw error;
}

/**
 * Sube una foto de perfil al bucket "avatares" (máx. 5MB, solo
 * imágenes — reforzado también por el bucket en Supabase Storage)
 * y guarda la URL firmada en perfiles.avatar_url.
 */
async function tlSubirAvatar(file) {
  const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La imagen supera el máximo de 5MB.');
  }

  const { data: userData } = await sb.auth.getUser();
  const ext = file.name.split('.').pop();
  const path = `${userData.user.id}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await sb.storage.from('avatares').upload(path, file, { upsert: true });
  if (upErr) throw upErr;

  const { data: signed, error: signErr } = await sb.storage.from('avatares').createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;

  await tlActualizarMiPerfil({ avatar_url: signed.signedUrl });
  return signed.signedUrl;
}

// ============================================================
// PRODUCTOS
// ============================================================

/**
 * Antes esta función pedía el join `perfiles!productos_vendedor_id_fkey`
 * en una sola consulta. Si el nombre exacto del constraint de FK no
 * coincidía (por ejemplo tras recrear la tabla), Supabase devolvía un
 * error de la query COMPLETA — no solo del join — y como el catch
 * retorna `[]`, el marketplace se veía vacío aunque sí hubiera
 * productos activos. Se separa en dos consultas independientes y se
 * mapea en JS: así un problema con el nombre del constraint nunca
 * puede tumbar la lista de productos.
 */
async function tlListarProductos({ soloDeVendedor = null } = {}) {
  let query = sb.from('productos').select('*').order('creado_en', { ascending: false });
  query = soloDeVendedor ? query.eq('vendedor_id', soloDeVendedor) : query.eq('activo', true);

  const { data: productos, error } = await query;
  if (error) { console.error('tlListarProductos:', error); return []; }
  if (!productos || !productos.length) return [];

  const vendedorIds = [...new Set(productos.map(p => p.vendedor_id))];
  const { data: vendedores, error: errVend } = await sb.from('perfiles').select('id, nombre, score_reputacion').in('id', vendedorIds);
  if (errVend) { console.error('tlListarProductos (perfiles):', errVend); }

  const porId = new Map((vendedores || []).map(v => [v.id, v]));
  return productos.map(p => ({ ...p, perfiles: porId.get(p.vendedor_id) || null }));
}

/**
 * Sube una foto de producto al bucket público "productos" (máx. 5MB,
 * solo imágenes — reforzado también por el bucket en Supabase Storage)
 * y devuelve la URL pública para guardar en productos.imagen_url.
 *
 * A diferencia de tlSubirAvatar, esta URL es pública y no expira
 * (el bucket "productos" es público) porque se muestra en listados
 * de marketplace a muchos usuarios a la vez.
 */
async function tlSubirImagenProducto(file) {
  const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La imagen supera el máximo de 5MB.');
  }

  const { data: userData } = await sb.auth.getUser();
  const ext = file.name.split('.').pop();
  const path = `${userData.user.id}/producto-${Date.now()}.${ext}`;

  const { error: upErr } = await sb.storage.from('productos').upload(path, file, { upsert: true });
  if (upErr) throw upErr;

  const { data: pub } = sb.storage.from('productos').getPublicUrl(path);
  return pub.publicUrl;
}

async function tlCrearProducto(producto) {
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('productos').insert({
    vendedor_id: userData.user.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio,
    categoria: producto.categoria,
    imagen_url: producto.imagen_url || null,
    stock: producto.stock,
  }).select().single();
  if (error) throw error;
  return data;
}

async function tlActualizarProducto(id, cambios) {
  const { error } = await sb.from('productos').update(cambios).eq('id', id);
  if (error) throw error;
}

// ============================================================
// CARRITO
// ============================================================

async function tlAgregarAlCarrito(productoId, cantidad = 1) {
  const { data: userData } = await sb.auth.getUser();
  const { data: existente } = await sb.from('carrito_items').select('*').eq('usuario_id', userData.user.id).eq('producto_id', productoId).maybeSingle();

  if (existente) {
    const { error } = await sb.from('carrito_items').update({ cantidad: existente.cantidad + cantidad }).eq('id', existente.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from('carrito_items').insert({ usuario_id: userData.user.id, producto_id: productoId, cantidad });
    if (error) throw error;
  }
}

async function tlListarCarrito() {
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('carrito_items').select('*, productos(*)').eq('usuario_id', userData.user.id);
  if (error) { console.error(error); return []; }
  return data;
}

async function tlQuitarDelCarrito(itemId) {
  const { error } = await sb.from('carrito_items').delete().eq('id', itemId);
  if (error) throw error;
}

async function tlVaciarCarrito() {
  const { data: userData } = await sb.auth.getUser();
  await sb.from('carrito_items').delete().eq('usuario_id', userData.user.id);
}

// ============================================================
// PEDIDOS (RPC — pasan por las funciones de negocio en Postgres)
// ============================================================

// ============================================================
// ANCLAJE ON-CHAIN (Edge Function "escrow-onchain")
// Cada venta genera una transacción real en el contrato
// TrustLinkEscrow (Arbitrum Sepolia) con su hash único, firmada
// por la wallet operadora del backend. Es "fire-and-forget":
// si la función no está desplegada o falla, la plataforma sigue
// funcionando igual (el hash simplemente no aparece).
// ============================================================

const TL_ARBISCAN = 'https://sepolia.arbiscan.io';

function tlArbiscanTxUrl(hash) { return `${TL_ARBISCAN}/tx/${hash}`; }

async function tlAnclarOnChain(payload) {
  try {
    const { data, error } = await sb.functions.invoke('escrow-onchain', { body: payload });
    if (error) { console.warn('escrow-onchain:', error); return null; }
    if (data && data.txHash) console.info('Anclado on-chain:', payload.accion, data.txHash);
    return data;
  } catch (e) {
    console.warn('escrow-onchain no disponible:', e);
    return null;
  }
}

async function tlCrearPedido(productoId, cantidad = 1) {
  const { data, error } = await sb.rpc('crear_pedido', { p_producto_id: productoId, p_cantidad: cantidad });
  if (error) throw error;
  // Ancla la venta on-chain en segundo plano (hash único por pedido)
  tlAnclarOnChain({ accion: 'crear', pedido_id: data });
  return data; // pedido_id
}

async function tlAvanzarPedido(pedidoId, nuevoEstado) {
  const { error } = await sb.rpc('avanzar_pedido', { p_pedido_id: pedidoId, p_nuevo_estado: nuevoEstado });
  if (error) throw error;
}

async function tlConfirmarEntrega(pedidoId, codigo) {
  const { error } = await sb.rpc('confirmar_entrega', { p_pedido_id: pedidoId, p_codigo: codigo });
  if (error) throw error;
  // Libera el escrow on-chain y acuña el SBT del vendedor (en segundo plano)
  tlAnclarOnChain({ accion: 'confirmar', pedido_id: pedidoId });
}

async function tlListarMisPedidos(rol) {
  const { data: userData } = await sb.auth.getUser();
  const columna = rol === 'vendedor' ? 'vendedor_id' : 'comprador_id';
  const { data, error } = await sb.from('pedidos').select('*, productos(nombre, imagen_url)').eq(columna, userData.user.id).order('creado_en', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function tlGetPedido(pedidoId) {
  const { data, error } = await sb.from('pedidos').select('*, productos(nombre, imagen_url)').eq('id', pedidoId).single();
  if (error) { console.error(error); return null; }
  return data;
}

/**
 * Estadísticas del vendedor para la gráfica de score en credito.html:
 * ventas confirmadas y compradores distintos entre esas ventas.
 */
async function tlGetEstadisticasVendedor(vendedorId) {
  const { data, error } = await sb.from('pedidos').select('comprador_id')
    .eq('vendedor_id', vendedorId).in('estado', ['confirmado', 'liberado_admin']);
  if (error) { console.error(error); return { ventas: 0, compradoresDistintos: 0 }; }
  return { ventas: data.length, compradoresDistintos: new Set(data.map(p => p.comprador_id)).size };
}

async function tlGetEventosPedido(pedidoId) {
  const { data, error } = await sb.from('pedido_eventos').select('*').eq('pedido_id', pedidoId).order('creado_en', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

// ============================================================
// SOLICITUDES DE VENDEDOR
// ============================================================

async function tlSolicitarSerVendedor({ dni, rubro, descripcion }) {
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('solicitudes_vendedor').insert({
    usuario_id: userData.user.id, dni, rubro, descripcion,
  }).select().single();
  if (error) throw error;
  return data;
}

async function tlMiSolicitudVendedor() {
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('solicitudes_vendedor').select('*').eq('usuario_id', userData.user.id).order('creado_en', { ascending: false }).limit(1).maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
}

/**
 * Igual que con productos y créditos: el embed `perfiles(nombre, telefono)`
 * puede hacer fallar la consulta COMPLETA (nombre de FK, ambigüedad,
 * RLS del join) y el catch devolvía [] — el superadmin veía "No hay
 * solicitudes pendientes" aunque sí existieran. Se separa en dos
 * consultas independientes y se une en JS: un problema con el join
 * nunca vuelve a ocultar las solicitudes.
 */
async function tlListarSolicitudesVendedor() {
  const { data: solicitudes, error } = await sb.from('solicitudes_vendedor').select('*').order('creado_en', { ascending: false });
  if (error) { console.error('tlListarSolicitudesVendedor:', error); return []; }
  if (!solicitudes || !solicitudes.length) return [];

  const ids = [...new Set(solicitudes.map(s => s.usuario_id))];
  const { data: perfiles, error: errPerf } = await sb.from('perfiles').select('id, nombre, apellido, telefono').in('id', ids);
  if (errPerf) console.error('tlListarSolicitudesVendedor (perfiles):', errPerf);

  const porId = new Map((perfiles || []).map(p => [p.id, p]));
  return solicitudes.map(s => ({
    ...s,
    perfiles: porId.get(s.usuario_id) || { nombre: 'Usuario', telefono: null },
  }));
}

async function tlDecidirSolicitudVendedor(solicitudId, aceptar) {
  const { error } = await sb.rpc('decidir_solicitud_vendedor', { p_solicitud_id: solicitudId, p_aceptar: aceptar });
  if (error) throw error;
}

// ============================================================
// INCIDENCIAS
// ============================================================

async function tlReportarIncidencia({ pedidoId, categoria, descripcion, archivos }) {
  const { data, error } = await sb.rpc('reportar_incidencia', {
    p_pedido_id: pedidoId || null, p_categoria: categoria, p_descripcion: descripcion,
  });
  if (error) throw error;
  const incidenciaId = data;

  // Si la incidencia es sobre un pedido, marca la disputa on-chain
  // (solo afecta a ESA orden del escrow, nunca a otros pedidos)
  if (pedidoId) tlAnclarOnChain({ accion: 'disputa', pedido_id: pedidoId });

  if (archivos && archivos.length) {
    const MAX_BYTES = 20 * 1024 * 1024; // 20MB por archivo
    const { data: userData } = await sb.auth.getUser();
    for (const file of archivos) {
      if (file.size > MAX_BYTES) {
        console.warn(`Evidencia "${file.name}" supera 20MB, se omite`);
        continue;
      }
      const path = `${userData.user.id}/${incidenciaId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await sb.storage.from('incidencias').upload(path, file);
      if (!upErr) {
        await sb.from('incidencia_imagenes').insert({ incidencia_id: incidenciaId, storage_path: path });
      }
    }
  }
  return incidenciaId;
}

async function tlListarIncidencias() {
  const { data, error } = await sb.from('incidencias').select('*, perfiles!incidencias_reportado_por_fkey(nombre), pedidos(id, monto_total)').order('creado_en', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function tlGetImagenesIncidencia(incidenciaId) {
  const { data, error } = await sb.from('incidencia_imagenes').select('*').eq('incidencia_id', incidenciaId);
  if (error) { console.error(error); return []; }
  const conUrls = await Promise.all(data.map(async (img) => {
    const { data: signed } = await sb.storage.from('incidencias').createSignedUrl(img.storage_path, 3600);
    return { ...img, url: signed ? signed.signedUrl : null };
  }));
  return conUrls;
}

async function tlResolverIncidencia(incidenciaId, resolucion, favorComprador) {
  const { error } = await sb.rpc('resolver_incidencia', {
    p_incidencia_id: incidenciaId, p_resolucion: resolucion, p_favor_comprador: favorComprador,
  });
  if (error) throw error;
  // Resuelve la disputa on-chain (libera al vendedor o reembolsa al comprador)
  tlAnclarOnChain({ accion: 'resolver', incidencia_id: incidenciaId, favor_comprador: favorComprador });
}

// ============================================================
// CRÉDITO
// ============================================================

async function tlSolicitarCredito(monto, aceptoTrato) {
  const { data, error } = await sb.rpc('solicitar_credito', { p_monto: monto, p_acepto_trato: aceptoTrato });
  if (error) throw error;
  return data;
}

async function tlListarMisCreditos() {
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('solicitudes_credito').select('*').eq('vendedor_id', userData.user.id).order('creado_en', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

/**
 * solicitudes_credito tiene DOS foreign keys hacia perfiles
 * (vendedor_id y aprobado_por), así que un embed `perfiles(nombre)`
 * sin desambiguar es ambiguo para PostgREST y la consulta completa
 * fallaba con error 300 — el superadmin nunca veía créditos
 * pendientes aunque sí existieran. Se resuelve con dos consultas
 * separadas y join en JS, igual que en tlListarProductos.
 */
async function tlListarCreditosPendientes() {
  const { data: creditos, error } = await sb.from('solicitudes_credito').select('*').eq('estado', 'pendiente').order('creado_en', { ascending: true });
  if (error) { console.error('tlListarCreditosPendientes:', error); return []; }
  return await tlAdjuntarNombreVendedor(creditos);
}

async function tlListarCreditosVencidosNoPagados() {
  const { data: creditos, error } = await sb.from('solicitudes_credito').select('*')
    .eq('estado', 'aprobado').eq('pagado', false).eq('reportado_sbs', false)
    .lt('fecha_vencimiento', new Date().toISOString())
    .order('fecha_vencimiento', { ascending: true });
  if (error) { console.error('tlListarCreditosVencidosNoPagados:', error); return []; }
  return await tlAdjuntarNombreVendedor(creditos);
}

async function tlAdjuntarNombreVendedor(creditos) {
  if (!creditos || !creditos.length) return [];
  const ids = [...new Set(creditos.map(c => c.vendedor_id))];
  const { data: vendedores, error: errVend } = await sb.from('perfiles').select('id, nombre').in('id', ids);
  if (errVend) console.error('tlAdjuntarNombreVendedor:', errVend);
  const porId = new Map((vendedores || []).map(v => [v.id, v]));
  return creditos.map(c => ({ ...c, perfiles: porId.get(c.vendedor_id) || { nombre: 'Vendedor' } }));
}

async function tlDecidirCredito(solicitudId, aprobar) {
  const { error } = await sb.rpc('decidir_credito', { p_solicitud_id: solicitudId, p_aprobar: aprobar });
  if (error) throw error;
}

async function tlPagarCredito(solicitudId) {
  const { error } = await sb.rpc('pagar_credito', { p_solicitud_id: solicitudId });
  if (error) throw error;
}

// ============================================================
// NOTIFICACIONES
// ============================================================

async function tlListarNotificaciones() {
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('notificaciones').select('*').eq('usuario_id', userData.user.id).order('creado_en', { ascending: false }).limit(50);
  if (error) { console.error(error); return []; }
  return data;
}

async function tlContarNotificacionesNoLeidas() {
  const { data: userData } = await sb.auth.getUser();
  const { count, error } = await sb.from('notificaciones').select('*', { count: 'exact', head: true }).eq('usuario_id', userData.user.id).eq('leida', false);
  if (error) { console.error(error); return 0; }
  return count || 0;
}

async function tlMarcarNotificacionLeida(id) {
  await sb.from('notificaciones').update({ leida: true }).eq('id', id);
}

async function tlMarcarTodasLeidas() {
  const { data: userData } = await sb.auth.getUser();
  await sb.from('notificaciones').update({ leida: true }).eq('usuario_id', userData.user.id).eq('leida', false);
}

// ============================================================
// AUDITORÍA (solo superadmin)
// ============================================================

async function tlListarAuditoria({ desde, hasta, accion } = {}) {
  let query = sb.from('auditoria').select('*, perfiles(nombre)').order('creado_en', { ascending: false }).limit(500);
  if (desde) query = query.gte('creado_en', desde);
  if (hasta) query = query.lte('creado_en', hasta);
  if (accion) query = query.eq('accion', accion);
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data;
}

// ============================================================
// USUARIOS Y BANEO (solo superadmin)
// ============================================================

async function tlListarUsuariosAdmin() {
  const { data, error } = await sb.rpc('listar_usuarios_admin');
  if (error) { console.error(error); return []; }
  return data;
}

async function tlBanearUsuario(usuarioId, motivo) {
  const { error } = await sb.rpc('banear_usuario', { p_usuario_id: usuarioId, p_motivo: motivo });
  if (error) throw error;
}

async function tlDesbanearUsuario(usuarioId) {
  const { error } = await sb.rpc('desbanear_usuario', { p_usuario_id: usuarioId });
  if (error) throw error;
}

// ============================================================
// MEMBRESÍA TRUSTI
// ============================================================

async function tlGetMiMembresia() {
  const { data, error } = await sb.from('mi_membresia').select('*').single();
  if (error) { console.error(error); return null; }
  return data;
}

async function tlActualizarDatosMembresia({ nombre, apellido, dni }) {
  const { data: userData } = await sb.auth.getUser();
  const { error } = await sb.from('perfiles').update({ nombre, apellido, dni }).eq('id', userData.user.id);
  if (error) throw error;
}

// ============================================================
// CRÉDITO — extensiones (aplazar, reportar SBS)
// ============================================================

async function tlAplazarCredito(solicitudId) {
  const { error } = await sb.rpc('aplazar_credito', { p_solicitud_id: solicitudId });
  if (error) throw error;
}

async function tlReportarCreditoSbs(solicitudId) {
  const { error } = await sb.rpc('reportar_credito_sbs', { p_solicitud_id: solicitudId });
  if (error) throw error;
}

// ============================================================
// PRODUCTOS — eliminar
// ============================================================

async function tlEliminarProducto(productoId) {
  const { error } = await sb.rpc('eliminar_producto', { p_producto_id: productoId });
  if (error) throw error;
}
