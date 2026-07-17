-- =============================================================================
-- ReadHub — policies.sql (referencia consolidada de seguridad)
-- =============================================================================
-- Copia consolidada de las políticas RLS (tablas) y de Storage.
-- La FUENTE CANÓNICA son las migraciones en supabase/migrations/.
-- Generado a partir de:
--   20260715120100_rls_policies.sql
--   20260715120200_storage.sql
-- =============================================================================

-- =============================================================================
-- ReadHub — Migración 0002: Row Level Security (RLS)
-- =============================================================================
-- Activa RLS en todas las tablas y define las políticas de acceso según la
-- especificación de la Sesión 2.
--
-- Notas de implementación:
--  * Se usa `(select auth.uid())` en lugar de `auth.uid()` para que el
--    planificador evalúe la función una sola vez (mejor rendimiento).
--  * El rol `public` de Postgres agrupa a `anon` (no autenticado) y
--    `authenticated`. Cuando una política aplica solo a usuarios con sesión se
--    declara explícitamente `to authenticated`.
--  * `public.is_admin()` (definida en la migración 0001) resuelve el caso admin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Activar RLS
-- -----------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.articles  enable row level security;
alter table public.views     enable row level security;
alter table public.likes     enable row level security;
alter table public.comments  enable row level security;
alter table public.favorites enable row level security;

-- =============================================================================
-- PROFILES — cada usuario solo ve y modifica su propio perfil (admin ve todo)
-- =============================================================================
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- =============================================================================
-- ARTICLES
-- =============================================================================
-- SELECT: todos (incl. anónimos) leen artículos públicos; el autor y el admin
-- ven también los suyos no públicos.
drop policy if exists "articles_select_public_or_owner" on public.articles;
create policy "articles_select_public_or_owner"
  on public.articles for select
  using (
    is_public
    or author_id = (select auth.uid())
    or public.is_admin()
  );

-- INSERT: solo usuarios autenticados, y solo como autores de sí mismos.
drop policy if exists "articles_insert_authenticated" on public.articles;
create policy "articles_insert_authenticated"
  on public.articles for insert
  to authenticated
  with check (author_id = (select auth.uid()));

-- UPDATE: solo el autor (o admin).
drop policy if exists "articles_update_owner" on public.articles;
create policy "articles_update_owner"
  on public.articles for update
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check (author_id = (select auth.uid()) or public.is_admin());

-- DELETE: solo el autor (o admin).
drop policy if exists "articles_delete_owner" on public.articles;
create policy "articles_delete_owner"
  on public.articles for delete
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

-- =============================================================================
-- COMMENTS
-- =============================================================================
-- SELECT: leer todos.
drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all"
  on public.comments for select
  using (true);

-- INSERT: autenticado, escribiendo como sí mismo.
drop policy if exists "comments_insert_authenticated" on public.comments;
create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- UPDATE: solo el autor del comentario.
drop policy if exists "comments_update_owner" on public.comments;
create policy "comments_update_owner"
  on public.comments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE: el autor del comentario o un admin.
drop policy if exists "comments_delete_owner_or_admin" on public.comments;
create policy "comments_delete_owner_or_admin"
  on public.comments for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- =============================================================================
-- LIKES
-- =============================================================================
-- SELECT: público (permite contar likes y saber si el usuario ya reaccionó).
drop policy if exists "likes_select_all" on public.likes;
create policy "likes_select_all"
  on public.likes for select
  using (true);

-- INSERT: autenticado, como sí mismo. La restricción UNIQUE evita duplicados.
drop policy if exists "likes_insert_authenticated" on public.likes;
create policy "likes_insert_authenticated"
  on public.likes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- DELETE: solo el propietario (permite retirar el like en fases posteriores).
drop policy if exists "likes_delete_owner" on public.likes;
create policy "likes_delete_owner"
  on public.likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- =============================================================================
-- VIEWS
-- =============================================================================
-- INSERT: usuarios autenticados, registrando la visualización como sí mismos.
drop policy if exists "views_insert_authenticated" on public.views;
create policy "views_insert_authenticated"
  on public.views for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- SELECT: solo administradores o el autor del artículo (objetivo del curso).
-- Nota: el conteo público de vistas para las tarjetas se resolverá en una fase
-- posterior mediante una función SECURITY DEFINER / RPC que exponga solo el
-- agregado, sin abrir el detalle de la tabla.
drop policy if exists "views_select_admin_or_article_owner" on public.views;
create policy "views_select_admin_or_article_owner"
  on public.views for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.articles a
      where a.id = views.article_id
        and a.author_id = (select auth.uid())
    )
  );

-- =============================================================================
-- FAVORITES — privados: solo el propietario
-- =============================================================================
drop policy if exists "favorites_select_owner" on public.favorites;
create policy "favorites_select_owner"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "favorites_insert_owner" on public.favorites;
create policy "favorites_insert_owner"
  on public.favorites for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "favorites_delete_owner" on public.favorites;
create policy "favorites_delete_owner"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- =============================================================================
-- ReadHub — Migración 0003: Supabase Storage
-- =============================================================================
-- Crea los buckets para los archivos de los artículos y sus políticas de
-- acceso sobre storage.objects.
--
-- Convención de rutas:  <user_id>/<nombre-archivo>
-- Así, la primera carpeta de la ruta identifica al propietario y permite
-- validar la pertenencia con (storage.foldername(name))[1] = auth.uid().
--
--  * article-covers    → imágenes de portada. Bucket PÚBLICO (lectura abierta).
--  * article-documents → documentos TXT/DOCX/PDF. Bucket PRIVADO.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'article-covers',
    'article-covers',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'article-documents',
    'article-documents',
    false,
    10485760, -- 10 MB
    array[
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
on conflict (id) do nothing;

-- =============================================================================
-- Políticas: article-covers (público en lectura, escritura del propietario)
-- =============================================================================
drop policy if exists "covers_select_public" on storage.objects;
create policy "covers_select_public"
  on storage.objects for select
  using (bucket_id = 'article-covers');

drop policy if exists "covers_insert_owner" on storage.objects;
create policy "covers_insert_owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "covers_update_owner" on storage.objects;
create policy "covers_update_owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "covers_delete_owner" on storage.objects;
create policy "covers_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- =============================================================================
-- Políticas: article-documents (lectura autenticada, escritura del propietario)
-- =============================================================================
-- En el MVP todo artículo publicado es visible para usuarios autenticados
-- (BR-012), por lo que cualquier usuario con sesión puede leer los documentos.
drop policy if exists "documents_select_authenticated" on storage.objects;
create policy "documents_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'article-documents');

drop policy if exists "documents_insert_owner" on storage.objects;
create policy "documents_insert_owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_update_owner" on storage.objects;
create policy "documents_update_owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_delete_owner" on storage.objects;
create policy "documents_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- =============================================================================
-- Privilegios base de tabla (además de la RLS). Ver migración
-- 20260717120200_grants.sql para el detalle y el porqué. La RLS sigue siendo la
-- capa de seguridad real; estos GRANT solo dan el permiso a nivel de tabla que
-- PostgreSQL exige por debajo (Supabase Cloud los aplica por defecto; un stack
-- nuevo —local/CI— no).
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
