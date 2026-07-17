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
