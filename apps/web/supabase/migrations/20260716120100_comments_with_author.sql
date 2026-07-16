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
