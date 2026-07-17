-- =============================================================================
-- ReadHub — Privilegios base para los roles de Supabase (anon / authenticated)
-- =============================================================================
-- PostgreSQL exige, ADEMÁS de las políticas RLS, un GRANT a nivel de tabla para
-- que un rol pueda tocarla. La RLS (activa en todas las tablas) sigue siendo la
-- capa de seguridad real —restringe QUÉ filas ve/modifica cada usuario—; estos
-- GRANT solo conceden el permiso de tabla que PostgreSQL pide por debajo.
--
-- Por qué es necesario declararlos: en Supabase Cloud estos privilegios se
-- aplican por defecto, pero un stack NUEVO (Supabase local del CI, o cualquier
-- despliegue limpio) no los trae. Sin ellos, el acceso directo del cliente a las
-- tablas (p. ej. leer el propio perfil) falla con "permission denied for table"
-- aunque la política RLS permita la fila. Declararlos aquí hace la BD portable.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Tablas y secuencias existentes.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- Objetos que se creen a futuro en el esquema public.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
