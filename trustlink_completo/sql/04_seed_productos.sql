-- ============================================================
-- TRUSTLINK — DATOS SEMILLA (productos de ejemplo)
-- ============================================================
-- IMPORTANTE: este script se corre DESPUÉS de crear al menos una
-- cuenta de vendedor real (regístrate en tu propio sitio, pide que
-- el superadmin te apruebe como vendedor, o promuévete a ti mismo
-- con el UPDATE de ejemplo más abajo).
--
-- Reemplaza 'TU_UUID_DE_VENDEDOR_AQUI' por el id real de un usuario
-- con rol 'vendedor' antes de correr este script. Lo encuentras en
-- Supabase → Authentication → Users, o con:
--   select id, nombre, rol from public.perfiles where rol = 'vendedor';
-- ============================================================

-- Ejemplo: promover manualmente a un usuario existente a vendedor
-- (útil para el primer producto de prueba, antes de tener el flujo
-- de solicitud funcionando de punta a punta):
--
-- update public.perfiles set rol = 'vendedor' where id = 'TU_UUID_DE_VENDEDOR_AQUI';

do $$
declare
  v_vendedor uuid;
begin
  select id into v_vendedor from public.perfiles where rol = 'vendedor' order by creado_en asc limit 1;

  if v_vendedor is null then
    raise notice 'No hay ningún vendedor todavía. Crea una cuenta, promuévela a vendedor, y vuelve a correr este script.';
  else
    insert into public.productos (vendedor_id, nombre, descripcion, precio, categoria, imagen_url, stock) values
      (v_vendedor, 'Taladro percutor Bosch 1/2"', 'Taladro percutor profesional, incluye maletín y brocas básicas.', 180.00, 'Herramientas y ferretería', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Taladro', 5),
      (v_vendedor, 'Set de llaves mixtas (12 pzs)', 'Juego de llaves combinadas cromo-vanadio, 8mm a 19mm.', 95.00, 'Herramientas y ferretería', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Llaves', 8),
      (v_vendedor, 'Cargador portátil 20000mAh', 'Power bank de carga rápida, 2 puertos USB + USB-C.', 65.00, 'Electrónica', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Cargador', 12),
      (v_vendedor, 'Casco de seguridad industrial', 'Casco certificado con ajuste giratorio, color blanco.', 32.00, 'Seguridad industrial', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Casco', 15),
      (v_vendedor, 'Guantes de trabajo reforzados', 'Guantes anticorte con palma reforzada, talla única.', 22.00, 'Seguridad industrial', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Guantes', 20),
      (v_vendedor, 'Martillo de carpintero', 'Martillo con mango de fibra de vidrio, cabeza 16oz.', 45.00, 'Herramientas y ferretería', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Martillo', 10),
      (v_vendedor, 'Extensión eléctrica 10m', 'Cable extensión heavy duty 12AWG, 3 tomas.', 38.00, 'Herramientas y ferretería', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Extension', 7),
      (v_vendedor, 'Casaca de trabajo', 'Casaca resistente al agua, forro polar, varias tallas.', 50.00, 'Ropa y accesorios', 'https://placehold.co/400x400/2563eb/FFFFFF?text=Casaca', 9);

    raise notice 'Productos de ejemplo creados para el vendedor %', v_vendedor;
  end if;
end $$;
