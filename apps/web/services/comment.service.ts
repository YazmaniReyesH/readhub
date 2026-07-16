import { createClient } from "@/lib/supabase/client";
import type { CommentWithAuthor } from "@readhub/types";

/** Capa de acceso a los comentarios. */

/** Lista los comentarios de un artículo con el nombre del autor. */
export async function getArticleComments(
  articleId: string,
): Promise<CommentWithAuthor[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_article_comments", {
    p_article_id: articleId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Crea un comentario (BR-015 autor identificado, BR-017 no vacío). */
export async function createComment(
  articleId: string,
  userId: string,
  comment: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("comments").insert({
    article_id: articleId,
    user_id: userId,
    comment: comment.trim(),
  });
  if (error) throw new Error(error.message);
}
