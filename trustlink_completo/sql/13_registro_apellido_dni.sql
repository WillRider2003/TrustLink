-- ============================================================
-- TRUSTLINK — MIGRACIÓN 13: APELLIDO Y DNI DESDE EL REGISTRO
-- ============================================================
-- Ejecutar en Supabase → SQL Editor, después de 01-12.
--
-- Antes, apellido y dni de perfiles solo se podían llenar desde un
-- formulario aparte en membresia.html (que el usuario pidió quitar).
-- Ahora se capturan directamente en el registro (login.html →
-- "Crear cuenta"), igual que nombre y teléfono, para que la tarjeta
-- de membresía siempre tenga esos datos sin un paso extra.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, apellido, dni, telefono, rol, credito_disponible, credito_limite)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario TrustLink'),
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'dni',
    new.raw_user_meta_data->>'telefono',
    'comprador',
    230.00,
    230.00
  );
  return new;
end;
$$;
