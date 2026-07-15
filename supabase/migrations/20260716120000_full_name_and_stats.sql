-- =============================================================================
-- ReadHub — Migración 0004: full_name + funciones de feed con estadísticas
-- =============================================================================
-- Añadidos necesarios para el MVP (Sesión 3) SIN abrir las tablas protegidas:
--
--  1. `profiles.full_name`: nombre visible del autor (se captura en el registro).
--  2. Se actualiza `handle_new_user()` para guardar también `full_name`.
--  3. Funciones SECURITY DEFINER que devuelven el listado y el detalle de
--     artículos junto con sus conteos (views/likes/comments) y el nombre del
--     autor. Esto permite mostrar el nº de visualizaciones y el autor en la UI
--     respetando la RLS: `views` sigue siendo privada (solo autor/admin) y
--     `profiles` sigue sin exponer email/teléfono/fecha de nacimiento; solo se
--     publica el nombre y los conteos agregados.
--
-- No modifica migraciones, políticas ni seed anteriores.
-- =============================================================================

-- 1) Columna full_name -------------------------------------------------------
alter table public.profiles add column if not exists full_name text;

comment on column public.profiles.full_name is
  'Nombre visible del usuario (autor). Se captura en el registro.';

-- 2) Actualizar el trigger de creación de perfil -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, birth_date, phone, role, full_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'reader'),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Nombres para los usuarios del seed (no toca seed.sql) -----------------------
update public.profiles set full_name = 'Alice Autora'
  where id = '11111111-1111-1111-1111-111111111111' and full_name is null;
update public.profiles set full_name = 'Bob Escritor'
  where id = '22222222-2222-2222-2222-222222222222' and full_name is null;
update public.profiles set full_name = 'Admin ReadHub'
  where id = '33333333-3333-3333-3333-333333333333' and full_name is null;

-- 3) Función: listado (feed) de artículos con estadísticas --------------------
-- Aplica la MISMA visibilidad que la RLS de articles (públicos, propios o admin)
-- porque SECURITY DEFINER omite la RLS y debemos replicar el filtro.
create or replace function public.get_articles_feed()
returns table (
  id             uuid,
  title          text,
  summary        text,
  image_path     text,
  document_path  text,
  author_id      uuid,
  author_name    text,
  is_public      boolean,
  created_at     timestamptz,
  views_count    bigint,
  likes_count    bigint,
  comments_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    a.id, a.title, a.summary, a.image_path, a.document_path,
    a.author_id, p.full_name as author_name, a.is_public, a.created_at,
    (select count(*) from public.views    v where v.article_id = a.id) as views_count,
    (select count(*) from public.likes    l where l.article_id = a.id) as likes_count,
    (select count(*) from public.comments c where c.article_id = a.id) as comments_count
  from public.articles a
  join public.profiles p on p.id = a.author_id
  where a.is_public = true
     or a.author_id = (select auth.uid())
     or public.is_admin()
  order by a.created_at desc;
$$;

comment on function public.get_articles_feed() is
  'Listado de artículos visibles + autor + conteos (views/likes/comments). SECURITY DEFINER.';

-- 4) Función: detalle de un artículo con estadísticas ------------------------
create or replace function public.get_article_detail(p_article_id uuid)
returns table (
  id             uuid,
  title          text,
  summary        text,
  image_path     text,
  document_path  text,
  author_id      uuid,
  author_name    text,
  is_public      boolean,
  created_at     timestamptz,
  views_count    bigint,
  likes_count    bigint,
  comments_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    a.id, a.title, a.summary, a.image_path, a.document_path,
    a.author_id, p.full_name as author_name, a.is_public, a.created_at,
    (select count(*) from public.views    v where v.article_id = a.id) as views_count,
    (select count(*) from public.likes    l where l.article_id = a.id) as likes_count,
    (select count(*) from public.comments c where c.article_id = a.id) as comments_count
  from public.articles a
  join public.profiles p on p.id = a.author_id
  where a.id = p_article_id
    and (
      a.is_public = true
      or a.author_id = (select auth.uid())
      or public.is_admin()
    );
$$;

comment on function public.get_article_detail(uuid) is
  'Detalle de un artículo visible + autor + conteos. SECURITY DEFINER.';

-- 5) Permisos de ejecución ---------------------------------------------------
grant execute on function public.get_articles_feed() to anon, authenticated;
grant execute on function public.get_article_detail(uuid) to anon, authenticated;
