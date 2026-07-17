-- =============================================================================
-- ReadHub — schema.sql (referencia consolidada del esquema)
-- =============================================================================
-- Copia consolidada del esquema para revisión rápida en un solo archivo.
-- La FUENTE CANÓNICA son las migraciones en supabase/migrations/.
-- Generado a partir de:
--   20260715120000_initial_schema.sql
--   20260716120000_full_name_and_stats.sql
--   20260716120100_comments_with_author.sql
-- =============================================================================

-- =============================================================================
-- ReadHub — Migración 0001: Esquema inicial
-- =============================================================================
-- Crea el modelo relacional completo del proyecto en el esquema `public`:
-- tablas, claves primarias y foráneas, restricciones, índices, funciones y
-- triggers. NO define las políticas RLS (ver migración 0002).
--
-- Modelo (según PRD / Sesión 2):
--   profiles (1:1 con auth.users) 1──N articles 1──N { views, likes,
--   comments, favorites }
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensiones
-- -----------------------------------------------------------------------------
-- pgcrypto: gen_random_uuid() para claves primarias y crypt() para el seed.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tabla: profiles
-- -----------------------------------------------------------------------------
-- Relación 1:1 con auth.users usando el mismo UUID como PK y FK.
-- El email y la contraseña los gestiona Supabase Auth en auth.users; aquí solo
-- se guardan los datos de perfil adicionales.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  birth_date date,
  phone      text,
  role       text not null default 'reader'
             check (role in ('reader', 'writer', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de usuario. Relación 1:1 con auth.users mediante el UUID compartido.';

-- -----------------------------------------------------------------------------
-- Tabla: articles
-- -----------------------------------------------------------------------------
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) > 0),
  summary       text,
  document_path text,
  image_path    text,
  is_public     boolean not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.articles is 'Artículos publicados por los usuarios.';
comment on column public.articles.is_public is
  'Visibilidad del artículo. Por defecto TRUE (el MVP no maneja privados; BR-012).';

-- -----------------------------------------------------------------------------
-- Tabla: views (una fila por cada apertura de artículo; BR-011)
-- -----------------------------------------------------------------------------
create table if not exists public.views (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  viewed_at  timestamptz not null default now()
);

comment on table public.views is
  'Registro de visualizaciones. No es un contador: cada apertura es una fila (BR-011).';

-- -----------------------------------------------------------------------------
-- Tabla: likes (un único like por usuario y artículo; BR-013)
-- -----------------------------------------------------------------------------
create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_article_user_unique unique (article_id, user_id)
);

comment on table public.likes is 'Me gusta. Restricción UNIQUE(article_id, user_id) (BR-013).';

-- -----------------------------------------------------------------------------
-- Tabla: comments (no se permiten comentarios vacíos; BR-017)
-- -----------------------------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  comment    text not null check (char_length(btrim(comment)) > 0),
  created_at timestamptz not null default now()
);

comment on table public.comments is 'Comentarios sobre artículos. No se permiten vacíos (BR-017).';

-- -----------------------------------------------------------------------------
-- Tabla: favorites (preparada para fases posteriores)
-- -----------------------------------------------------------------------------
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_article_user_unique unique (article_id, user_id)
);

comment on table public.favorites is 'Artículos guardados por un usuario.';

-- -----------------------------------------------------------------------------
-- Índices recomendados (mejoran las consultas y el rendimiento de las RLS)
-- -----------------------------------------------------------------------------
create index if not exists idx_articles_author_id  on public.articles  (author_id);
create index if not exists idx_articles_created_at  on public.articles  (created_at desc);
create index if not exists idx_views_article_id     on public.views     (article_id);
create index if not exists idx_views_user_id        on public.views     (user_id);
create index if not exists idx_likes_article_id     on public.likes     (article_id);
create index if not exists idx_likes_user_id        on public.likes     (user_id);
create index if not exists idx_comments_article_id  on public.comments  (article_id);
create index if not exists idx_comments_user_id     on public.comments  (user_id);
create index if not exists idx_favorites_article_id on public.favorites (article_id);
create index if not exists idx_favorites_user_id    on public.favorites (user_id);

-- -----------------------------------------------------------------------------
-- Función: is_admin() — helper reutilizable para las políticas RLS
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER + search_path vacío para poder consultar profiles sin
-- disparar recursión de RLS y evitar secuestro de search_path.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'Devuelve TRUE si el usuario autenticado tiene rol admin. Usada por las políticas RLS.';

-- -----------------------------------------------------------------------------
-- Función + trigger: crea automáticamente el perfil al registrar un usuario
-- -----------------------------------------------------------------------------
-- Cuando Supabase Auth inserta una fila en auth.users, se crea su profile
-- leyendo los datos adicionales desde raw_user_meta_data (enviados en el signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, birth_date, phone, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'reader')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crea la fila en public.profiles cuando se registra un usuario en auth.users.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


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


-- =============================================================================
-- ReadHub — Migración 0005: comentarios con nombre de autor
-- =============================================================================
-- La vista de detalle muestra los comentarios con el nombre de quien los
-- escribió (BR-015). Como `profiles` es privado (cada quien ve solo el suyo),
-- se expone el nombre del autor de cada comentario mediante una función
-- SECURITY DEFINER que devuelve únicamente el comentario y el nombre (sin
-- email/teléfono/fecha de nacimiento).
-- =============================================================================

create or replace function public.get_article_comments(p_article_id uuid)
returns table (
  id          uuid,
  article_id  uuid,
  user_id     uuid,
  comment     text,
  created_at  timestamptz,
  author_name text
)
language sql
security definer
set search_path = ''
stable
as $$
  select c.id, c.article_id, c.user_id, c.comment, c.created_at,
         p.full_name as author_name
  from public.comments c
  join public.profiles p on p.id = c.user_id
  where c.article_id = p_article_id
  order by c.created_at asc;
$$;

comment on function public.get_article_comments(uuid) is
  'Comentarios de un artículo + nombre del autor. SECURITY DEFINER (profiles es privado).';

grant execute on function public.get_article_comments(uuid) to anon, authenticated;
