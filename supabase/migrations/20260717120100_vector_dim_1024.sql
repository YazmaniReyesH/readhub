-- =============================================================================
-- ReadHub — Migración 0007: dimensión vectorial 1024 (Voyage AI)
-- =============================================================================
-- El proveedor de embeddings es Voyage AI (voyage-3.5, 1024 dimensiones) en
-- lugar de OpenAI (1536). Se ajusta la infraestructura vectorial a 1024.
-- La tabla no contenía embeddings todavía, por lo que el cambio es seguro.
-- =============================================================================

-- 1) Eliminar la función que referencia vector(1536).
drop function if exists public.match_articles(vector, int, float);

-- 2) Reajustar la columna y el índice a 1024 dimensiones.
drop index if exists public.idx_article_embeddings_hnsw;
alter table public.article_embeddings
  alter column embedding type vector(1024);
create index if not exists idx_article_embeddings_hnsw
  on public.article_embeddings
  using hnsw (embedding vector_cosine_ops);

-- 3) Recrear la función de búsqueda con la nueva dimensión.
create or replace function public.match_articles(
  query_embedding      vector(1024),
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
  'Búsqueda semántica (1024 dim / Voyage): artículos públicos más similares a la consulta.';

grant execute on function public.match_articles(vector, int, float) to authenticated;
