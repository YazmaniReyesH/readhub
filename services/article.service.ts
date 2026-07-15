import { createClient } from "@/lib/supabase/client";
import type { ArticleWithStats } from "@/types/database";

/**
 * Capa de acceso a los artículos y sus interacciones (vistas y likes).
 * El listado y el detalle usan funciones RPC (SECURITY DEFINER) que devuelven
 * los conteos y el nombre del autor respetando la RLS.
 */

/** Listado de artículos visibles con autor y conteos. */
export async function getArticlesFeed(): Promise<ArticleWithStats[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_articles_feed");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Detalle de un artículo (o null si no existe / no es visible). */
export async function getArticleById(
  id: string,
): Promise<ArticleWithStats | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_article_detail", {
    p_article_id: id,
  });
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? data[0] : null;
}

export interface CreateArticleInput {
  authorId: string;
  title: string;
  summary: string | null;
  documentPath: string;
  imagePath: string;
}

/** Inserta un artículo y devuelve su id. */
export async function createArticle(
  input: CreateArticleInput,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("articles")
    .insert({
      author_id: input.authorId,
      title: input.title,
      summary: input.summary,
      document_path: input.documentPath,
      image_path: input.imagePath,
      is_public: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Registra una visualización del artículo (BR-011). */
export async function registerView(
  articleId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("views")
    .insert({ article_id: articleId, user_id: userId });
  if (error) throw new Error(error.message);
}

export interface LikeState {
  count: number;
  likedByUser: boolean;
}

/** Devuelve el nº de likes de un artículo y si el usuario ya reaccionó. */
export async function getLikeState(
  articleId: string,
  userId: string | null,
): Promise<LikeState> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("article_id", articleId);
  if (error) throw new Error(error.message);

  let likedByUser = false;
  if (userId) {
    const { data, error: ownErr } = await supabase
      .from("likes")
      .select("id")
      .eq("article_id", articleId)
      .eq("user_id", userId)
      .maybeSingle();
    if (ownErr) throw new Error(ownErr.message);
    likedByUser = Boolean(data);
  }
  return { count: count ?? 0, likedByUser };
}

/** Registra un like (BR-013: uno por usuario y artículo). */
export async function addLike(
  articleId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("likes")
    .insert({ article_id: articleId, user_id: userId });
  // Ignora el duplicado (violación de UNIQUE) para ser idempotente.
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

/** Retira el like del usuario. */
export async function removeLike(
  articleId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("article_id", articleId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
