-- =============================================================================
-- ReadHub — Migración 0006: Infraestructura vectorial (RAG)
-- =============================================================================
-- Habilita pgvector y crea la base de conocimiento vectorial para el sistema
-- RAG de la Sesión 4. No implementa lógica de negocio ni genera embeddings.
--
-- Decisiones de diseño:
--  * Tabla dedicada `article_embeddings` (1:1 con articles) en lugar de una
--    columna en `articles`: aísla la dimensión del vector, permite reindexar
--    sin tocar la tabla principal y evita ampliar el modelo de la Sesión 2.
--  * Dimensión 1536 → modelo OpenAI text-embedding-3-small.
--  * Índice HNSW con vector_cosine_ops: mejor recall/latencia que ivfflat para
--    el volumen esperado y no requiere entrenamiento previo. Los embeddings de
--    OpenAI vienen normalizados, por lo que la distancia coseno es la adecuada.
--  * `content`: guarda el texto que se vectorizó, para que el Context Builder
--    lo reutilice sin volver a descargar el documento.
-- No modifica migraciones, políticas ni seed anteriores.
-- =============================================================================

-- 1) Extensión pgvector -------------------------------------------------------
create extension if not exists vector;

-- 2) Tabla de embeddings ------------------------------------------------------
create table if not exists public.article_embeddings (
  article_id uuid primary key references public.articles (id) on delete cascade,
  embedding  vector(1536) not null,
  content    text not null,
  updated_at timestamptz not null default now()
);

comment on table public.article_embeddings is
  'Representación vectorial de cada artículo para búsqueda semántica (RAG). 1:1 con articles.';

-- 3) Índice de similitud (HNSW, distancia coseno) -----------------------------
create index if not exists idx_article_embeddings_hnsw
  on public.article_embeddings
  using hnsw (embedding vector_cosine_ops);

-- 4) RLS: la tabla es interna. Sin políticas para anon/authenticated (acceso
--    denegado por defecto). La escritura la hace el servidor con service_role
--    (que omite RLS) y la lectura se expone solo vía la función SECURITY
--    DEFINER `match_articles`.
alter table public.article_embeddings enable row level security;

-- 5) Función de búsqueda por similitud ---------------------------------------
-- Recibe el embedding de la consulta y devuelve los artículos PÚBLICOS más
-- relevantes ordenados por similitud (1 - distancia coseno). Reutilizable por
-- los Services del sistema RAG. SECURITY DEFINER para leer los embeddings y
-- unir con articles/profiles respetando la visibilidad (solo públicos).
create or replace function public.match_articles(
  query_embedding      vector(1536),
  match_count          int   default 5,
  similarity_threshold float default 0.0
)
returns table (
  article_id  uuid,
  title       text,
  summary     text,
  content     text,
  author_name text,
  similarity  float
)
language sql
security definer
-- Incluye public y extensions para resolver el tipo y el operador `<=>` de pgvector.
set search_path = public, extensions
stable
as $$
  select
    a.id           as article_id,
    a.title,
    a.summary,
    e.content,
    p.full_name    as author_name,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.article_embeddings e
  join public.articles a on a.id = e.article_id
  join public.profiles p on p.id = a.author_id
  where a.is_public = true
    and 1 - (e.embedding <=> query_embedding) >= similarity_threshold
  order by e.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

comment on function public.match_articles(vector, int, float) is
  'Búsqueda semántica: devuelve los artículos públicos más similares al embedding de la consulta.';

grant execute on function public.match_articles(vector, int, float) to authenticated;
